import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job';
import User from '../models/User';
import Settings from '../models/Settings';
import TravelLog from '../models/TravelLog';
import { uploadToCloudinary } from '../config/cloudinary';
import { sendWhatsAppAlert } from '../utils/whatsapp';
import { sendMail } from '../config/mailer';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';
import { sendPushNotification, sendPushToAdmins } from '../utils/push';
import { logAudit } from '../utils/auditLog';

const parseTimeToMinutes = (timeStr: string): number => {
  const cleanStr = timeStr.trim().toUpperCase();
  const match = cleanStr.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

const parseSlotToMinutes = (slotStr: string) => {
  const parts = slotStr.split('-');
  if (parts.length < 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  return { start, end };
};

const slotsOverlap = (slotA: string, slotB: string): boolean => {
  const rangeA = parseSlotToMinutes(slotA);
  const rangeB = parseSlotToMinutes(slotB);
  if (!rangeA || !rangeB) return false;
  // Strictly overlap check: A starts before B ends, and A ends after B starts
  return (rangeA.start < rangeB.end) && (rangeA.end > rangeB.start);
};

// Calculate distance between two GPS coordinates in KM (Haversine formula)
const calculateDistanceKM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 100) / 100; // round to 2 decimals
};

export const shouldDelayNotification = (jobDateStr: string): boolean => {
  if (!jobDateStr) return false;
  
  const utcTime = new Date().getTime();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(utcTime + istOffset);
  
  const [year, month, day] = jobDateStr.split('-').map(Number);
  const threshold = new Date(Date.UTC(year, month - 1, day - 1, 19, 0, 0));
  
  return istNow.getTime() < threshold.getTime();
};

export const sendJobNotification = async (job: any) => {
  try {
    if (!job.workerId) return;
    const worker = await User.findById(job.workerId);
    if (!worker) return;

    const companyLabel = `${job.company} Services`;
    const visitCode = `Visit #${job.visitId}`;
    const scheduledTime = `${job.date || 'Today'} • ${job.timeSlot || 'ASAP'}`;

    sendPushNotification(
      job.workerId.toString(),
      '🔔 New Visit Assigned',
      `${companyLabel}\n${visitCode}\n${job.title}\nCustomer: ${job.clientName}\nCustomer Address: ${job.address || 'N/A'}\nVisit Date & Time: ${scheduledTime}`,
      `/worker/jobs?startJobId=${job._id}`
    );

    const io = getIO();
    if (io) {
      io.to(job.workerId.toString()).emit('notification', {
        type: 'NEW_JOB',
        message: `New job "${job.title}" assigned to you for ${job.company}.`,
        jobTitle: job.title,
        company: job.company,
        jobId: job._id,
        job: job
      });
    }

    const emailHtml = `
      <h3>New Job Assigned - ${job.company}</h3>
      <p>Hello ${worker.name},</p>
      <p>A new cleaning job has been assigned to you:</p>
      <ul>
        <li><strong>Title:</strong> ${job.title}</li>
        <li><strong>Client:</strong> ${job.clientName}</li>
        <li><strong>Address:</strong> ${job.address}</li>
        <li><strong>Company:</strong> ${job.company}</li>
      </ul>
      <p>Please log in to your ShineStaff app to view directions and start the job.</p>
    `;
    await sendMail(worker.email, 'New Job Assigned - ShineStaff', emailHtml);

    job.notificationSentAt = new Date();
    await job.save();
    console.log(`[BACKGROUND SCHEDULED] Notification sent for job ${job._id} to worker ${worker.name}`);
  } catch (error) {
    console.error(`Error sending delayed job notification for ${job._id}:`, error);
  }
};

export const getJobs = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { status, company, workerId, date } = req.query;
    const filter: any = {};

    // Worker only gets their own jobs
    if (req.user.role === 'worker') {
      filter.workerId = req.user.id;
      filter.notificationSentAt = { $exists: true, $ne: null };
    } else if (workerId) {
      filter.workerId = workerId;
    }

    if (status) {
      filter.status = status;
    }
    if (company && company !== 'All') {
      filter.company = company;
    }
    if (date) {
      filter.date = date;
    }

    const jobs = await Job.find(filter)
      .populate('workerId', 'name email phone photo')
      .sort({ createdAt: -1 });

    res.status(200).json(jobs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getJobById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id).populate('workerId', 'name email phone photo');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (req.user && req.user.role === 'worker') {
      if (String(job.workerId?._id || job.workerId) !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (!job.notificationSentAt) {
        return res.status(403).json({ message: 'Tomorrow\'s work is not accessible before 7:00 PM today.' });
      }
    }
    res.status(200).json(job);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createJob = async (req: AuthRequest, res: Response) => {
  const {
    title,
    description,
    company,
    workerId,
    clientName,
    clientPhone,
    address,
    locationName,
    price,
    date,
    timeSlot,
    location,
    fuelKmsTravelled,
    fuelAllowance,
    fromLocation,
    toLocation,

    alternatePhone,
    clientEmail,
    serviceCategory,
    estimatedDuration,
    priority,
    landmark,
    city,
    state,
    pincode,
    notes,
    specialInstructions,
    attachments
  } = req.body;

  try {
    if (price !== undefined && Number(price) < 0) {
      return res.status(400).json({ message: 'Price cannot be negative' });
    }

    let worker = null;
    if (workerId && workerId !== 'unassigned') {
      worker = await User.findById(workerId);
      if (!worker || worker.role !== 'worker') {
        return res.status(404).json({ message: 'Assigned worker not found' });
      }

      // Check for overlapping slots on the same date to prevent double booking
      if (date && timeSlot) {
        const overlappingJobs = await Job.find({
          workerId: worker._id,
          date,
          status: { $ne: 'cancelled' }
        });
        
        for (const job of overlappingJobs) {
          if (job.timeSlot && slotsOverlap(job.timeSlot, timeSlot)) {
            return res.status(400).json({
              message: `Double Booking Alert! ${worker.name} is already assigned to a conflicting job: "${job.title}" (${job.timeSlot}) on this day.`
            });
          }
        }
      }
    }

    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
      await settings.save();
    }
    const fuelRate = settings.fuelAllowanceRate || 4;
    const kms = Number(fuelKmsTravelled) || 0;
    const calculatedFuelAllowance = fuelAllowance !== undefined ? Number(fuelAllowance) : (kms * fuelRate);

    // Generate unique Visit ID automatically
    const rand = Math.floor(1000 + Math.random() * 9000);
    const prefix = company === 'SofaShine' ? 'SS' : 'CC';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const generatedVisitId = `${prefix}${dateStr}-${rand}`;

    // Upload attachments to Cloudinary if provided
    let uploadedAttachments: string[] = [];
    if (attachments && attachments.length > 0) {
      try {
        uploadedAttachments = await Promise.all(
          attachments.map((dataUrl: string) => uploadToCloudinary(dataUrl, 'visit_attachments'))
        );
      } catch (uploadErr) {
        console.error('Failed to upload visit attachments to Cloudinary:', uploadErr);
      }
    }

    const job = new Job({
      title,
      description,
      company,
      workerId: worker && worker._id ? worker._id : undefined,
      clientName,
      clientPhone,
      address,
      locationName,
      price: Number(price) || 0,
      date,
      timeSlot,
      location,
      fuelKmsTravelled: kms,
      fuelAllowance: calculatedFuelAllowance,
      fromLocation: fromLocation || '',
      toLocation: toLocation || '',
      status: 'pending',
      notificationSentAt: shouldDelayNotification(date || '') ? undefined : new Date(),

      visitId: generatedVisitId,
      alternatePhone: alternatePhone || '',
      clientEmail: clientEmail || '',
      serviceCategory: serviceCategory || '',
      estimatedDuration: estimatedDuration || '',
      priority: priority || 'medium',
      landmark: landmark || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      notes: notes || '',
      specialInstructions: specialInstructions || '',
      createdBy: req.user ? req.user.id : undefined,
      attachments: uploadedAttachments,
      timeline: [{
        status: 'pending',
        timestamp: new Date(),
        remarks: worker ? `Job created and assigned to ${worker.name}` : 'Job created (unassigned)',
        updatedBy: req.user ? 'Admin' : 'System'
      }]
    });

    await job.save();

    const companyLabel = `${company} Services`;
    const visitCode = `Visit #${generatedVisitId}`;
    const scheduledTime = `${date || 'Today'} • ${timeSlot || 'ASAP'}`;

    if (worker) {
      const delay = shouldDelayNotification(date || '');
      if (!delay) {
        // Send detailed push notification to worker matching visit specification layout
        sendPushNotification(
          workerId.toString(),
          '🔔 New Visit Assigned',
          `${companyLabel}\n${visitCode}\n${title}\nCustomer: ${clientName}\nCustomer Address: ${address || 'N/A'}\nVisit Date & Time: ${scheduledTime}`,
          `/worker/jobs?startJobId=${job._id}`
        );

        const populatedJob = await Job.findById(job._id).populate('workerId');
        const io = getIO();
        if (io) {
          io.to(workerId.toString()).emit('notification', {
            type: 'NEW_JOB',
            message: `New job "${title}" assigned to you for ${company}.`,
            jobTitle: title,
            company: company,
            jobId: job._id,
            job: populatedJob
          });
        }

        // 2. Email Notification to Worker
        const emailHtml = `
          <h3>New Job Assigned - ${company}</h3>
          <p>Hello ${worker.name},</p>
          <p>A new cleaning job has been assigned to you:</p>
          <ul>
            <li><strong>Title:</strong> ${title}</li>
            <li><strong>Client:</strong> ${clientName}</li>
            <li><strong>Address:</strong> ${address}</li>
            <li><strong>Company:</strong> ${company}</li>
          </ul>
          <p>Please log in to your ShineStaff app to view directions and start the job.</p>
        `;
        await sendMail(worker.email, 'New Job Assigned - ShineStaff', emailHtml);
      } else {
        console.log(`[DELAYED] Job assignment notification for tomorrow/future job ${job._id} is delayed until 7:00 PM on the day before.`);
      }
    }

    res.status(201).json({ message: 'Job created successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const startJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { beforePhotoDataUrl, location } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can start jobs' });
  }

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!job.workerId || job.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }

    const worker = await User.findById(req.user.id);
    const workerName = worker ? worker.name : 'Worker';

    if (job.status !== 'pending' && job.status !== 'accepted') {
      return res.status(400).json({ message: 'Job has already been started or processed' });
    }

    if (!beforePhotoDataUrl) {
      return res.status(400).json({ message: 'Live Before Photo is mandatory to start a job' });
    }

    // Upload before photo
    const beforePhotoUrl = await uploadToCloudinary(beforePhotoDataUrl, 'job_before_photos');

    job.status = 'started';
    job.beforePhoto = beforePhotoUrl;
    job.beforePhotoTime = new Date();
    if (location) {
      job.beforePhotoGPS = {
        lat: Number(location.lat),
        lng: Number(location.lng)
      };
    }
    job.startedAt = new Date();

    if (!job.timeline) job.timeline = [];
    job.timeline.push({
      status: 'started',
      timestamp: new Date(),
      remarks: 'Job started by worker',
      updatedBy: `Worker (${workerName})`
    });

    await job.save();

    const startedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Send detailed push notification to admins matching specification layout
    sendPushToAdmins(
      '🟢 Job Started',
      `Worker: ${workerName}
Company: ${job.company} Services
Customer: ${job.clientName}
Service: ${job.title}
Started: ${startedTime}`,
      '/admin'
    );

    // Send real-time notifications
    try {
      const populatedJob = await Job.findById(job._id).populate('workerId');
      const io = getIO();
      if (io) {
        // Notify admin
        io.emit('adminNotification', {
          type: 'JOB_STARTED',
          message: `${workerName} started job "${job.title}" for ${job.company}.`,
          jobId: job._id,
          job: populatedJob
        });
        // Notify worker room
        io.to(job.workerId.toString()).emit('notification', {
          type: 'JOB_STARTED',
          message: `Job "${job.title}" has been successfully started.`,
          jobId: job._id,
          job: populatedJob
        });
      }
    } catch (err) {
      console.error('Failed to send job started socket notification:', err);
    }

    res.status(200).json({ message: 'Job started successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const completeJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { afterPhotoDataUrl, afterPhotoDataUrls, location, manualFuelKms, workerNotes, paymentMode } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can complete jobs' });
  }

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const worker = await User.findById(req.user.id);
    const workerName = worker ? worker.name : 'Worker';

    if (!job.workerId || job.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }

    if (job.status === 'completed') {
      if (job.adminCompleted) {
        return res.status(400).json({ message: 'This job has already been completed by Admin.' });
      }
      return res.status(400).json({ message: 'This job has already been completed.' });
    }

    if (job.status !== 'started') {
      return res.status(400).json({ message: 'Job cannot be completed in its current state (Must be Started)' });
    }

    // Enforce exactly/minimum 5 after photos
    if (!afterPhotoDataUrls || !Array.isArray(afterPhotoDataUrls) || afterPhotoDataUrls.length < 5) {
      return res.status(400).json({ message: 'Live After Photos are mandatory (Minimum 5 photos required) to complete the job.' });
    }

    // Upload after photos concurrently
    const afterPhotoUrls = await Promise.all(
      afterPhotoDataUrls.map((dataUrl: string) => uploadToCloudinary(dataUrl, 'job_after_photos'))
    );
    const afterPhotoUrl = afterPhotoUrls[0];

    // Fetch settings for fuel allowance rate
    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
      await settings.save();
    }

    let calculatedKms = 0;
    if (job.beforePhotoGPS && location) {
      // Calculate distance between start (before photo location) and completion (after photo location)
      calculatedKms = calculateDistanceKM(
        job.beforePhotoGPS.lat,
        job.beforePhotoGPS.lng,
        Number(location.lat),
        Number(location.lng)
      );
    }

    // Default to 0 when completed by worker, until admin enters it
    const finalKms = Number(manualFuelKms) >= 0 ? Number(manualFuelKms) : 0;
    const fuelRate = settings.fuelAllowanceRate || 4; // e.g. ₹4/KM
    const fuelAllowance = finalKms * fuelRate;

    job.status = 'completed';
    job.afterPhoto = afterPhotoUrl;
    job.afterPhotos = afterPhotoUrls;
    job.afterPhotoTime = new Date();
    if (location) {
      job.afterPhotoGPS = {
        lat: Number(location.lat),
        lng: Number(location.lng)
      };
    }
    job.completedAt = new Date();
    job.fuelKmsTravelled = finalKms;
    job.fuelAllowance = fuelAllowance;
    job.workerNotes = workerNotes || '';
    if (paymentMode) {
      job.paymentMode = paymentMode as any;
    }

    if (!job.timeline) job.timeline = [];
    job.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      remarks: 'Job completed by worker',
      updatedBy: `Worker (${workerName || 'Worker'})`
    });

    await job.save();

    // Create travel log for this completed cleanup job
    try {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const prevJob = await Job.findOne({
        workerId: job.workerId,
        status: 'completed',
        _id: { $ne: job._id },
        completedAt: { $gte: todayStart, $lt: job.completedAt || new Date() }
      }).sort({ completedAt: -1 });

      const fromLoc = prevJob ? prevJob.address : 'Home';
      const toLoc = job.address;

      const travelLog = new TravelLog({
        workerId: job.workerId,
        date: new Date(job.completedAt).toISOString().split('T')[0],
        type: 'job',
        jobId: job._id,
        kms: finalKms,
        allowance: fuelAllowance,
        status: 'pending',
        fromLocation: fromLoc,
        toLocation: toLoc
      });
      await travelLog.save();
    } catch (err) {
      console.error('Failed to auto-create travel log:', err);
    }

    // WhatsApp notification to admin when job is completed
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || '+919876543210';
    const alertMsg = `*ShineStaff Job Alert* ✅
Job Title: *${job.title}*
Company: *${job.company}*
Worker: *${workerName}*
Client: *${job.clientName}*
Fuel Travelled: *${finalKms} KM* (Allowance: *₹${fuelAllowance}*)
Completed At: ${job.completedAt.toLocaleTimeString()}
Before/After photos uploaded successfully.`;

    await sendWhatsAppAlert(adminPhone, alertMsg);

    // Calculate total duration and send detailed completed push notification to admins matching specification layout
    const diffMs = new Date().getTime() - new Date(job.startedAt || new Date()).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    const durationStr = hrs > 0 ? `${hrs}h ${remainingMins}m` : `${mins}m`;
    const endTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    sendPushToAdmins(
      '✅ Job Completed',
      `Worker: ${workerName}
Customer: ${job.clientName}
Service: ${job.title}
Completed: ${endTimeStr}
Duration: ${durationStr}`,
      '/admin'
    );

    // Socket alert to admins and worker
    try {
      const populatedJob = await Job.findById(job._id).populate('workerId');
      const io = getIO();
      if (io) {
        io.emit('adminNotification', {
          type: 'JOB_COMPLETED',
          message: `${workerName} completed job "${job.title}" for ${job.company}.`,
          jobId: job._id,
          job: populatedJob
        });
        io.to(job.workerId.toString()).emit('notification', {
          type: 'JOB_COMPLETED',
          message: `Job "${job.title}" has been successfully completed.`,
          jobId: job._id,
          job: populatedJob
        });
      }
    } catch (err) {
      console.error('Failed to send job completed socket notification:', err);
    }

    res.status(200).json({ message: 'Job completed successfully and admin notified', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const cancelJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = 'cancelled';
    job.cancelReason = reason || 'No reason specified';
    if (!job.timeline) job.timeline = [];
    job.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      remarks: `Job cancelled. Reason: ${reason || 'No reason specified'}`,
      updatedBy: req.user ? (req.user.role === 'admin' ? 'Admin' : 'Worker') : 'System'
    });
    await job.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'Job',
      entityId: job._id.toString(),
      summary: `Cancelled job "${job.title}"${reason ? ` (reason: ${reason})` : ''}`
    });

    try {
      const populatedJob = await Job.findById(job._id).populate('workerId');
      const io = getIO();
      if (io) {
        io.emit('adminNotification', {
          type: 'JOB_CANCELLED',
          message: `Job "${job.title}" has been cancelled.`,
          jobId: job._id,
          job: populatedJob
        });
        if (job.workerId) {
          io.to(job.workerId.toString()).emit('notification', {
            type: 'JOB_CANCELLED',
            message: `Job "${job.title}" has been cancelled.`,
            jobId: job._id,
            job: populatedJob
          });
        }
      }
    } catch (err) {
      console.error('Failed to send job cancelled socket notification:', err);
    }

    res.status(200).json({ message: 'Job status set to cancelled', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const job = await Job.findByIdAndDelete(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    logAudit(req, {
      action: 'deleted',
      entityType: 'Job',
      entityId: id,
      summary: `Deleted job "${job.title}"`
    });

    try {
      const io = getIO();
      if (io) {
        io.emit('adminNotification', {
          type: 'JOB_DELETED',
          message: `Job "${job.title}" has been deleted.`,
          jobId: id
        });
        if (job.workerId) {
          io.to(job.workerId.toString()).emit('notification', {
            type: 'JOB_DELETED',
            message: `Job "${job.title}" has been deleted.`,
            jobId: id
          });
        }
      }
    } catch (err) {
      console.error('Failed to send job deleted socket notification:', err);
    }

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    company,
    workerId,
    clientName,
    clientPhone,
    address,
    locationName,
    price,
    date,
    timeSlot,
    location,
    fuelKmsTravelled,
    fuelAllowance,
    fromLocation,
    toLocation,
    paymentStatus,
    paymentMode,
    rating,
    status,
    cancelReason
  } = req.body;

  try {
    if (price !== undefined && Number(price) < 0) {
      return res.status(400).json({ message: 'Price cannot be negative' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check worker eligibility & conflict check
    if (workerId && workerId !== 'unassigned') {
      const targetWorkerId = workerId;
      const targetDate = date !== undefined ? date : job.date;
      const targetTimeSlot = timeSlot !== undefined ? timeSlot : job.timeSlot;

      if (targetDate && targetTimeSlot) {
        const overlappingJobs = await Job.find({
          _id: { $ne: job._id },
          workerId: targetWorkerId,
          date: targetDate,
          status: { $ne: 'cancelled' }
        });
        
        for (const oJob of overlappingJobs) {
          if (oJob.timeSlot && slotsOverlap(oJob.timeSlot, targetTimeSlot)) {
            return res.status(400).json({
              message: `Double Booking Alert! Selected worker is already assigned to a conflicting job: "${oJob.title}" (${oJob.timeSlot}) on this day.`
            });
          }
        }
      }

      if (workerId !== job.workerId?.toString()) {
        const worker = await User.findById(workerId);
        if (!worker || worker.role !== 'worker') {
          return res.status(404).json({ message: 'Worker not found' });
        }
        job.workerId = workerId;
      }
    } else if (workerId === 'unassigned') {
      job.workerId = undefined as any;
    } else {
      // If workerId is not passed, but date/time changes, check conflict on current worker
      if (job.workerId && (date !== undefined || timeSlot !== undefined)) {
        const targetDate = date !== undefined ? date : job.date;
        const targetTimeSlot = timeSlot !== undefined ? timeSlot : job.timeSlot;

        if (targetDate && targetTimeSlot) {
          const overlappingJobs = await Job.find({
            _id: { $ne: job._id },
            workerId: job.workerId,
            date: targetDate,
            status: { $ne: 'cancelled' }
          });
          
          for (const oJob of overlappingJobs) {
            if (oJob.timeSlot && slotsOverlap(oJob.timeSlot, targetTimeSlot)) {
              return res.status(400).json({
                message: `Double Booking Alert! Assigned worker is already assigned to a conflicting job: "${oJob.title}" (${oJob.timeSlot}) on this day.`
              });
            }
          }
        }
      }
    }

    job.title = title || job.title;
    job.description = description !== undefined ? description : job.description;
    job.company = company || job.company;
    job.clientName = clientName || job.clientName;
    job.clientPhone = clientPhone || job.clientPhone;
    job.address = address || job.address;
    job.locationName = locationName !== undefined ? locationName : job.locationName;
    job.price = price !== undefined ? Number(price) : job.price;
    job.date = date !== undefined ? date : job.date;
    job.timeSlot = timeSlot !== undefined ? timeSlot : job.timeSlot;
    if (location) {
      job.location = {
        lat: Number(location.lat),
        lng: Number(location.lng)
      };
    }
    if (fuelKmsTravelled !== undefined) {
      job.fuelKmsTravelled = Number(fuelKmsTravelled);
    }
    if (fuelAllowance !== undefined) {
      job.fuelAllowance = Number(fuelAllowance);
    } else if (fuelKmsTravelled !== undefined) {
      // Re-calculate fuel allowance using configured rate
      const settings = await Settings.findOne({ settingsId: 'global' });
      const fuelRate = settings ? (settings.fuelAllowanceRate || 4) : 4;
      job.fuelAllowance = (job.fuelKmsTravelled || 0) * fuelRate;
    }
    if (fromLocation !== undefined) {
      job.fromLocation = fromLocation;
    }
    if (toLocation !== undefined) {
      job.toLocation = toLocation;
    }
    if (paymentStatus !== undefined) {
      job.paymentStatus = paymentStatus;
    }
    if (paymentMode !== undefined) {
      job.paymentMode = paymentMode;
    }
    if (rating !== undefined) {
      job.rating = Number(rating);
    }

    if (status !== undefined) {
      if (job.status !== status) {
        job.status = status as any;
        if (status === 'cancelled') {
          job.cancelReason = cancelReason || 'No reason specified';
        }
        if (status === 'completed') {
          job.adminCompleted = true;
          job.adminCompletedBy = req.user ? new mongoose.Types.ObjectId(req.user.id) : undefined;
          job.adminCompletedByName = 'Admin';
          job.adminCompletionReason = 'Manual Override by Admin';
          job.adminCompletionRemarks = 'Admin manually updated job status to completed';
          job.adminCompletionIP = req.ip || 'unknown';
          job.adminCompletionWorkerConfirmed = true;
        }
        if (!job.timeline) job.timeline = [];
        job.timeline.push({
          status: status as any,
          timestamp: new Date(),
          remarks: status === 'cancelled'
            ? `Job cancelled. Reason: ${cancelReason || 'No reason specified'}`
            : `Status updated by Admin to ${status}`,
          updatedBy: 'Admin'
        });
      }
    }

    const wasNotified = !!job.notificationSentAt;
    const delay = shouldDelayNotification(job.date || '');
    
    if (delay) {
      job.notificationSentAt = undefined;
    } else if (!wasNotified && job.workerId) {
      job.notificationSentAt = new Date();
    }

    await job.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'Job',
      entityId: job._id.toString(),
      summary: `Edited job "${job.title}"`
    });

    try {
      const io = getIO();
      if (io) {
        io.emit('adminNotification', {
          type: 'JOB_UPDATED',
          message: `Job "${job.title}" has been updated.`,
          jobId: job._id
        });
        
        if (job.workerId && !delay) {
          if (!wasNotified) {
            sendJobNotification(job);
          } else {
            io.to(job.workerId.toString()).emit('notification', {
              type: 'JOB_UPDATED',
              message: `Job "${job.title}" has been updated.`,
              jobId: job._id
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to send job updated socket notification:', err);
    }

    res.status(200).json({ message: 'Job updated successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateJobFuel = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fuelKmsTravelled } = req.body;

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.user?.role === 'worker' && (!job.workerId || job.workerId.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }

    job.fuelKmsTravelled = Number(fuelKmsTravelled) || 0;

    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
      await settings.save();
    }
    const fuelRate = settings.fuelAllowanceRate || 4;
    job.fuelAllowance = (job.fuelKmsTravelled || 0) * fuelRate;

    await job.save();

    res.status(200).json({ message: 'Fuel KMs updated successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const acceptJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const job = await Job.findById(id).populate('workerId');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const worker: any = job.workerId;
    if (!worker || worker._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }
    job.status = 'accepted';
    job.acceptedAt = new Date();
    if (!job.timeline) job.timeline = [];
    job.timeline.push({
      status: 'accepted',
      timestamp: new Date(),
      remarks: 'Job accepted by worker',
      updatedBy: `Worker (${worker.name})`
    });
    await job.save();

    // Notify admin
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'JOB_ACCEPTED',
        message: `Job "${job.title}" accepted by worker ${worker.name}.`,
        jobId: job._id,
        workerName: worker.name,
        acceptedAt: job.acceptedAt,
        job
      });
    }

    sendPushToAdmins(
      `🟡 Job Accepted: ${job.company}`,
      `Worker ${worker.name} accepted job "${job.title}" for client ${job.clientName}.`,
      '/admin'
    );

    res.status(200).json({ message: 'Job accepted successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const rejectJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const job = await Job.findById(id).populate('workerId');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const worker: any = job.workerId;
    if (!worker || worker._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }
    job.status = 'rejected';
    job.rejectedAt = new Date();
    if (!job.timeline) job.timeline = [];
    job.timeline.push({
      status: 'rejected',
      timestamp: new Date(),
      remarks: 'Job rejected by worker',
      updatedBy: `Worker (${worker.name})`
    });
    await job.save();

    // Notify admin
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'JOB_REJECTED',
        message: `Job "${job.title}" rejected by worker ${worker.name}.`,
        jobId: job._id,
        workerName: worker.name,
        rejectedAt: job.rejectedAt,
        job
      });
    }

    sendPushToAdmins(
      `🚨 Job Rejected: ${job.company}`,
      `Worker ${worker.name} rejected job "${job.title}" for client ${job.clientName}.`,
      '/admin'
    );

    res.status(200).json({ message: 'Job rejected successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const logNotificationDelivered = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (!job.notificationDeliveredAt) {
      job.notificationDeliveredAt = new Date();
      await job.save();
    }
    res.status(200).json({ message: 'Notification delivery timestamp logged', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getCustomerDetailsByPhone = async (req: AuthRequest, res: Response) => {
  const { phone } = req.params;
  try {
    const latestJob = await Job.findOne({ clientPhone: phone })
      .sort({ createdAt: -1 })
      .populate('workerId');

    if (!latestJob) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const allJobs = await Job.find({ clientPhone: phone }).sort({ date: -1 });

    res.status(200).json({
      clientName: latestJob.clientName,
      address: latestJob.address,
      locationName: latestJob.locationName || '',
      company: latestJob.company,
      price: latestJob.price,
      notes: latestJob.description || '',
      lastService: latestJob.title,
      previousBookingsCount: allJobs.length,
      latitude: latestJob.location?.lat || null,
      longitude: latestJob.location?.lng || null
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getFormSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await Job.find({}, 'clientName clientPhone address locationName title description company');
    
    const names = Array.from(new Set(jobs.map(j => j.clientName).filter(Boolean)));
    const services = Array.from(new Set(jobs.map(j => j.title).filter(Boolean)));
    const addresses = Array.from(new Set(jobs.map(j => j.address).filter(Boolean)));
    const locations = Array.from(new Set(jobs.map(j => j.locationName).filter(Boolean)));
    const descriptions = Array.from(new Set(jobs.map(j => j.description).filter(Boolean)));
    const phones = Array.from(new Set(jobs.map(j => j.clientPhone).filter(Boolean)));

    res.status(200).json({
      names,
      services,
      addresses,
      locations,
      descriptions,
      phones
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const adminCompleteJob = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only Admin and Super Admin can manually complete jobs.' });
  }

  const { id } = req.params;
  const { reason, remarks, workerConfirmed, paymentStatus, paymentMode } = req.body;

  try {
    const adminUser = await User.findById(req.user.id);
    const adminName = adminUser ? adminUser.name : 'Admin';

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status === 'completed') {
      return res.status(400).json({ message: 'This job has already been completed.' });
    }

    // Set completion details
    job.status = 'completed';
    job.completedAt = new Date();
    
    // Set admin completion fields
    job.adminCompleted = true;
    job.adminCompletedBy = req.user.id as any;
    job.adminCompletedByName = adminName;
    job.adminCompletionReason = reason || 'Network Issue';
    job.adminCompletionRemarks = remarks || '';
    job.adminCompletionIP = req.ip || req.socket.remoteAddress || '';
    job.adminCompletionWorkerConfirmed = !!workerConfirmed;

    if (paymentStatus) {
      job.paymentStatus = paymentStatus;
    }
    if (paymentMode) {
      job.paymentMode = paymentMode;
    }

    // Add to timeline
    if (!job.timeline) job.timeline = [];
    job.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      remarks: `Admin Completed: ${reason || 'Network Issue'}. ${remarks || ''}`,
      updatedBy: `Admin (${adminName})`
    });

    await job.save();

    // Log Audit Log
    logAudit(req, {
      action: 'completed_by_admin',
      entityType: 'Job',
      entityId: job._id.toString(),
      summary: `Job "${job.title}" manually marked completed by Admin (${adminName}) due to: ${reason}`
    });

    // Notify via Socket
    try {
      const io = getIO();
      if (io) {
        io.emit('adminNotification', {
          type: 'JOB_COMPLETED',
          message: `Job "${job.title}" completed by Admin.`,
          jobId: job._id
        });
        if (job.workerId) {
          io.to(job.workerId.toString()).emit('notification', {
            type: 'JOB_COMPLETED_BY_ADMIN',
            message: `Your assigned job "${job.title}" has been marked completed by Admin.`,
            jobId: job._id
          });
        }
      }
    } catch (err) {
      console.error('Failed to emit admin completion socket alerts:', err);
    }

    res.status(200).json({ message: 'Job completed successfully by Admin', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateClientInfo = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { originalPhone, clientName, clientPhone, address } = req.body;
  if (!originalPhone) {
    return res.status(400).json({ message: 'originalPhone is required' });
  }
  try {
    const result = await Job.updateMany(
      { clientPhone: originalPhone },
      { $set: { clientName, clientPhone, address } }
    );
    res.status(200).json({ message: `Successfully updated ${result.modifiedCount} job records` });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

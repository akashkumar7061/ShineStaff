import { Request, Response } from 'express';
import Job from '../models/Job';
import User from '../models/User';
import Settings from '../models/Settings';
import TravelLog from '../models/TravelLog';
import { uploadToCloudinary } from '../config/cloudinary';
import { sendWhatsAppAlert } from '../utils/whatsapp';
import { sendMail } from '../config/mailer';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index'; // we'll export getIO from entry point

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
      // Find jobs created on this date
      const start = new Date(date as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date as string);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
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
    location
  } = req.body;

  try {
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Assigned worker not found' });
    }

    const job = new Job({
      title,
      description,
      company,
      workerId,
      clientName,
      clientPhone,
      address,
      locationName,
      price: Number(price) || 0,
      date,
      timeSlot,
      location,
      status: 'pending'
    });

    await job.save();

    // Send notifications
    // 1. Socket.io
    const io = getIO();
    if (io) {
      io.to(workerId).emit('notification', {
        type: 'NEW_JOB',
        message: `New job "${title}" assigned to you for ${company}.`,
        jobId: job._id
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

    res.status(201).json({ message: 'Job created and worker notified', job });
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

    if (job.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }

    if (job.status !== 'pending') {
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

    await job.save();

    res.status(200).json({ message: 'Job started successfully', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const completeJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { afterPhotoDataUrl, location, manualFuelKms, workerNotes } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can complete jobs' });
  }

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.workerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }

    if (job.status !== 'started') {
      return res.status(400).json({ message: 'Job cannot be completed in its current state (Must be Started)' });
    }

    if (!afterPhotoDataUrl) {
      return res.status(400).json({ message: 'Live After Photo is mandatory to complete a job' });
    }

    // Upload after photo
    const afterPhotoUrl = await uploadToCloudinary(afterPhotoDataUrl, 'job_after_photos');

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

    // Use manual input if provided, otherwise default to calculated distance
    const finalKms = manualFuelKms !== undefined ? Number(manualFuelKms) : (calculatedKms || 0);
    const fuelRate = settings.fuelAllowanceRate || 5; // e.g. ₹5/KM
    const fuelAllowance = finalKms * fuelRate;

    job.status = 'completed';
    job.afterPhoto = afterPhotoUrl;
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
        status: 'approved',
        fromLocation: fromLoc,
        toLocation: toLoc
      });
      await travelLog.save();
    } catch (err) {
      console.error('Failed to auto-create travel log:', err);
    }

    // Get worker details
    const worker = await User.findById(req.user.id);
    const workerName = worker ? worker.name : 'Worker';

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

    // Socket alert to admins
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'JOB_COMPLETED',
        message: `${workerName} completed job "${job.title}" for ${job.company}.`,
        jobId: job._id
      });
    }

    res.status(200).json({ message: 'Job completed successfully and admin notified', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const cancelJob = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = 'cancelled';
    await job.save();

    res.status(200).json({ message: 'Job status set to cancelled', job });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const job = await Job.findByIdAndDelete(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

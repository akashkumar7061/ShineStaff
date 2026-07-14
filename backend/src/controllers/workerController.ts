import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Job from '../models/Job';
import Overtime from '../models/Overtime';
import TravelLog from '../models/TravelLog';
import SalaryRequest from '../models/SalaryRequest';
import Leave from '../models/Leave';
import { uploadToCloudinary } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLog';

export const getWorkers = async (req: Request, res: Response) => {
  try {
    const { company, status } = req.query;
    const filter: any = { role: 'worker' };

    if (company && company !== 'All') {
      filter.company = { $in: [company, 'Both'] };
    }
    if (status) {
      filter.status = status;
    }

    const workers = await User.find(filter).select('-password');
    res.status(200).json(workers);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getWorkerDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const worker = await User.findById(id).select('-password');
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Get attendance logs
    const attendance = await Attendance.find({ workerId: id }).sort({ checkInTime: -1 }).limit(30);

    // Get jobs assigned
    const jobs = await Job.find({ workerId: id }).sort({ createdAt: -1 }).limit(30);

    // Get overtime logged
    const overtimes = await Overtime.find({ workerId: id }).sort({ date: -1 }).limit(30);

    // Get travel logs logged
    const travelLogs = await TravelLog.find({ workerId: id }).populate('jobId').sort({ date: -1 }).limit(30);

    // Get payout logs logged
    const payouts = await SalaryRequest.find({ workerId: id }).sort({ createdAt: -1 }).limit(30);

    // Calculate performance score
    // Completed jobs vs Total assigned jobs
    const totalJobs = await Job.countDocuments({ workerId: id });
    const completedJobs = await Job.countDocuments({ workerId: id, status: 'completed' });
    
    // Attendance rate
    const totalDays = 30; // standard last 30 days
    const presentDays = await Attendance.countDocuments({
      workerId: id,
      status: { $in: ['present', 'late', 'half-day'] }
    });

    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 100;
    const attendanceRate = Math.round((presentDays / totalDays) * 100);

    // Score out of 100
    const performanceScore = Math.min(100, Math.round((completionRate * 0.6) + (attendanceRate * 0.4)));

    res.status(200).json({
      worker,
      attendance,
      jobs,
      overtimes,
      travelLogs,
      payouts,
      stats: {
        totalJobs,
        completedJobs,
        completionRate,
        attendanceRate,
        performanceScore
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addWorker = async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    phone,
    address,
    aadhaarNumber,
    dailySalary,
    monthlySalary,
    company,
    photoDataUrl
  } = req.body;

  try {
    const targetEmail = email || `${phone}@shinestaff.com`;
    const existing = await User.findOne({ email: targetEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    let photoUrl = '';
    if (photoDataUrl) {
      photoUrl = await uploadToCloudinary(photoDataUrl, 'worker_photos');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'worker123', salt);

    const worker = new User({
      name,
      email: targetEmail,
      password: hashedPassword,
      role: 'worker',
      company,
      phone,
      address,
      aadhaarNumber,
      dailySalary: Number(dailySalary) || Number((Number(monthlySalary || 0) / 30).toFixed(2)),
      monthlySalary: Number(monthlySalary) || Number((Number(dailySalary || 0) * 30).toFixed(2)),
      photo: photoUrl,
      status: 'active',
      joiningDate: new Date()
    });

    await worker.save();
    
    // Exclude password in response
    const workerObj = worker.toObject();
    delete workerObj.password;

    res.status(201).json({ message: 'Worker created successfully', worker: workerObj });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const editWorker = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    address,
    aadhaarNumber,
    dailySalary,
    monthlySalary,
    company,
    status,
    photoDataUrl
  } = req.body;

  try {
    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    if (photoDataUrl && !photoDataUrl.startsWith('http')) {
      worker.photo = await uploadToCloudinary(photoDataUrl, 'worker_photos');
    }

    worker.name = name || worker.name;
    worker.email = email || worker.email;
    worker.phone = phone || worker.phone;
    worker.address = address !== undefined ? address : worker.address;
    worker.aadhaarNumber = aadhaarNumber !== undefined ? aadhaarNumber : worker.aadhaarNumber;
    let finalMonthly = monthlySalary !== undefined ? Number(monthlySalary) : worker.monthlySalary;
    let finalDaily = dailySalary !== undefined ? Number(dailySalary) : worker.dailySalary;

    if (monthlySalary !== undefined && Number(monthlySalary) !== worker.monthlySalary) {
      finalMonthly = Number(monthlySalary);
      finalDaily = Number((finalMonthly / 30).toFixed(2));
    } else if (dailySalary !== undefined && Number(dailySalary) !== worker.dailySalary) {
      finalDaily = Number(dailySalary);
      finalMonthly = Number((finalDaily * 30).toFixed(2));
    }

    worker.dailySalary = finalDaily;
    worker.monthlySalary = finalMonthly;
    worker.company = company || worker.company;
    worker.status = status || worker.status;

    await worker.save();

    logAudit(req, {
      action: 'updated',
      entityType: 'Worker',
      entityId: worker._id.toString(),
      summary: `Edited worker profile for ${worker.name}`
    });

    res.status(200).json({ message: 'Worker updated successfully', worker });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteWorker = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    await User.findByIdAndDelete(id);
    // Delete attendance and jobs too or keep them for history? Mongoose allows cascade if needed,
    // let's just delete the worker profile.

    logAudit(req, {
      action: 'deleted',
      entityType: 'Worker',
      entityId: id,
      summary: `Deleted worker profile for ${worker.name}`
    });

    res.status(200).json({ message: 'Worker deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateWorkerLocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  try {
    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    worker.currentLocation = { lat: Number(lat), lng: Number(lng) };
    worker.lastActive = new Date();
    await worker.save();

    res.status(200).json({ message: 'Location updated successfully', location: worker.currentLocation });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
  // Check overlap with 30 minutes travel buffer between jobs
  const travelBuffer = 30; 
  return (rangeA.start < rangeB.end + travelBuffer) && (rangeA.end + travelBuffer > rangeB.start);
};

export const getWorkerRecommendations = async (req: Request, res: Response) => {
  const { date, startTime, endTime, lat, lng, company } = req.body;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Date, startTime, and endTime are required.' });
  }

  try {
    // 1. Fetch active workers
    const workerFilter: any = { role: 'worker', status: 'active' };
    if (company && company !== 'All') {
      workerFilter.company = { $in: [company, 'Both'] };
    }
    const workers = await User.find(workerFilter).select('-password');

    // 2. Fetch approved leaves for date
    const targetDate = new Date(date);
    const leaves = await Leave.find({
      status: 'approved',
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate }
    });
    const leaveWorkerIds = new Set(leaves.map(l => l.workerId.toString()));

    // 3. Fetch check-in attendance records for date
    const attendance = await Attendance.find({ date });
    const checkedInWorkerIds = new Set(attendance.map(a => a.workerId.toString()));

    // 4. Fetch all jobs for selected date (non-cancelled)
    const dayJobs = await Job.find({
      date,
      status: { $ne: 'cancelled' }
    });

    const isDateToday = date === new Date().toISOString().split('T')[0];

    const result = [];
    const busyWorkersList: any[] = [];

    for (const worker of workers) {
      const workerIdStr = worker._id.toString();
      
      // A. Leave Status
      const isOnLeave = leaveWorkerIds.has(workerIdStr);

      // B. Workload check
      const workerJobs = dayJobs.filter(j => j.workerId && j.workerId.toString() === workerIdStr);
      const workload = workerJobs.length;

      // C. Offline check (checked in today or profile inactive)
      const hasCheckedIn = checkedInWorkerIds.has(workerIdStr);
      let isOffline = worker.status === 'inactive';
      if (isDateToday && !hasCheckedIn) {
        isOffline = true;
      }

      // D. Schedule Conflict check
      let hasConflict = false;
      let conflictDetails = '';
      let freeAfter = '';
      const reqSlot = `${startTime} - ${endTime}`;

      for (const job of workerJobs) {
        if (job.timeSlot) {
          const overlap = slotsOverlap(job.timeSlot, reqSlot);
          if (overlap) {
            hasConflict = true;
            conflictDetails = `Conflict: ${job.title} (${job.timeSlot})`;
            const slotParts = job.timeSlot.split('-');
            if (slotParts.length > 1) {
              freeAfter = slotParts[1].trim();
            }
          }
        }
      }

      // E. Proximity calculations
      let distance = null;
      let eta = null;
      if (lat && lng && worker.currentLocation && worker.currentLocation.lat && worker.currentLocation.lng) {
        distance = calculateDistanceKM(Number(lat), Number(lng), worker.currentLocation.lat, worker.currentLocation.lng);
        eta = Math.round(distance * 2.5); // Estimate 2.5 mins per KM in city traffic
      }

      // F. Status calculation
      let status: 'Available' | 'Busy' | 'On Leave' | 'Offline' = 'Available';
      if (isOnLeave) {
        status = 'On Leave';
      } else if (hasConflict) {
        status = 'Busy';
      } else if (isOffline) {
        status = 'Offline';
      }

      // G. Match Score calculation
      let matchScore = 0;
      if (status === 'Available') {
        let score = 100;
        if (distance !== null) {
          score -= distance * 2; // Deduct 2% per KM
        }
        score -= workload * 5; // Deduct 5% per job already assigned today
        matchScore = Math.max(50, Math.round(score)); // Minimum 50% match if available
      }

      const workerInfo = {
        _id: worker._id,
        name: worker.name,
        photo: worker.photo || '',
        phone: worker.phone,
        company: worker.company,
        status,
        distance,
        eta,
        workload,
        matchScore,
        conflictDetails,
        freeAfter
      };

      result.push(workerInfo);

      if (hasConflict && freeAfter) {
        busyWorkersList.push({
          name: worker.name,
          freeAfter
        });
      }
    }

    // Sort: Available workers by matchScore descending (and distance ascending), then Busy, then On Leave/Offline
    result.sort((a, b) => {
      const statusOrder = { 'Available': 1, 'Busy': 2, 'On Leave': 3, 'Offline': 4 };
      const orderA = statusOrder[a.status];
      const orderB = statusOrder[b.status];
      if (orderA !== orderB) return orderA - orderB;
      if (a.status === 'Available') {
        return b.matchScore - a.matchScore;
      }
      return 0;
    });

    // Determine alternative suggestion if no available worker
    let alternativeSuggestion = '';
    const availableWorkers = result.filter(w => w.status === 'Available');
    if (availableWorkers.length === 0 && busyWorkersList.length > 0) {
      // Sort busy workers to find the one free earliest
      const sortedBusy = busyWorkersList.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.freeAfter);
        const timeB = parseTimeToMinutes(b.freeAfter);
        return timeA - timeB;
      });
      if (sortedBusy.length > 0) {
        alternativeSuggestion = `${sortedBusy[0].name} will become free at ${sortedBusy[0].freeAfter}.`;
      }
    }

    res.status(200).json({
      recommendations: result,
      alternativeSuggestion
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

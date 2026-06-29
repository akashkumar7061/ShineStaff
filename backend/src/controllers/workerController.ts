import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Job from '../models/Job';
import { uploadToCloudinary } from '../config/cloudinary';

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
    const existing = await User.findOne({ email });
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
      email,
      password: hashedPassword,
      role: 'worker',
      company,
      phone,
      address,
      aadhaarNumber,
      dailySalary: Number(dailySalary) || 0,
      monthlySalary: Number(monthlySalary) || 0,
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

export const editWorker = async (req: Request, res: Response) => {
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
    worker.dailySalary = dailySalary !== undefined ? Number(dailySalary) : worker.dailySalary;
    worker.monthlySalary = monthlySalary !== undefined ? Number(monthlySalary) : worker.monthlySalary;
    worker.company = company || worker.company;
    worker.status = status || worker.status;

    await worker.save();

    res.status(200).json({ message: 'Worker updated successfully', worker });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteWorker = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    await User.findByIdAndDelete(id);
    // Delete attendance and jobs too or keep them for history? Mongoose allows cascade if needed,
    // let's just delete the worker profile.
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

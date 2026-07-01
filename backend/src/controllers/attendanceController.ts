import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Settings from '../models/Settings';
import User from '../models/User';
import { uploadToCloudinary } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';

export const getTodayAttendance = async (req: Request, res: Response) => {
  try {
    const queryDate = req.query.date as string;
    const targetDate = queryDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logs = await Attendance.find({ date: targetDate }).populate('workerId', 'name email phone company photo');
    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getWorkerAttendance = async (req: Request, res: Response) => {
  const { workerId } = req.params;
  try {
    const logs = await Attendance.find({ workerId }).sort({ checkInTime: -1 });
    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  const { selfieDataUrl, location, deviceInfo } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can mark attendance' });
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if already marked today
    const existing = await Attendance.findOne({ workerId: req.user.id, date: today });
    if (existing) {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }

    if (!selfieDataUrl || !location || !deviceInfo) {
      return res.status(400).json({ message: 'Selfie photo, GPS location, and device details are required' });
    }

    // Upload selfie
    const selfieUrl = await uploadToCloudinary(selfieDataUrl, 'attendance_selfies');

    // Fetch rules to determine if late
    let settings = await Settings.findOne({ settingsId: 'global' });
    if (!settings) {
      settings = new Settings({ settingsId: 'global' });
      await settings.save();
    }

    const now = new Date();
    const checkInHour = now.getHours();
    const checkInMin = now.getMinutes();

    // Default target time is 09:00 AM.
    // If checkIn time is past 09:00 + graceMins (e.g. 09:15), then status is 'late'
    const targetHour = 9;
    const graceMins = settings.lateTimeGraceMins || 15;
    
    let status: 'present' | 'late' = 'present';
    if (checkInHour > targetHour || (checkInHour === targetHour && checkInMin > graceMins)) {
      status = 'late';
    }

    const attendance = new Attendance({
      workerId: req.user.id,
      date: today,
      checkInTime: now,
      selfie: selfieUrl,
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      deviceInfo,
      status
    });

    await attendance.save();

    // Also update worker's last active location
    await User.findByIdAndUpdate(req.user.id, {
      currentLocation: { lat: Number(location.lat), lng: Number(location.lng) },
      lastActive: now
    });

    res.status(201).json({ message: `Attendance marked successfully. Status: ${status}`, attendance });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const editAttendance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, date, checkInTime } = req.body;

  try {
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.status = status || attendance.status;
    attendance.date = date || attendance.date;
    if (checkInTime) {
      attendance.checkInTime = new Date(checkInTime);
    }
    attendance.editedByAdmin = true;

    await attendance.save();

    res.status(200).json({ message: 'Attendance updated successfully by admin', attendance });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin can create direct manual attendance logs for a worker
export const createManualAttendance = async (req: Request, res: Response) => {
  const { workerId, date, status } = req.body;
  try {
    const existing = await Attendance.findOne({ workerId, date });
    if (existing) {
      return res.status(400).json({ message: 'Attendance already exists for this date' });
    }

    const attendance = new Attendance({
      workerId,
      date,
      checkInTime: new Date(`${date}T09:00:00.000Z`),
      selfie: 'https://via.placeholder.com/150?text=Manual+Entry',
      location: { lat: 0, lng: 0 },
      deviceInfo: 'Admin Manual Entry',
      status,
      editedByAdmin: true
    });

    await attendance.save();
    res.status(201).json({ message: 'Attendance recorded successfully', attendance });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

import { Response } from 'express';
import TravelLog from '../models/TravelLog';
import Job from '../models/Job';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';

export const submitTravelLog = async (req: AuthRequest, res: Response) => {
  const { date, type, jobId, kms } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can log travel commutes' });
  }

  try {
    let fromLoc = 'Work Site';
    let toLoc = 'Home';

    if (type === 'home') {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const lastJob = await Job.findOne({
        workerId: req.user.id,
        status: 'completed',
        completedAt: { $gte: todayStart, $lte: todayEnd }
      }).sort({ completedAt: -1 });

      if (lastJob) {
        fromLoc = lastJob.address;
      }
    } else {
      fromLoc = 'Home';
      if (jobId) {
        const targetJob = await Job.findById(jobId);
        if (targetJob) {
          toLoc = targetJob.address;
        }
      }
    }

    const travel = new TravelLog({
      workerId: req.user.id,
      date: date || new Date().toISOString().split('T')[0],
      type,
      jobId: jobId || undefined,
      kms: Number(kms) || 0,
      allowance: 0,
      status: 'pending',
      fromLocation: fromLoc,
      toLocation: toLoc
    });

    await travel.save();

    // Emit Socket alert to admins for real-time dashboard reload
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_SUBMITTED',
        message: `New commute log submitted.`,
        travelId: travel._id
      });
    }

    res.status(201).json({ message: 'Travel commute logged successfully', travel });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTravelLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { workerId, date, status } = req.query;
    const filter: any = {};

    if (workerId) {
      filter.workerId = workerId;
    }
    if (date) {
      filter.date = date;
    }
    if (status) {
      filter.status = status;
    }

    const logs = await TravelLog.find(filter)
      .populate('workerId', 'name email phone company')
      .populate('jobId', 'title clientName clientPhone address')
      .sort({ date: -1 });

    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const approveTravelLog = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { allowance } = req.body;

  try {
    const log = await TravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Travel commute log not found' });
    }

    log.allowance = Number(allowance) || 0;
    log.status = 'approved';

    await log.save();

    // Notify worker via Socket
    const io = getIO();
    if (io) {
      io.to(log.workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_APPROVED',
        message: `Your travel allowance of ₹${allowance} was approved.`,
        travelId: log._id
      });
    }

    res.status(200).json({ message: 'Travel allowance approved successfully', log });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateTravelLog = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { date, type, kms, allowance, status, fromLocation, toLocation } = req.body;

  try {
    const log = await TravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Travel log not found' });
    }

    if (date !== undefined) log.date = date;
    if (type !== undefined) log.type = type;
    if (kms !== undefined) log.kms = Number(kms);
    if (allowance !== undefined) log.allowance = Number(allowance);
    if (status !== undefined) log.status = status;
    if (fromLocation !== undefined) log.fromLocation = fromLocation;
    if (toLocation !== undefined) log.toLocation = toLocation;

    await log.save();

    // Notify admins and worker via Socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'TRAVEL_LOG_UPDATED',
        message: `Travel log updated.`,
        travelId: log._id
      });
      io.to(log.workerId.toString()).emit('notification', {
        type: 'TRAVEL_LOG_UPDATED',
        message: `Your travel log was updated by admin.`,
        travelId: log._id
      });
    }

    res.status(200).json({ message: 'Travel log updated successfully', log });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

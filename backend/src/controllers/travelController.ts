import { Response } from 'express';
import TravelLog from '../models/TravelLog';
import Job from '../models/Job';
import { AuthRequest } from '../middleware/auth';

export const submitTravelLog = async (req: AuthRequest, res: Response) => {
  const { date, type, jobId, kms } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can log travel commutes' });
  }

  try {
    const travel = new TravelLog({
      workerId: req.user.id,
      date: date || new Date().toISOString().split('T')[0],
      type,
      jobId: jobId || undefined,
      kms: Number(kms) || 0,
      allowance: 0,
      status: 'pending'
    });

    await travel.save();
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
    res.status(200).json({ message: 'Travel allowance approved successfully', log });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

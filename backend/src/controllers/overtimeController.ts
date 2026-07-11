import { Response } from 'express';
import Overtime from '../models/Overtime';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLog';

export const createOvertime = async (req: AuthRequest, res: Response) => {
  const { workerId, date, hours, ratePerHour, reason } = req.body;

  try {
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const totalCharges = Number(hours) * Number(ratePerHour);

    const overtime = new Overtime({
      workerId,
      date,
      hours: Number(hours),
      ratePerHour: Number(ratePerHour),
      totalCharges,
      reason: reason || ''
    });

    await overtime.save();

    logAudit(req, {
      action: 'created',
      entityType: 'Overtime',
      entityId: overtime._id.toString(),
      summary: `Logged ${hours}h overtime (₹${totalCharges}) for ${worker.name}`
    });

    res.status(201).json({ message: 'Overtime charge recorded successfully', overtime });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getOvertimes = async (req: AuthRequest, res: Response) => {
  try {
    const { workerId, month } = req.query;
    const filter: any = {};

    if (workerId) {
      filter.workerId = workerId;
    }

    if (month) {
      // Find overtimes in the format YYYY-MM
      filter.date = { $regex: new RegExp(`^${month}`) };
    }

    const overtimes = await Overtime.find(filter)
      .populate('workerId', 'name email phone company')
      .sort({ date: -1 });

    res.status(200).json(overtimes);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteOvertime = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const overtime = await Overtime.findByIdAndDelete(id);
    if (!overtime) {
      return res.status(404).json({ message: 'Overtime log not found' });
    }

    logAudit(req, {
      action: 'deleted',
      entityType: 'Overtime',
      entityId: overtime._id.toString(),
      summary: `Deleted a ${overtime.hours}h overtime record (₹${overtime.totalCharges})`
    });

    res.status(200).json({ message: 'Overtime record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

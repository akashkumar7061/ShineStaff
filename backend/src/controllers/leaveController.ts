import { Response } from 'express';
import Leave from '../models/Leave';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';
import { logAudit } from '../utils/auditLog';

export const getLeaves = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { status, workerId } = req.query;
    const filter: any = {};

    if (req.user.role === 'worker') {
      filter.workerId = req.user.id;
    } else if (workerId) {
      filter.workerId = workerId;
    }

    if (status) {
      filter.status = status;
    }

    const leaves = await Leave.find(filter)
      .populate('workerId', 'name email phone company photo')
      .sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const applyLeave = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, reason } = req.body;

  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can apply for leaves' });
  }

  try {
    const leave = new Leave({
      workerId: req.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'pending'
    });

    await leave.save();

    // Alert admin via socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'LEAVE_APPLIED',
        message: `New leave request applied by worker.`
      });
    }

    res.status(201).json({ message: 'Leave request submitted successfully', leave });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const processLeave = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve/reject leaves' });
  }

  try {
    const leave = await Leave.findById(id).populate('workerId');
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leave.status = status;
    await leave.save();

    logAudit(req, {
      action: status === 'approved' ? 'approved' : 'rejected',
      entityType: 'Leave',
      entityId: leave._id.toString(),
      summary: `${status === 'approved' ? 'Approved' : 'Rejected'} a leave request (${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()})`
    });

    // Notify worker
    const io = getIO();
    if (io) {
      io.to(leave.workerId._id.toString()).emit('notification', {
        type: 'LEAVE_APPROVED',
        message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} has been ${status}.`
      });
    }

    res.status(200).json({ message: `Leave request ${status} successfully`, leave });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

import { Response } from 'express';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { adminId, entityType, startDate, endDate } = req.query;
    const filter: any = {};

    if (adminId) filter.adminId = adminId;
    if (entityType) filter.entityType = entityType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    res.status(200).json({ logs, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

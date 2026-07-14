import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Commission from '../models/Commission';
import Job from '../models/Job';
import User from '../models/User';
import { logAudit } from '../utils/auditLog';

export const getCommissions = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { workerId, company, startDate, endDate } = req.query;
    const filter: any = {};

    if (workerId && workerId !== 'all') {
      filter.workerId = workerId;
    }

    if (company && company !== 'All') {
      filter.company = company;
    }

    if (startDate && endDate) {
      filter.jobDate = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const commissions = await Commission.find(filter)
      .populate('workerId', 'name photo company')
      .populate('jobId', 'title visitId price clientName date timeSlot')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(commissions);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const bulkUpsertCommissions = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { workerId, commissions } = req.body;

  if (!workerId || !Array.isArray(commissions)) {
    return res.status(400).json({ message: 'Invalid payload: workerId and commissions array are required.' });
  }

  try {
    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const savedCommissions = [];

    for (const item of commissions) {
      const { jobId, commissionAmount, remarks } = item;
      if (!jobId) continue;

      const job = await Job.findById(jobId);
      if (!job) continue;

      // Upsert Commission
      const existing = await Commission.findOne({ jobId });
      if (existing) {
        existing.commissionAmount = Number(commissionAmount) || 0;
        existing.remarks = remarks || '';
        existing.jobDate = job.date || '';
        existing.createdBy = req.user.id as any;
        await existing.save();
        savedCommissions.push(existing);
      } else {
        const commission = new Commission({
          workerId: worker._id,
          jobId: job._id,
          company: job.company,
          clientName: job.clientName,
          jobDate: job.date || '',
          workAmount: job.price || 0,
          commissionAmount: Number(commissionAmount) || 0,
          remarks: remarks || '',
          createdBy: req.user.id
        });
        await commission.save();
        savedCommissions.push(commission);
      }
    }

    logAudit(req, {
      action: 'COMMISSIONS_BULK_UPSERT',
      entityType: 'User',
      entityId: worker._id.toString(),
      summary: `Bulk upserted commissions for worker ${worker.name}.`
    });

    res.status(200).json({ message: 'Commissions saved successfully', commissions: savedCommissions });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateCommission = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const { commissionAmount, remarks } = req.body;

  try {
    const commission = await Commission.findById(id);
    if (!commission) {
      return res.status(404).json({ message: 'Commission record not found' });
    }

    commission.commissionAmount = Number(commissionAmount) || 0;
    commission.remarks = remarks || '';
    commission.createdBy = req.user.id as any;
    await commission.save();

    logAudit(req, {
      action: 'COMMISSION_UPDATE',
      entityType: 'Commission',
      entityId: id,
      summary: `Updated commission record ${id} to amount ₹${commissionAmount}.`
    });

    res.status(200).json({ message: 'Commission record updated successfully', commission });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteCommission = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const commission = await Commission.findById(id);
    if (!commission) {
      return res.status(404).json({ message: 'Commission record not found' });
    }

    await Commission.deleteOne({ _id: id });

    logAudit(req, {
      action: 'COMMISSION_DELETE',
      entityType: 'Commission',
      entityId: id,
      summary: `Deleted commission record ${id}.`
    });

    res.status(200).json({ message: 'Commission record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

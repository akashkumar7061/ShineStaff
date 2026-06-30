import { Response } from 'express';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Job from '../models/Job';
import SalaryRequest from '../models/SalaryRequest';
import { generatePayslipPDF } from '../utils/pdfGenerator';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';

export const getSalaryDashboard = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const workerId = req.user.role === 'admin' ? req.query.workerId : req.user.id;
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7); // YYYY-MM

  if (!workerId) {
    return res.status(400).json({ message: 'Worker ID is required' });
  }

  try {
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Parse month date range
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

    // Attendance logs for this month
    const startStr = `${month}-01`;
    const endStr = `${month}-${new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()}`;
    const attendance = await Attendance.find({
      workerId,
      date: { $gte: startStr, $lte: endStr }
    });

    const presentDays = attendance.filter(a => a.status === 'present').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;

    // Daily wage rules
    const rate = worker.dailySalary || 0;
    const presentEarnings = (presentDays + lateDays) * rate; // Late is paid daily rate but flagged
    const halfDayEarnings = halfDays * (rate / 2);
    const totalWageEarnings = presentEarnings + halfDayEarnings;

    // Fuel allowances from completed jobs in this month
    const completedJobs = await Job.find({
      workerId,
      status: 'completed',
      completedAt: { $gte: start, $lte: end }
    });

    const fuelKms = completedJobs.reduce((acc, job) => acc + (job.fuelKmsTravelled || 0), 0);
    const fuelAllowance = completedJobs.reduce((acc, job) => acc + (job.fuelAllowance || 0), 0);

    // Approved salary advance requests for this month
    const approvedAdvances = await SalaryRequest.find({
      workerId,
      status: 'approved',
      type: 'advance',
      month
    });
    const advanceDeducted = approvedAdvances.reduce((acc, req) => acc + req.amount, 0);

    // Approved regular payouts (if any have been paid by admin already)
    const approvedPayouts = await SalaryRequest.find({
      workerId,
      status: 'approved',
      type: 'regular_payout',
      month
    });
    const paidAmount = approvedPayouts.reduce((acc, req) => acc + req.amount, 0);

    // Gross and Net salary calculations
    const grossEarnings = totalWageEarnings + fuelAllowance;
    const netSalary = Math.max(0, grossEarnings - advanceDeducted);
    const remainingSalary = Math.max(0, netSalary - paidAmount);

    // Calculate today's earnings (present = rate, half-day = rate/2, late = rate, absent = 0, plus today's jobs fuel)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(a => a.date === todayStr);
    let todayWage = 0;
    if (todayAttendance) {
      if (todayAttendance.status === 'present' || todayAttendance.status === 'late') todayWage = rate;
      else if (todayAttendance.status === 'half-day') todayWage = rate / 2;
    }
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const todayJobs = completedJobs.filter(j => j.completedAt && j.completedAt >= todayStart && j.completedAt <= todayEnd);
    const todayFuel = todayJobs.reduce((acc, j) => acc + (j.fuelAllowance || 0), 0);
    const todayEarnings = todayWage + todayFuel;

    res.status(200).json({
      worker: {
        id: worker._id,
        name: worker.name,
        dailySalary: worker.dailySalary,
        company: worker.company
      },
      month,
      counters: {
        present: presentDays,
        late: lateDays,
        halfDay: halfDays,
        absent: absentDays
      },
      earnings: {
        baseWage: totalWageEarnings,
        fuelAllowance,
        advanceDeducted,
        grossEarnings,
        netSalary,
        paidAmount,
        remainingSalary,
        todayEarnings,
        fuelKms
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSalaryRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, workerId } = req.query;
    const filter: any = {};

    if (req.user?.role === 'worker') {
      filter.workerId = req.user.id;
    } else if (workerId) {
      filter.workerId = workerId;
    }

    if (status) filter.status = status;
    if (type) filter.type = type;

    const list = await SalaryRequest.find(filter)
      .populate('workerId', 'name email phone company photo')
      .sort({ createdAt: -1 });

    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createSalaryRequest = async (req: AuthRequest, res: Response) => {
  const { amount, reason, type } = req.body;
  if (!req.user || req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can request advance salary' });
  }

  try {
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Check if worker already has a pending request of the same type this month
    const existingPending = await SalaryRequest.findOne({
      workerId: req.user.id,
      status: 'pending',
      type,
      month
    });

    if (existingPending) {
      return res.status(400).json({
        message: `You already have a pending ${type.replace('_', ' ')} request for this month.`
      });
    }

    const request = new SalaryRequest({
      workerId: req.user.id,
      amount: Number(amount),
      reason,
      type,
      month,
      status: 'pending'
    });

    await request.save();

    // Notify admins via Socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'SALARY_REQUEST',
        message: `New advance request of ₹${amount} submitted by worker.`
      });
    }

    res.status(201).json({ message: 'Salary request submitted successfully', request });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const recordPayout = async (req: AuthRequest, res: Response) => {
  const { workerId, amount, month, type, paymentMode, paymentTime, reason } = req.body;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can record payouts' });
  }

  if (!workerId || !amount || !month) {
    return res.status(400).json({ message: 'Worker ID, amount, and month are required' });
  }

  try {
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const payout = new SalaryRequest({
      workerId,
      amount: Number(amount),
      status: 'approved',
      type: type || 'regular_payout',
      month,
      processedAt: new Date(),
      paymentMode: paymentMode || 'Online',
      paymentTime: paymentTime || new Date().toISOString(),
      reason: reason || ''
    });

    await payout.save();

    res.status(201).json({ message: 'Payout recorded successfully', payout });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const processSalaryRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve/reject salary requests' });
  }

  try {
    const request = await SalaryRequest.findById(id).populate('workerId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = status;
    request.processedAt = new Date();
    await request.save();

    // Socket alert to worker
    const io = getIO();
    if (io) {
      io.to(request.workerId._id.toString()).emit('notification', {
        type: 'SALARY_PAID',
        message: `Your request of ₹${request.amount} has been ${status}.`
      });
    }

    res.status(200).json({ message: `Salary request ${status} successfully`, request });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const downloadPayslip = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const workerId = req.query.workerId as string || req.user.id;
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  try {
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Gather statistics (duplicates the calculation engine in getSalaryDashboard, but for PDF stream)
    const startStr = `${month}-01`;
    const endStr = `${month}-${new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate()}`;
    const attendance = await Attendance.find({
      workerId,
      date: { $gte: startStr, $lte: endStr }
    });

    const presentDays = attendance.filter(a => a.status === 'present').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;

    const rate = worker.dailySalary || 0;
    const totalWageEarnings = (presentDays + lateDays) * rate + halfDays * (rate / 2);

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const completedJobs = await Job.find({
      workerId,
      status: 'completed',
      completedAt: { $gte: start, $lte: end }
    });

    const fuelKms = completedJobs.reduce((acc, job) => acc + (job.fuelKmsTravelled || 0), 0);
    const fuelAllowance = completedJobs.reduce((acc, job) => acc + (job.fuelAllowance || 0), 0);

    const approvedAdvances = await SalaryRequest.find({
      workerId,
      status: 'approved',
      type: 'advance',
      month
    });
    const advanceDeducted = approvedAdvances.reduce((acc, req) => acc + req.amount, 0);

    const grossEarnings = totalWageEarnings + fuelAllowance;
    const netSalary = Math.max(0, grossEarnings - advanceDeducted);

    const payslipData = {
      workerName: worker.name,
      workerId: worker._id.toString(),
      month,
      company: worker.company === 'Both' ? 'SofaShine / CleanCruisers' : worker.company,
      phone: worker.phone,
      dailySalary: rate,
      presentDays,
      halfDays,
      lateDays,
      absentDays,
      fuelKms,
      fuelAllowance,
      advanceDeducted,
      netSalary
    };

    generatePayslipPDF(res, payslipData);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteSalaryRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete payment logs' });
  }

  try {
    const request = await SalaryRequest.findByIdAndDelete(id);
    if (!request) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    res.status(200).json({ message: 'Payment record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

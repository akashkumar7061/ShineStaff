import { Response } from 'express';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Job from '../models/Job';
import SalaryRequest from '../models/SalaryRequest';
import TravelLog from '../models/TravelLog';
import { generatePayslipPDF } from '../utils/pdfGenerator';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../index';
import { logAudit } from '../utils/auditLog';

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
    const rate = worker.dailySalary || Math.round((worker.monthlySalary || 0) / 30);
    const presentEarnings = (presentDays + lateDays) * rate; // Late is paid daily rate but flagged
    const halfDayEarnings = halfDays * (rate / 2);
    const totalWageEarnings = presentEarnings + halfDayEarnings;

    // Fuel allowances from approved travel logs in this month
    const approvedTravelLogs = await TravelLog.find({
      workerId,
      status: 'approved',
      date: { $gte: startStr, $lte: endStr }
    });

    const fuelKms = approvedTravelLogs.reduce((acc, log) => acc + (log.kms || 0), 0);
    const fuelAllowance = approvedTravelLogs.reduce((acc, log) => acc + (log.allowance || 0), 0);

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
    const todayTravelLogs = approvedTravelLogs.filter(log => log.date === todayStr);
    const todayFuel = todayTravelLogs.reduce((acc, log) => acc + (log.allowance || 0), 0);
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

    // Notify worker and admins via Socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'SALARY_REQUEST_CREATED',
        message: `A payout of ₹${payout.amount} was recorded for ${worker.name}.`
      });
      io.to(payout.workerId.toString()).emit('notification', {
        type: 'SALARY_PAID',
        message: `A payout of ₹${payout.amount} was processed/recorded for you.`
      });
    }

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

    logAudit(req, {
      action: status === 'approved' ? 'approved' : 'rejected',
      entityType: 'SalaryRequest',
      entityId: request._id.toString(),
      summary: `${status === 'approved' ? 'Approved' : 'Rejected'} a ₹${request.amount} salary request`
    });

    // Socket alert to worker and admins
    const io = getIO();
    if (io) {
      io.to(request.workerId._id.toString()).emit('notification', {
        type: 'SALARY_PAID',
        message: `Your request of ₹${request.amount} has been ${status}.`
      });
      io.emit('adminNotification', {
        type: 'SALARY_REQUEST_APPROVED',
        message: `Salary request of ₹${request.amount} has been ${status}.`
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

    const rate = worker.dailySalary || Math.round((worker.monthlySalary || 0) / 30);
    const totalWageEarnings = (presentDays + lateDays) * rate + halfDays * (rate / 2);

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const approvedTravelLogs = await TravelLog.find({
      workerId,
      status: 'approved',
      date: { $gte: startStr, $lte: endStr }
    });

    const fuelKms = approvedTravelLogs.reduce((acc, log) => acc + (log.kms || 0), 0);
    const fuelAllowance = approvedTravelLogs.reduce((acc, log) => acc + (log.allowance || 0), 0);

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

    // Notify admins via Socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'SALARY_REQUEST_DELETED',
        message: `Deleted payment record of ₹${request.amount}.`
      });
    }

    res.status(200).json({ message: 'Payment record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateSalaryRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, type, status, paymentMode, paymentTime, reason, month } = req.body;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can edit payment logs' });
  }

  try {
    const request = await SalaryRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (amount !== undefined) request.amount = Number(amount);
    if (type !== undefined) request.type = type;
    if (status !== undefined) request.status = status;
    if (paymentMode !== undefined) request.paymentMode = paymentMode;
    if (paymentTime !== undefined) request.paymentTime = paymentTime;
    if (reason !== undefined) request.reason = reason;
    if (month !== undefined) request.month = month;

    await request.save();

    // Notify admins via Socket
    const io = getIO();
    if (io) {
      io.emit('adminNotification', {
        type: 'SALARY_REQUEST_APPROVED',
        message: `Updated payment record of ₹${request.amount}.`
      });
    }

    res.status(200).json({ message: 'Payment record updated successfully', request });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getBulkSalaryDashboard = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { company, month } = req.query;
  const targetMonth = (month as string) || new Date().toISOString().substring(0, 7);

  try {
    // 1. Fetch workers filtered by company
    const workerFilter: any = { role: 'worker' };
    if (company && company !== 'All') {
      workerFilter.company = company;
    }
    const workers = await User.find(workerFilter);
    const workerIds = workers.map(w => w._id);

    // 2. Fetch all attendance logs for this month
    const startStr = `${targetMonth}-01`;
    const endStr = `${targetMonth}-${new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 0).getDate()}`;
    const attendances = await Attendance.find({
      workerId: { $in: workerIds },
      date: { $gte: startStr, $lte: endStr }
    });

    // 3. Fetch all approved travel logs for this month
    const approvedTravelLogs = await TravelLog.find({
      workerId: { $in: workerIds },
      status: 'approved',
      date: { $gte: startStr, $lte: endStr }
    });

    // 4. Fetch all approved salary requests
    const salaryRequests = await SalaryRequest.find({
      workerId: { $in: workerIds },
      status: 'approved',
      month: targetMonth
    });

    const payrolls = workers.map(worker => {
      const wIdStr = worker._id.toString();

      // Filter logs for this specific worker in-memory
      const workerAttendance = attendances.filter(a => a.workerId.toString() === wIdStr);
      const presentDays = workerAttendance.filter(a => a.status === 'present').length;
      const lateDays = workerAttendance.filter(a => a.status === 'late').length;
      const halfDays = workerAttendance.filter(a => a.status === 'half-day').length;
      const absentDays = workerAttendance.filter(a => a.status === 'absent').length;

      const rate = worker.dailySalary || Math.round((worker.monthlySalary || 0) / 30);
      const presentEarnings = (presentDays + lateDays) * rate;
      const halfDayEarnings = halfDays * (rate / 2);
      const totalWageEarnings = presentEarnings + halfDayEarnings;

      const workerTravel = approvedTravelLogs.filter(t => t.workerId.toString() === wIdStr);
      const fuelKms = workerTravel.reduce((acc, log) => acc + (log.kms || 0), 0);
      const fuelAllowance = workerTravel.reduce((acc, log) => acc + (log.allowance || 0), 0);

      const workerRequests = salaryRequests.filter(sr => sr.workerId.toString() === wIdStr);
      const advanceDeducted = workerRequests.filter(sr => sr.type === 'advance').reduce((acc, r) => acc + r.amount, 0);
      const paidAmount = workerRequests.filter(sr => sr.type === 'regular_payout').reduce((acc, r) => acc + r.amount, 0);

      const grossEarnings = totalWageEarnings + fuelAllowance;
      const netSalary = Math.max(0, grossEarnings - advanceDeducted);
      const remainingSalary = Math.max(0, netSalary - paidAmount);

      // Today's earnings
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = workerAttendance.find(a => a.date === todayStr);
      let todayWage = 0;
      if (todayAttendance) {
        if (todayAttendance.status === 'present' || todayAttendance.status === 'late') todayWage = rate;
        else if (todayAttendance.status === 'half-day') todayWage = rate / 2;
      }
      const todayFuel = workerTravel.filter(t => t.date === todayStr).reduce((acc, t) => acc + (t.allowance || 0), 0);
      const todayEarnings = todayWage + todayFuel;

      return {
        worker: {
          id: worker._id,
          name: worker.name,
          dailySalary: worker.dailySalary || Math.round((worker.monthlySalary || 0) / 30),
          monthlySalary: worker.monthlySalary || ((worker.dailySalary || 0) * 30),
          company: worker.company
        },
        month: targetMonth,
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
      };
    });

    res.status(200).json(payrolls);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

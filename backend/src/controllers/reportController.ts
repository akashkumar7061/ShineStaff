import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import User from '../models/User';
import Job from '../models/Job';
import SalaryRequest from '../models/SalaryRequest';

export const exportAttendanceCSV = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const filter: any = {};
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(filter).populate('workerId', 'name email company');

    let csv = '\ufeffDate,Worker Name,Email,Company,Check-In Time,Status,Edited By Admin,GPS Lat,GPS Lng,Device\n';

    records.forEach((r) => {
      const worker = (r.workerId as any) || {};
      const name = worker.name || 'Deleted Worker';
      const email = worker.email || '';
      const company = worker.company || '';
      const checkInTime = r.checkInTime ? r.checkInTime.toISOString() : '';
      const device = r.deviceInfo ? r.deviceInfo.replace(/"/g, '""') : '';
      csv += `"${r.date}","${name}","${email}","${company}","${checkInTime}","${r.status}",${r.editedByAdmin},${r.location.lat},${r.location.lng},"${device}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const exportWorkerCSV = async (req: Request, res: Response) => {
  try {
    const workers = await User.find({ role: 'worker' });

    let csv = '\ufeffWorker Name,Email,Phone,Company,Status,Joining Date,Address,Aadhaar Number,Daily Wage,Monthly Wage\n';

    workers.forEach((w) => {
      const address = w.address ? w.address.replace(/"/g, '""') : '';
      csv += `"${w.name}","${w.email}","${w.phone}","${w.company}","${w.status}","${w.joiningDate.toISOString().split('T')[0]}","${address}","${w.aadhaarNumber || ''}",${w.dailySalary},${w.monthlySalary}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=workers_report.csv');
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const exportSalaryCSV = async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7); // YYYY-MM
    const workers = await User.find({ role: 'worker', status: 'active' });

    let csv = '\ufeffMonth,Worker Name,Daily Salary Rate,Presents,Half-Days,Lates,Absents,Fuel Allowance,Advance Deducted,Net Payable\n';

    const startStr = `${month}-01`;
    const endStr = `${month}-${new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate()}`;

    for (const w of workers) {
      const attendance = await Attendance.find({
        workerId: w._id,
        date: { $gte: startStr, $lte: endStr }
      });

      const presents = attendance.filter((a) => a.status === 'present').length;
      const lates = attendance.filter((a) => a.status === 'late').length;
      const halfDays = attendance.filter((a) => a.status === 'half-day').length;
      const absents = attendance.filter((a) => a.status === 'absent').length;

      const rate = w.dailySalary || 0;
      const wageEarnings = (presents + lates) * rate + halfDays * (rate / 2);

      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const completedJobs = await Job.find({
        workerId: w._id,
        status: 'completed',
        completedAt: { $gte: start, $lte: end }
      });
      const fuelAllowance = completedJobs.reduce((acc, job) => acc + (job.fuelAllowance || 0), 0);

      const approvedAdvances = await SalaryRequest.find({
        workerId: w._id,
        status: 'approved',
        type: 'advance',
        month
      });
      const advanceDeducted = approvedAdvances.reduce((acc, req) => acc + req.amount, 0);

      const netSalary = Math.max(0, wageEarnings + fuelAllowance - advanceDeducted);

      csv += `"${month}","${w.name}",${rate},${presents},${halfDays},${lates},${absents},${fuelAllowance},${advanceDeducted},${netSalary}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=salary_report_${month}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const exportPhotoCSV = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find({ status: 'completed' }).populate('workerId', 'name');

    let csv = '\ufeffJob Title,Company,Worker Name,Client,Before Photo URL,Before GPS,Before Time,After Photo URL,After GPS,After Time\n';

    jobs.forEach((j) => {
      const workerName = (j.workerId as any)?.name || 'Deleted Worker';
      const beforeGPS = j.beforePhotoGPS ? `"${j.beforePhotoGPS.lat} | ${j.beforePhotoGPS.lng}"` : '""';
      const beforeTime = j.beforePhotoTime ? j.beforePhotoTime.toISOString() : '';
      const afterGPS = j.afterPhotoGPS ? `"${j.afterPhotoGPS.lat} | ${j.afterPhotoGPS.lng}"` : '""';
      const afterTime = j.afterPhotoTime ? j.afterPhotoTime.toISOString() : '';

      csv += `"${j.title}","${j.company}","${workerName}","${j.clientName}","${j.beforePhoto || ''}",${beforeGPS},"${beforeTime}","${j.afterPhoto || ''}",${afterGPS},"${afterTime}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=photo_compliance_report.csv');
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

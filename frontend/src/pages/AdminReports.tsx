import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Users,
  Calendar,
  DollarSign,
  Camera,
  Database
} from 'lucide-react';
import api from '../utils/api';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const convertToCSV = (data: any) => {
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    str = str.replace(/"/g, '""');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str}"`;
    }
    return str;
  };

  let csvContent = '\uFEFF';

  // 1. Jobs Table
  csvContent += '--- JOBS MASTER TABLE ---\r\n';
  csvContent += 'Job ID,Title,Company,Client Name,Client Phone,Address,Price (INR),Date,Time Slot,Status,Worker Name,Worker Phone,Payment Status,Payment Mode,Rating,Landmark,City,Pincode\r\n';
  (data.jobs || []).forEach((j: any) => {
    csvContent += `${escapeCSV(j._id)},${escapeCSV(j.title)},${escapeCSV(j.company)},${escapeCSV(j.clientName)},${escapeCSV(j.clientPhone)},${escapeCSV(j.address)},${j.price || 0},${escapeCSV(j.date)},${escapeCSV(j.timeSlot)},${escapeCSV(j.status)},${escapeCSV(j.workerId?.name)},${escapeCSV(j.workerId?.phone)},${escapeCSV(j.paymentStatus)},${escapeCSV(j.paymentMode)},${j.rating || ''},${escapeCSV(j.landmark)},${escapeCSV(j.city)},${escapeCSV(j.pincode)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 2. Expenses Table
  csvContent += '--- EXPENSES MASTER TABLE ---\r\n';
  csvContent += 'Expense ID,Date,Category,Description,Amount (INR)\r\n';
  (data.expenses || []).forEach((e: any) => {
    csvContent += `${escapeCSV(e._id)},${escapeCSV(e.date)},${escapeCSV(e.category?.toUpperCase())},${escapeCSV(e.description)},${e.amount || 0}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 3. Workers Table
  csvContent += '--- WORKERS MASTER TABLE ---\r\n';
  csvContent += 'Worker ID,Name,Email,Phone,Role,Company,Status,Joining Date,Daily Salary,Monthly Salary,Address,Aadhaar Number\r\n';
  (data.workers || []).forEach((w: any) => {
    const joinDate = w.joiningDate ? new Date(w.joiningDate).toISOString().split('T')[0] : '';
    csvContent += `${escapeCSV(w._id)},${escapeCSV(w.name)},${escapeCSV(w.email)},${escapeCSV(w.phone)},${escapeCSV(w.role)},${escapeCSV(w.company)},${escapeCSV(w.status)},${escapeCSV(joinDate)},${w.dailySalary || 0},${w.monthlySalary || 0},${escapeCSV(w.address)},${escapeCSV(w.aadhaarNumber)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 4. Attendance Table
  csvContent += '--- ATTENDANCE MASTER TABLE ---\r\n';
  csvContent += 'Log ID,Date,Worker Name,Worker Phone,Status,Check In Time,Device,Latitude,Longitude,Late Reason\r\n';
  (data.attendance || []).forEach((a: any) => {
    const checkIn = a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('en-IN') : '';
    csvContent += `${escapeCSV(a._id)},${escapeCSV(a.date)},${escapeCSV(a.workerId?.name)},${escapeCSV(a.workerId?.phone)},${escapeCSV(a.status)},${escapeCSV(checkIn)},${escapeCSV(a.deviceInfo)},${a.location?.lat || ''},${a.location?.lng || ''},${escapeCSV(a.lateReason)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 5. Leaves Table
  csvContent += '--- LEAVES MASTER TABLE ---\r\n';
  csvContent += 'Leave ID,Worker Name,Worker Phone,Start Date,End Date,Reason,Status\r\n';
  (data.leaves || []).forEach((l: any) => {
    const start = l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : '';
    const end = l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : '';
    csvContent += `${escapeCSV(l._id)},${escapeCSV(l.workerId?.name)},${escapeCSV(l.workerId?.phone)},${escapeCSV(start)},${escapeCSV(end)},${escapeCSV(l.reason)},${escapeCSV(l.status)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 6. Salary Requests Table
  csvContent += '--- SALARY REQUESTS & PAYOUTS MASTER TABLE ---\r\n';
  csvContent += 'Request ID,Worker Name,Worker Phone,Amount (INR),Type,Month,Status,Payment Mode,Payment Time,Reason\r\n';
  (data.salaryRequests || []).forEach((sr: any) => {
    csvContent += `${escapeCSV(sr._id)},${escapeCSV(sr.workerId?.name)},${escapeCSV(sr.workerId?.phone)},${sr.amount || 0},${escapeCSV(sr.type)},${escapeCSV(sr.month)},${escapeCSV(sr.status)},${escapeCSV(sr.paymentMode)},${escapeCSV(sr.paymentTime)},${escapeCSV(sr.reason)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 7. Travel Logs Table
  csvContent += '--- FUEL & TRAVEL REIMBURSEMENTS MASTER TABLE ---\r\n';
  csvContent += 'Log ID,Worker Name,Worker Phone,Date,Type,KMs,Allowance (INR),Status,From Location,To Location\r\n';
  (data.travelLogs || []).forEach((tl: any) => {
    csvContent += `${escapeCSV(tl._id)},${escapeCSV(tl.workerId?.name)},${escapeCSV(tl.workerId?.phone)},${escapeCSV(tl.date)},${escapeCSV(tl.type)},${tl.kms || 0},${tl.allowance || 0},${escapeCSV(tl.status)},${escapeCSV(tl.fromLocation)},${escapeCSV(tl.toLocation)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 8. Commissions Table
  csvContent += '--- COMMISSIONS MASTER TABLE ---\r\n';
  csvContent += 'Commission ID,Worker Name,Worker Phone,Company,Client Name,Job Date,Work Amount,Commission Amount,Remarks\r\n';
  (data.commissions || []).forEach((c: any) => {
    csvContent += `${escapeCSV(c._id)},${escapeCSV(c.workerId?.name)},${escapeCSV(c.workerId?.phone)},${escapeCSV(c.company)},${escapeCSV(c.clientName)},${escapeCSV(c.jobDate)},${c.workAmount || 0},${c.commissionAmount || 0},${escapeCSV(c.remarks)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 9. Service Reminders Table
  csvContent += '--- SERVICE REMINDERS MASTER TABLE ---\r\n';
  csvContent += 'Reminder ID,Service Name,Reminder Date,Sent Date,Status,Message Text,Error Message\r\n';
  (data.serviceReminders || []).forEach((sr: any) => {
    const remDate = sr.reminderDate ? new Date(sr.reminderDate).toISOString().split('T')[0] : '';
    const sentDate = sr.sentDate ? new Date(sr.sentDate).toISOString().split('T')[0] : '';
    csvContent += `${escapeCSV(sr._id)},${escapeCSV(sr.serviceName)},${escapeCSV(remDate)},${escapeCSV(sentDate)},${escapeCSV(sr.status)},${escapeCSV(sr.messageText)},${escapeCSV(sr.errorMessage)}\r\n`;
  });
  csvContent += '\r\n\r\n';

  // 10. WhatsApp Campaigns Table
  csvContent += '--- WHATSAPP CAMPAIGNS MASTER TABLE ---\r\n';
  csvContent += 'Campaign ID,Name,Message Text,Recipients Count,Status,Scheduled Time,Sent Time\r\n';
  (data.whatsAppCampaigns || []).forEach((wc: any) => {
    const sched = wc.scheduledTime ? new Date(wc.scheduledTime).toISOString() : '';
    const sent = wc.sentTime ? new Date(wc.sentTime).toISOString() : '';
    csvContent += `${escapeCSV(wc._id)},${escapeCSV(wc.name)},${escapeCSV(wc.messageText)},${wc.recipientsCount || 0},${escapeCSV(wc.status)},${escapeCSV(sched)},${escapeCSV(sent)}\r\n`;
  });

  return csvContent;
};

const AdminReports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // YYYY-MM
  });
  const [startDate, setStartDate] = useState(getTodayString);
  const [endDate, setEndDate] = useState(getTodayString);
  const [downloading, setDownloading] = useState(false);

  const downloadMasterDataCSV = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/bi/export-all');
      const csvData = convertToCSV(response.data);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shinestaff_master_database_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download database dump: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloading(false);
    }
  };

  const triggerDownload = (reportType: 'attendance' | 'workers' | 'salary' | 'photos' | 'master-data') => {
    if (reportType === 'master-data') {
      downloadMasterDataCSV();
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let url = `/api/reports/${reportType}?token=${token}`;

    if (reportType === 'attendance' && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    if (reportType === 'salary') {
      url += `&month=${selectedMonth}`;
    }

    window.open(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Export Management Reports</h2>
        <p className="text-xs text-slate-400 mt-0.5">Generate and download Excel-compatible CSV files of system registries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Attendance Report Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Registry</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Clock-in Logs Export</h3>
              <p className="text-xs text-slate-455">Downloads worker names, check-in times, statuses (late/half-day), device specs, and GPS coordinates.</p>
            </div>
            <div className="rounded-xl bg-success/10 text-success p-2.5">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <button
            onClick={() => triggerDownload('attendance')}
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            <span>Download Attendance Report</span>
          </button>
        </div>

        {/* 2. Salary Payroll Report Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payroll Spreadsheets</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Monthly Payouts Export</h3>
              <p className="text-xs text-slate-455">Downloads worker aggregates including daily wage rates, days present, fuel allowances, and final net payable salaries.</p>
            </div>
            <div className="rounded-xl bg-secondary/10 text-secondary p-2.5">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Payout Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none text-slate-700 dark:text-slate-200"
            />
          </div>

          <button
            onClick={() => triggerDownload('salary')}
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            <span>Download Salary Report</span>
          </button>
        </div>

        {/* 3. Worker Directory Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Worker Roster</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Employees Directory Export</h3>
              <p className="text-xs text-slate-455">Downloads active worker contact lists, phone/email, Aadhaar numbers, joining dates, and home addresses.</p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 text-indigo-500 p-2.5">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <button
            onClick={() => triggerDownload('workers')}
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            <span>Download Employee Directory</span>
          </button>
        </div>

        {/* 4. Photo Compliance Report Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quality Compliance Audit</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Before & After Photo logs</h3>
              <p className="text-xs text-slate-455">Downloads job lists with links to the uploaded Before/After camera captures, verified GPS coordinates, and completion timestamps.</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 text-amber-500 p-2.5">
              <Camera className="h-5 w-5" />
            </div>
          </div>

          <button
            onClick={() => triggerDownload('photos')}
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            <span>Download Photo Logs</span>
          </button>
        </div>

        {/* 5. Master Database Analytics Dump Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Backup & Analytics</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Master Data Dump (Excel/CSV)</h3>
              <p className="text-xs text-slate-455">Downloads a complete raw database snapshot (all bookings, expenses, worker logs, checklist items, and campaigns) in Excel-compatible CSV format for offline Power BI or spreadsheet analysis.</p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 text-indigo-500 p-2.5">
              <Database className="h-5 w-5" />
            </div>
          </div>

          <button
            onClick={() => triggerDownload('master-data')}
            disabled={downloading}
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold disabled:opacity-50"
          >
            {downloading ? (
              <span className="animate-pulse">Preparing Excel Export...</span>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Master Database Dump</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};

export default AdminReports;

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Users,
  Calendar,
  DollarSign,
  Camera,
  Database,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import api from '../utils/api';
import { exportCustomersToExcel, exportCustomersToCSV, type CustomerExportItem } from '../utils/exportCustomerData';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
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
  csvContent += '--- JOBS & CUSTOMERS MASTER TABLE ---\r\n';
  csvContent += 'Job ID,Customer Name,Phone Number,Alternate Phone,Email,Address,Landmark,City,Pincode,GPS Latitude,GPS Longitude,Google Maps Link,Service Clean,Company,Price (INR),Job Date,Time Slot,Status,Cancellation Reason,Work Started At,Work Completed At,Payment Status,Payment Mode,Assigned Staff,Staff Phone,Rating,Customer Notes\r\n';
  (data.jobs || []).forEach((j: any) => {
    const lat = j.location?.lat ? String(j.location.lat) : '';
    const lng = j.location?.lng ? String(j.location.lng) : '';
    const mapsUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : (j.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}` : '');
    const started = j.startedAt ? new Date(j.startedAt).toLocaleString('en-IN') : '';
    const completed = j.completedAt ? new Date(j.completedAt).toLocaleString('en-IN') : '';

    csvContent += `${escapeCSV(j._id)},${escapeCSV(j.clientName)},${escapeCSV(j.clientPhone)},${escapeCSV(j.alternatePhone)},${escapeCSV(j.clientEmail)},${escapeCSV(j.address)},${escapeCSV(j.landmark)},${escapeCSV(j.city)},${escapeCSV(j.pincode)},${escapeCSV(lat)},${escapeCSV(lng)},${escapeCSV(mapsUrl)},${escapeCSV(j.title)},${escapeCSV(j.company)},${j.price || 0},${escapeCSV(j.date)},${escapeCSV(j.timeSlot)},${escapeCSV(j.status)},${escapeCSV(j.cancelReason)},${escapeCSV(started)},${escapeCSV(completed)},${escapeCSV(j.paymentStatus)},${escapeCSV(j.paymentMode)},${escapeCSV(j.workerId?.name)},${escapeCSV(j.workerId?.phone)},${escapeCSV(j.rating)},${escapeCSV(j.notes || j.specialInstructions)}\r\n`;
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

  // Customer Export Specific State
  const [customerPreset, setCustomerPreset] = useState('all-time');
  const [customerStartDate, setCustomerStartDate] = useState(getPastDateString(30));
  const [customerEndDate, setCustomerEndDate] = useState(getTodayString());
  const [customerStatus, setCustomerStatus] = useState('all');
  const [customerCompany, setCustomerCompany] = useState('all');
  const [exportingCustomer, setExportingCustomer] = useState<'excel' | 'csv' | null>(null);

  const handleCustomerPresetChange = (p: string) => {
    setCustomerPreset(p);
    const today = getTodayString();
    
    if (p === 'today') {
      setCustomerStartDate(today);
      setCustomerEndDate(today);
    } else if (p === 'yesterday') {
      const yesterday = getPastDateString(1);
      setCustomerStartDate(yesterday);
      setCustomerEndDate(yesterday);
    } else if (p === 'last-7') {
      setCustomerStartDate(getPastDateString(7));
      setCustomerEndDate(today);
    } else if (p === 'this-month') {
      const d = new Date();
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setCustomerStartDate(firstDay);
      setCustomerEndDate(today);
    } else if (p === 'last-month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      setCustomerStartDate(firstDay);
      setCustomerEndDate(lastDay);
    }
  };

  const handleExportCustomers = async (format: 'excel' | 'csv') => {
    setExportingCustomer(format);
    try {
      // Fetch jobs / customers from backend
      const params: any = {};
      if (customerPreset !== 'all-time') {
        params.startDate = customerStartDate;
        params.endDate = customerEndDate;
      }
      if (customerStatus !== 'all') {
        params.status = customerStatus;
      }
      if (customerCompany !== 'all') {
        params.company = customerCompany;
      }

      // Fetch all jobs
      const response = await api.get('/bi/export-all');
      let jobs: CustomerExportItem[] = response.data.jobs || [];

      // Filter based on UI filters
      if (customerPreset !== 'all-time') {
        jobs = jobs.filter((j) => {
          if (!j.date) return false;
          const cleanDate = typeof j.date === 'string' ? j.date.split('T')[0] : new Date(j.date).toISOString().split('T')[0];
          return cleanDate >= customerStartDate && cleanDate <= customerEndDate;
        });
      }

      if (customerStatus !== 'all') {
        jobs = jobs.filter((j) => (j.status || '').toLowerCase() === customerStatus.toLowerCase());
      }

      if (customerCompany !== 'all') {
        jobs = jobs.filter((j) => j.company === customerCompany);
      }

      if (jobs.length === 0) {
        alert('No customer records found matching the selected filters.');
        return;
      }

      const dateTag = customerPreset === 'all-time' ? 'all_records' : `${customerStartDate}_to_${customerEndDate}`;
      const prefix = `shinestaff_customers_${customerStatus}_${dateTag}`;

      if (format === 'excel') {
        exportCustomersToExcel(jobs, prefix);
      } else {
        exportCustomersToCSV(jobs, prefix);
      }
    } catch (err: any) {
      alert('Failed to export customer data: ' + (err.response?.data?.message || err.message));
    } finally {
      setExportingCustomer(null);
    }
  };

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
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-secondary/5 rounded-full blur-2xl" />
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 text-secondary" />
            <span>Export Management & Excel Reports</span>
          </h2>
          <p className="text-xs text-slate-400">Download formatted Microsoft Excel (.xlsx) spreadsheets & CSV datasets with customer addresses, GPS links, dates, and status ledger.</p>
        </div>
      </div>

      {/* 🌟 FEATURED SECTION: Customer Data & Booking History Exporter (Excel & CSV) */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border-2 border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 via-slate-50/50 to-white dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-slate-900 shadow-lg space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/10 dark:border-emerald-500/15">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              <span>Customer Master Directory & Ledger</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              📊 Export Customer Data (Excel & CSV)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Includes: <strong>Customer Name, Phone, Address, Landmark, GPS Coordinates, Clickable Google Maps Link, Service Clean, Amount (₹), Date & Time, Completed/Cancelled Status, Reason, Payment Status</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => handleExportCustomers('excel')}
              disabled={exportingCustomer !== null}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl px-5 py-3 transition-all cursor-pointer shadow-md hover:shadow-emerald-600/25 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              <span>{exportingCustomer === 'excel' ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={() => handleExportCustomers('csv')}
              disabled={exportingCustomer !== null}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl px-4 py-3 transition-all cursor-pointer shadow-md hover:shadow-blue-600/25 disabled:opacity-50"
            >
              <Download className="h-4.5 w-4.5" />
              <span>{exportingCustomer === 'csv' ? 'Generating CSV...' : 'Export CSV (.csv)'}</span>
            </button>
          </div>
        </div>

        {/* Customer Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Quick Date Range Preset */}
          <div>
            <label className="block text-[9.5px] uppercase tracking-wider text-slate-500 font-black mb-1.5">
              📅 Date Period Filter:
            </label>
            <select
              value={customerPreset}
              onChange={(e) => handleCustomerPresetChange(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-emerald-500 dark:text-white shadow-sm"
            >
              <option value="all-time">All Time (All Customer Records)</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-7">Last 7 Days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Job Status Filter */}
          <div>
            <label className="block text-[9.5px] uppercase tracking-wider text-slate-500 font-black mb-1.5">
              🎯 Job Status:
            </label>
            <select
              value={customerStatus}
              onChange={(e) => setCustomerStatus(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-emerald-500 dark:text-white shadow-sm"
            >
              <option value="all">All Jobs & Bookings</option>
              <option value="completed">Completed Only (काम पूरा हुआ ✅)</option>
              <option value="cancelled">Cancelled Only (रद्द हुआ ❌)</option>
              <option value="started">In Progress Only (चल रहा है ⏳)</option>
              <option value="pending">Confirmed / Pending Only (कन्फर्म्ड 📋)</option>
            </select>
          </div>

          {/* Company Brand Filter */}
          <div>
            <label className="block text-[9.5px] uppercase tracking-wider text-slate-500 font-black mb-1.5">
              🏢 Company Brand:
            </label>
            <select
              value={customerCompany}
              onChange={(e) => setCustomerCompany(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-emerald-500 dark:text-white shadow-sm"
            >
              <option value="all">Both Brands (SofaShine & CleanCruisers)</option>
              <option value="SofaShine">SofaShine Only</option>
              <option value="CleanCruisers">CleanCruisers Only</option>
            </select>
          </div>

          {/* Custom Date Inputs if custom selected */}
          {customerPreset === 'custom' ? (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">From:</label>
                <input
                  type="date"
                  value={customerStartDate}
                  onChange={(e) => setCustomerStartDate(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-emerald-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">To:</label>
                <input
                  type="date"
                  value={customerEndDate}
                  onChange={(e) => setCustomerEndDate(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-emerald-500 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span>Ready to Export {customerPreset.replace('-', ' ').toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Other Reports */}
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
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold cursor-pointer"
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
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold cursor-pointer"
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
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold cursor-pointer"
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
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download Photo Logs</span>
          </button>
        </div>

        {/* 5. Master Database Analytics Dump Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6 md:col-span-2">
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
            className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3 text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {downloading ? (
              <span className="animate-pulse">Preparing Excel Export...</span>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Master Database Dump (CSV)</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};

export default AdminReports;

import React, { useState } from 'react';
import {
  Database,
  Download,
  Briefcase,
  DollarSign,
  Users,
  CheckCircle2,
  Calendar,
  Compass,
  History,
  MessageSquare,
  Clock,
  Award,
  Sparkles
} from 'lucide-react';
import api from '../utils/api';

const escapeCSV = (val: any) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  str = str.replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
};

const AdminDatabaseBackup: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  // Individual Table Exporters
  const exportJobs = (jobs: any[]) => {
    let csv = '\uFEFF';
    csv += 'Job ID,Title,Company,Client Name,Client Phone,Address,Price (INR),Date,Time Slot,Status,Worker Name,Worker Phone,Payment Status,Payment Mode,Rating,Landmark,City,Pincode\r\n';
    jobs.forEach((j) => {
      csv += `${escapeCSV(j._id)},${escapeCSV(j.title)},${escapeCSV(j.company)},${escapeCSV(j.clientName)},${escapeCSV(j.clientPhone)},${escapeCSV(j.address)},${j.price || 0},${escapeCSV(j.date)},${escapeCSV(j.timeSlot)},${escapeCSV(j.status)},${escapeCSV(j.workerId?.name)},${escapeCSV(j.workerId?.phone)},${escapeCSV(j.paymentStatus)},${escapeCSV(j.paymentMode)},${j.rating || ''},${escapeCSV(j.landmark)},${escapeCSV(j.city)},${escapeCSV(j.pincode)}\r\n`;
    });
    return csv;
  };

  const exportExpenses = (expenses: any[]) => {
    let csv = '\uFEFF';
    csv += 'Expense ID,Date,Category,Description,Amount (INR)\r\n';
    expenses.forEach((e) => {
      csv += `${escapeCSV(e._id)},${escapeCSV(e.date)},${escapeCSV(e.category?.toUpperCase())},${escapeCSV(e.description)},${e.amount || 0}\r\n`;
    });
    return csv;
  };

  const exportWorkers = (workers: any[]) => {
    let csv = '\uFEFF';
    csv += 'Worker ID,Name,Email,Phone,Role,Company,Status,Joining Date,Daily Salary,Monthly Salary,Address,Aadhaar Number\r\n';
    workers.forEach((w) => {
      const joinDate = w.joiningDate ? new Date(w.joiningDate).toISOString().split('T')[0] : '';
      csv += `${escapeCSV(w._id)},${escapeCSV(w.name)},${escapeCSV(w.email)},${escapeCSV(w.phone)},${escapeCSV(w.role)},${escapeCSV(w.company)},${escapeCSV(w.status)},${escapeCSV(joinDate)},${w.dailySalary || 0},${w.monthlySalary || 0},${escapeCSV(w.address)},${escapeCSV(w.aadhaarNumber)}\r\n`;
    });
    return csv;
  };

  const exportAttendance = (attendance: any[]) => {
    let csv = '\uFEFF';
    csv += 'Log ID,Date,Worker Name,Worker Phone,Status,Check In Time,Device,Latitude,Longitude,Late Reason\r\n';
    attendance.forEach((a) => {
      const checkIn = a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('en-IN') : '';
      csv += `${escapeCSV(a._id)},${escapeCSV(a.date)},${escapeCSV(a.workerId?.name)},${escapeCSV(a.workerId?.phone)},${escapeCSV(a.status)},${escapeCSV(checkIn)},${escapeCSV(a.deviceInfo)},${a.location?.lat || ''},${a.location?.lng || ''},${escapeCSV(a.lateReason)}\r\n`;
    });
    return csv;
  };

  const exportLeaves = (leaves: any[]) => {
    let csv = '\uFEFF';
    csv += 'Leave ID,Worker Name,Worker Phone,Start Date,End Date,Reason,Status\r\n';
    leaves.forEach((l) => {
      const start = l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : '';
      const end = l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : '';
      csv += `${escapeCSV(l._id)},${escapeCSV(l.workerId?.name)},${escapeCSV(l.workerId?.phone)},${escapeCSV(start)},${escapeCSV(end)},${escapeCSV(l.reason)},${escapeCSV(l.status)}\r\n`;
    });
    return csv;
  };

  const exportSalaryRequests = (salaryRequests: any[]) => {
    let csv = '\uFEFF';
    csv += 'Request ID,Worker Name,Worker Phone,Amount (INR),Type,Month,Status,Payment Mode,Payment Time,Reason\r\n';
    salaryRequests.forEach((sr) => {
      csv += `${escapeCSV(sr._id)},${escapeCSV(sr.workerId?.name)},${escapeCSV(sr.workerId?.phone)},${sr.amount || 0},${escapeCSV(sr.type)},${escapeCSV(sr.month)},${escapeCSV(sr.status)},${escapeCSV(sr.paymentMode)},${escapeCSV(sr.paymentTime)},${escapeCSV(sr.reason)}\r\n`;
    });
    return csv;
  };

  const exportTravelLogs = (travelLogs: any[]) => {
    let csv = '\uFEFF';
    csv += 'Log ID,Worker Name,Worker Phone,Date,Type,KMs,Allowance (INR),Status,From Location,To Location\r\n';
    travelLogs.forEach((tl) => {
      csv += `${escapeCSV(tl._id)},${escapeCSV(tl.workerId?.name)},${escapeCSV(tl.workerId?.phone)},${escapeCSV(tl.date)},${escapeCSV(tl.type)},${tl.kms || 0},${tl.allowance || 0},${escapeCSV(tl.status)},${escapeCSV(tl.fromLocation)},${escapeCSV(tl.toLocation)}\r\n`;
    });
    return csv;
  };

  const exportCommissions = (commissions: any[]) => {
    let csv = '\uFEFF';
    csv += 'Commission ID,Worker Name,Worker Phone,Company,Client Name,Job Date,Work Amount,Commission Amount,Remarks\r\n';
    commissions.forEach((c) => {
      csv += `${escapeCSV(c._id)},${escapeCSV(c.workerId?.name)},${escapeCSV(c.workerId?.phone)},${escapeCSV(c.company)},${escapeCSV(c.clientName)},${escapeCSV(c.jobDate)},${c.workAmount || 0},${c.commissionAmount || 0},${escapeCSV(c.remarks)}\r\n`;
    });
    return csv;
  };

  const exportServiceReminders = (serviceReminders: any[]) => {
    let csv = '\uFEFF';
    csv += 'Reminder ID,Service Name,Reminder Date,Sent Date,Status,Message Text,Error Message\r\n';
    serviceReminders.forEach((sr) => {
      const remDate = sr.reminderDate ? new Date(sr.reminderDate).toISOString().split('T')[0] : '';
      const sentDate = sr.sentDate ? new Date(sr.sentDate).toISOString().split('T')[0] : '';
      csv += `${escapeCSV(sr._id)},${escapeCSV(sr.serviceName)},${escapeCSV(remDate)},${escapeCSV(sentDate)},${escapeCSV(sr.status)},${escapeCSV(sr.messageText)},${escapeCSV(sr.errorMessage)}\r\n`;
    });
    return csv;
  };

  const exportWhatsAppCampaigns = (whatsAppCampaigns: any[]) => {
    let csv = '\uFEFF';
    csv += 'Campaign ID,Name,Message Text,Recipients Count,Status,Scheduled Time,Sent Time\r\n';
    whatsAppCampaigns.forEach((wc) => {
      const sched = wc.scheduledTime ? new Date(wc.scheduledTime).toISOString() : '';
      const sent = wc.sentTime ? new Date(wc.sentTime).toISOString() : '';
      csv += `${escapeCSV(wc._id)},${escapeCSV(wc.name)},${escapeCSV(wc.messageText)},${wc.recipientsCount || 0},${escapeCSV(wc.status)},${escapeCSV(sched)},${escapeCSV(sent)}\r\n`;
    });
    return csv;
  };

  const exportAuditLogs = (auditLogs: any[]) => {
    let csv = '\uFEFF';
    csv += 'Log ID,Date,Admin Name,Action,Entity Type,Entity ID,Summary,Status,Device,IP Address\r\n';
    auditLogs.forEach((al) => {
      const date = al.createdAt ? new Date(al.createdAt).toLocaleString('en-IN') : '';
      csv += `${escapeCSV(al._id)},${escapeCSV(date)},${escapeCSV(al.adminId?.name)},${escapeCSV(al.action)},${escapeCSV(al.entityType)},${escapeCSV(al.entityId)},${escapeCSV(al.summary)},${escapeCSV(al.status)},${escapeCSV(al.device)},${escapeCSV(al.ipAddress)}\r\n`;
    });
    return csv;
  };

  const triggerDownload = async (section: string) => {
    setDownloading(section);
    try {
      const response = await api.get('/bi/export-all');
      const data = response.data;
      let csvData = '';
      let filename = `shinestaff_${section}_export_${new Date().toISOString().split('T')[0]}.csv`;

      switch (section) {
        case 'jobs':
          csvData = exportJobs(data.jobs || []);
          break;
        case 'expenses':
          csvData = exportExpenses(data.expenses || []);
          break;
        case 'workers':
          csvData = exportWorkers(data.workers || []);
          break;
        case 'attendance':
          csvData = exportAttendance(data.attendance || []);
          break;
        case 'leaves':
          csvData = exportLeaves(data.leaves || []);
          break;
        case 'salary':
          csvData = exportSalaryRequests(data.salaryRequests || []);
          break;
        case 'travel':
          csvData = exportTravelLogs(data.travelLogs || []);
          break;
        case 'commissions':
          csvData = exportCommissions(data.commissions || []);
          break;
        case 'reminders':
          csvData = exportServiceReminders(data.serviceReminders || []);
          break;
        case 'campaigns':
          csvData = exportWhatsAppCampaigns(data.whatsAppCampaigns || []);
          break;
        case 'audit-logs':
          csvData = exportAuditLogs(data.auditLogs || []);
          break;
        case 'master-dump':
          // Consolidated CSV including all tables sequentially
          csvData = '\uFEFF';
          csvData += exportJobs(data.jobs || []) + '\r\n\r\n';
          csvData += exportExpenses(data.expenses || []) + '\r\n\r\n';
          csvData += exportWorkers(data.workers || []) + '\r\n\r\n';
          csvData += exportAttendance(data.attendance || []) + '\r\n\r\n';
          csvData += exportLeaves(data.leaves || []) + '\r\n\r\n';
          csvData += exportSalaryRequests(data.salaryRequests || []) + '\r\n\r\n';
          csvData += exportTravelLogs(data.travelLogs || []) + '\r\n\r\n';
          csvData += exportCommissions(data.commissions || []) + '\r\n\r\n';
          csvData += exportServiceReminders(data.serviceReminders || []) + '\r\n\r\n';
          csvData += exportWhatsAppCampaigns(data.whatsAppCampaigns || []) + '\r\n\r\n';
          csvData += exportAuditLogs(data.auditLogs || []);
          filename = `shinestaff_master_consolidated_export_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          break;
      }

      if (csvData) {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert('Failed to download section data: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloading(null);
    }
  };

  const sectionsList = [
    { id: 'jobs', name: 'Clean Bookings', desc: 'Raw booking details, landmarks, pricing, and job states.', icon: Briefcase, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { id: 'expenses', name: 'Custom Expenses', desc: 'Consumables, rents, material purchases, marketing, and office bills.', icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { id: 'workers', name: 'Workers Directory', desc: 'Active staff details, aadhaar data, joining logs, salary formulas.', icon: Users, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    { id: 'attendance', name: 'Attendance Sheets', desc: 'Staff clock-in times, coordinates, device signatures, late reasons.', icon: CheckCircle2, color: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20' },
    { id: 'leaves', name: 'Leaves Registry', desc: 'Leave requests history, reasons, dates, and approvals.', icon: Calendar, color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
    { id: 'salary', name: 'Payroll & Salaries', desc: 'Salary payouts and advances logs, statuses, payout modes.', icon: Clock, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { id: 'travel', name: 'Commutes & Travel', desc: 'Worker mileage kms logs, coordinates, and fuel allowance approvals.', icon: Compass, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { id: 'commissions', name: 'Staff Commissions', desc: 'Worker incentive bonuses logged per job id.', icon: Award, color: 'bg-indigo-650/10 text-indigo-650 border-indigo-650/20' },
    { id: 'reminders', name: 'Service Reminders', desc: 'Pending/sent WhatsApp reminders logs to past clients.', icon: Clock, color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
    { id: 'campaigns', name: 'WhatsApp Campaigns', desc: 'Bulk messaging campaigns metrics, recipient stats, and dates.', icon: MessageSquare, color: 'bg-teal-600/10 text-teal-600 border-teal-600/20' },
    { id: 'audit-logs', name: 'System Audit Logs', desc: 'Security audit registry, actions performed by admins, login devices.', icon: History, color: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <Database className="h-6 w-6 text-indigo-500" />
            <span>Database Backup & Advanced Analytics</span>
          </h2>
          <p className="text-xs text-slate-400">Download separate database collections in clean, Excel-compatible CSV spreadsheets for custom data modeling and reporting.</p>
        </div>

        <button
          onClick={() => triggerDownload('master-dump')}
          disabled={downloading !== null}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 py-3 transition-all cursor-pointer shadow-md disabled:opacity-50 relative z-10 shrink-0"
        >
          {downloading === 'master-dump' ? (
            <span className="animate-pulse">Building Full Database Dump...</span>
          ) : (
            <>
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              <span>Export Complete Database (CSV)</span>
            </>
          )}
        </button>
      </div>

      {/* Grid of collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectionsList.map((sec) => {
          const Icon = sec.icon;
          const isProcessing = downloading === sec.id;
          return (
            <div key={sec.id} className="glass-card p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-start justify-between space-x-4">
                <div className="space-y-1.5 min-w-0">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Collection Data</span>
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 truncate">{sec.name}</h3>
                  <p className="text-xs text-slate-455 leading-relaxed">{sec.desc}</p>
                </div>
                <div className={`rounded-xl p-2.5 shrink-0 border ${sec.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <button
                onClick={() => triggerDownload(sec.id)}
                disabled={downloading !== null}
                className="w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Loading CSV...</span>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-slate-400" />
                    <span>Download CSV Spreadsheet</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default AdminDatabaseBackup;

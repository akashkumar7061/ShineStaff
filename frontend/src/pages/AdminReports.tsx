import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Users,
  Calendar,
  DollarSign,
  Camera
} from 'lucide-react';

const AdminReports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // YYYY-MM
  });
  const [filterDate, setFilterDate] = useState('');

  const triggerDownload = (reportType: 'attendance' | 'workers' | 'salary' | 'photos') => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let url = `/api/reports/${reportType}?token=${token}`;

    if (reportType === 'attendance' && filterDate) {
      url += `&startDate=${filterDate}&endDate=${filterDate}`;
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

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none text-slate-700 dark:text-slate-200"
            />
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

      </div>

    </div>
  );
};

export default AdminReports;

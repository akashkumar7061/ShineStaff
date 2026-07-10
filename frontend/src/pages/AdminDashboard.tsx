import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Users,
  Briefcase,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const LiveActiveJobBanner: React.FC<{ job: any }> = ({ job }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!job.startedAt) return;
    const startTime = new Date(job.startedAt).getTime();
    
    const update = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [job.startedAt]);

  const format = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimeStr = job.startedAt 
    ? new Date(job.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const lat = job.workerId?.currentLocation?.lat;
  const lng = job.workerId?.currentLocation?.lng;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-md relative overflow-hidden text-slate-800 dark:text-white text-xs">
      <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl" />
      
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-white animate-pulse shadow-sm text-sm shrink-0">
            🟢
          </div>
          <div className="text-left min-w-0">
            <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block">
              ⚡ LIVE CLEAN IN PROGRESS
            </span>
            <span className="font-extrabold text-slate-800 dark:text-white truncate block">
              {job.title}
            </span>
          </div>
        </div>

        <div className="bg-emerald-550/10 text-emerald-600 dark:text-emerald-405 border border-emerald-555/20 rounded-xl px-2.5 py-1 font-black text-[9px] uppercase tracking-wider shrink-0 animate-pulse">
          Work In Progress
        </div>
      </div>

      {/* Separate section for live elapsed time taken */}
      <div className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 flex justify-between items-center shadow-inner mt-2">
        <div className="space-y-0.5 text-left">
          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            ⏱️ WORK TIMELINE COUNTER
          </span>
          <span className="text-[9.5px] text-slate-400 font-medium">Time elapsed since start:</span>
        </div>
        <span className="text-sm font-mono font-black text-emerald-400 tracking-wider animate-pulse-slow shrink-0">
          {format(seconds)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-left text-[11px] text-slate-650 dark:text-slate-350">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0 text-[10px]">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <span className="font-bold text-slate-850 dark:text-slate-150 truncate">
            {job.workerId?.name || 'Unassigned'}
          </span>
        </div>

        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Client Customer</span>
          <span className="font-bold text-slate-850 dark:text-slate-150 truncate block">
            👤 {job.clientName || 'N/A'}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-655 dark:text-slate-350 space-y-1 pt-1 text-left">
        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest text-left">Service Address</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-left truncate leading-tight">📍 {job.address || 'N/A'}</span>
        </div>
        
        {lat && lng ? (
          <div className="pt-1.5 flex items-center space-x-1.5 text-blue-500 font-extrabold text-[9.5px]">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping shrink-0" />
            <span>Live Location: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
        ) : (
          <div className="pt-1.5 text-slate-450 text-[9px] font-medium text-left">
            🛰️ Live GPS tracking inactive
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] bg-slate-50/50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
        <span className="text-slate-455">Slot: <strong className="text-slate-750 dark:text-slate-200">{job.timeSlot || 'N/A'}</strong></span>
        <span className="text-emerald-500 font-extrabold">Started At: {startTimeStr}</span>
      </div>
    </div>
  );
};

const AcceptedJobBanner: React.FC<{ job: any }> = ({ job }) => {
  const acceptTimeStr = job.acceptedAt 
    ? new Date(job.acceptedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-md relative overflow-hidden text-slate-800 dark:text-white text-xs">
      <div className="absolute top-0 right-0 h-24 w-24 bg-amber-550/5 rounded-full blur-2xl" />
      
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white animate-pulse shadow-sm text-sm shrink-0">
            🟡
          </div>
          <div className="text-left min-w-0">
            <span className="text-[8px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest block">
              ⚡ WORKER ACCEPTED
            </span>
            <span className="font-extrabold text-slate-850 dark:text-white truncate block">
              {job.title} ({job.company})
            </span>
          </div>
        </div>
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20 rounded-xl px-2.5 py-1 font-black text-[9px] uppercase tracking-wider shrink-0 animate-pulse">
          Accepted
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left text-[11px] text-slate-650 dark:text-slate-350">
        <div className="flex items-center space-x-2.5">
          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0 text-[10px]">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Assigned Worker</span>
            <span className="font-bold text-slate-850 dark:text-slate-150 truncate">
              {job.workerId?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Client Customer</span>
          <span className="font-bold text-slate-850 dark:text-slate-150 truncate block">
            👤 {job.clientName || 'N/A'}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-655 dark:text-slate-350 text-left">
        <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Service Address</span>
        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate leading-tight">📍 {job.address || 'N/A'}</span>
      </div>

      <div className="flex items-center justify-between text-[9px] bg-slate-50/50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-1">
        <span className="text-slate-450">Scheduled Slot: <strong className="text-slate-750 dark:text-slate-200">{job.timeSlot || 'N/A'}</strong></span>
        <span className="text-amber-500 font-extrabold">Accepted At: {acceptTimeStr}</span>
      </div>
    </div>
  );
};

const RecentlyCompletedJobBanner: React.FC<{ job: any }> = ({ job }) => {
  const completeTimeStr = job.completedAt 
    ? new Date(job.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const formatDuration = () => {
    if (!job.startedAt || !job.completedAt) return 'N/A';
    const diffMs = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hrs > 0) {
      return `${hrs} hr ${remainingMins} min`;
    }
    return `${mins} min`;
  };

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-sm relative overflow-hidden text-slate-800 dark:text-white text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-450 shadow-sm text-sm shrink-0">
            ✓
          </div>
          <div className="text-left min-w-0">
            <span className="text-[8px] font-black text-emerald-650 dark:text-emerald-400 uppercase tracking-widest block">
              ✅ CLEANUP COMPLETED
            </span>
            <span className="font-extrabold text-slate-800 dark:text-white truncate block">
              {job.title}
            </span>
          </div>
        </div>
        <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl px-2.5 py-1 font-black text-[9px] uppercase tracking-wider shrink-0">
          Completed
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left text-[11px] text-slate-650 dark:text-slate-350">
        <div className="flex items-center space-x-2.5">
          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0 text-[10px]">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Worker</span>
            <span className="font-bold text-slate-850 dark:text-slate-150 truncate">
              {job.workerId?.name || 'Worker'}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Total Time Taken</span>
          <span className="font-bold text-emerald-500 dark:text-emerald-400 block mt-0.5">
            ⏱️ {formatDuration()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] bg-slate-50/50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
        <span className="text-slate-450">Completed At: <strong className="text-slate-755 dark:text-slate-200">{completeTimeStr}</strong></span>
        <span className="text-slate-450">Client: <strong className="text-slate-755 dark:text-slate-200">{job.clientName}</strong></span>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ companyFilter }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobsList, setJobsList] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Parallelize heavy API requests
      const [attRes, workersRes, jobsRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get(`/workers?company=${companyFilter}`),
        api.get(`/jobs?company=${companyFilter}`)
      ]);

      const attToday = attRes.data;
      const workers = workersRes.data;
      const jobs = jobsRes.data;

      setJobsList(jobs);

      const presentCount = attToday.filter((a: any) => a.status === 'present' || a.status === 'late').length;
      const lateCount = attToday.filter((a: any) => a.status === 'late').length;
      const halfDayCount = attToday.filter((a: any) => a.status === 'half-day').length;
      const absentCount = workers.length - (presentCount + halfDayCount);

      const completedJobs = jobs.filter((j: any) => j.status === 'completed');
      const pendingJobs = jobs.filter((j: any) => j.status === 'pending');
      const activeJobs = jobs.filter((j: any) => j.status === 'started');
      const cancelledJobs = jobs.filter((j: any) => j.status === 'cancelled');

      // Sum up monthly salaries of all active workers to get estimated payroll expense
      const monthlySalaryExpense = workers.reduce((sum: number, w: any) => sum + (w.monthlySalary || 0), 0);

      setStats({
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        absent: Math.max(0, absentCount),
        totalWorkers: workers.length,
        jobs: {
          total: jobs.length,
          completed: completedJobs.length,
          pending: pendingJobs.length,
          active: activeJobs.length,
          cancelled: cancelledJobs.length
        },
        salaryExpense: monthlySalaryExpense
      });

    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      if (
        type === 'JOB_COMPLETED' || 
        type === 'JOB_STARTED' || 
        type === 'JOB_CREATED' || 
        type === 'JOB_CANCELLED' || 
        type === 'JOB_DELETED' ||
        type === 'JOB_ACCEPTED' ||
        type === 'JOB_REJECTED'
      ) {
        fetchDashboardData();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [companyFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="animate-shimmer h-28 rounded-custom" />
          ))}
        </div>
        <div className="animate-shimmer h-80 w-full rounded-custom" />
      </div>
    );
  }

  const jobsChartData = [
    { name: 'Completed', value: stats?.jobs.completed, color: '#22C55E' },
    { name: 'Pending', value: stats?.jobs.pending, color: '#F59E0B' },
    { name: 'Active', value: stats?.jobs.active, color: '#2563EB' },
    { name: 'Cancelled', value: stats?.jobs.cancelled, color: '#EF4444' }
  ];

  const companyJobsData = [
    { name: 'SofaShine', value: jobsList.filter(j => j.company === 'SofaShine').length },
    { name: 'CleanCruisers', value: jobsList.filter(j => j.company === 'CleanCruisers').length }
  ];
  const COLORS = ['#F59E0B', '#10B981'];

  return (
    <div className="space-y-8">
      
      {/* SECTION 1: Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Attendance Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/15 dark:to-teal-500/5 border-l-4 border-l-success shadow-md shadow-emerald-500/5 hover:border-emerald-500/40 hover:scale-[1.02] transition-all flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">Attendance Today</span>
            <span className="block text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mt-1">
              {stats?.present} / {stats?.totalWorkers}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{stats?.late} late | {stats?.halfDay} half-day</span>
          </div>
          <div className="rounded-xl bg-success/15 text-success p-3"><Users className="h-6 w-6" /></div>
        </div>

        {/* Absent Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-rose-500/10 to-pink-500/5 dark:from-rose-500/15 dark:to-pink-500/5 border-l-4 border-l-danger shadow-md shadow-rose-500/5 hover:border-rose-500/40 hover:scale-[1.02] transition-all flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">Absent Workers</span>
            <span className="block text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-500 mt-1">
              {stats?.absent}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Requires check-in follow ups</span>
          </div>
          <div className="rounded-xl bg-danger/15 text-danger p-3"><AlertCircle className="h-6 w-6" /></div>
        </div>

        {/* Jobs Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/15 dark:to-orange-500/5 border-l-4 border-l-warning shadow-md shadow-amber-500/5 hover:border-amber-500/40 hover:scale-[1.02] transition-all flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">Completed Cleans</span>
            <span className="block text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500 mt-1">
              {stats?.jobs.completed}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{stats?.jobs.pending} pending | {stats?.jobs.active} active</span>
          </div>
          <div className="rounded-xl bg-warning/15 text-warning p-3"><Briefcase className="h-6 w-6" /></div>
        </div>

        {/* Payroll Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 dark:from-blue-500/15 dark:to-indigo-500/5 border-l-4 border-l-secondary shadow-md shadow-blue-500/5 hover:border-blue-500/40 hover:scale-[1.02] transition-all flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">Payroll Expense</span>
            <span className="block text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 mt-1">
              ₹{stats?.salaryExpense}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Estimated current month</span>
          </div>
          <div className="rounded-xl bg-secondary/15 text-secondary p-3"><DollarSign className="h-6 w-6" /></div>
        </div>
      </div>

      {/* SECTION 2: Job Progression Metrics Chart (Full Width) */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-855 dark:text-slate-100 mb-4">Job Progression Metrics</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {jobsChartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={jobsChartData[index].color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: Business Ratio Distribution Chart (Full Width) */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-slate-855 dark:text-slate-100 mb-2">Company Task Distribution</h3>
        <div className="h-64 relative flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={companyJobsData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {companyJobsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center">
            <span className="block text-xl font-bold text-slate-700 dark:text-white">{jobsList.length}</span>
            <span className="block text-[9px] text-slate-400 uppercase font-semibold">Total Jobs</span>
          </div>
        </div>
        <div className="flex justify-center space-x-6 text-xs mt-2">
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span>SofaShine</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>CleanCruisers</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;

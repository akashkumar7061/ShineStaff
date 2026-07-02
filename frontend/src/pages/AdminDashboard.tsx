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

      // Fetch salary dashboards in parallel to avoid N-request loop delays
      const salaryPromises = workers.map((w: any) =>
        api.get(`/salary/dashboard?workerId=${w._id}`).catch((err) => {
          console.error(`Failed to load salary for ${w._id}`, err);
          return { data: { earnings: { grossEarnings: 0 } } };
        })
      );
      const salaryResults = await Promise.all(salaryPromises);
      const monthlySalaryExpense = salaryResults.reduce((sum, res) => sum + (res.data?.earnings?.grossEarnings || 0), 0);

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
        type === 'JOB_DELETED'
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

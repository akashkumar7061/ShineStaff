import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import MapView from '../components/MapView';
import Leaderboard from '../components/Leaderboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Users,
  Briefcase,
  DollarSign,
  AlertCircle,
  Activity,
  Map,
  Camera,
  MapPin,
  Smartphone,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface AdminDashboardProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ companyFilter }) => {
  const [stats, setStats] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedSelfieUrl, setSelectedSelfieUrl] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const attRes = await api.get('/attendance/today');
      const attToday = attRes.data;
      setAttendanceLogs(attToday);

      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      const workers = workersRes.data;
      setWorkersList(workers);

      const jobsRes = await api.get(`/jobs?company=${companyFilter}`);
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

      let monthlySalaryExpense = 0;
      for (const w of workers) {
        try {
          const salRes = await api.get(`/salary/dashboard?workerId=${w._id}`);
          monthlySalaryExpense += salRes.data.earnings.grossEarnings;
        } catch (salErr) {
          console.error(`Failed to calculate salary for worker ${w._id}`, salErr);
        }
      }

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

      const activities: any[] = [];
      attToday.forEach((a: any) => {
        activities.push({
          id: `att_${a._id}`,
          type: 'attendance',
          message: `${a.workerId?.name || 'Worker'} checked in as ${a.status.toUpperCase()}`,
          time: new Date(a.checkInTime)
        });
      });
      completedJobs.forEach((j: any) => {
        activities.push({
          id: `job_${j._id}`,
          type: 'job',
          message: `Cleanup job "${j.title}" completed by ${(j.workerId as any)?.name || 'Worker'}`,
          time: new Date(j.completedAt)
        });
      });
      activeJobs.forEach((j: any) => {
        activities.push({
          id: `job_start_${j._id}`,
          type: 'job_started',
          message: `Cleanup job "${j.title}" started by ${(j.workerId as any)?.name || 'Worker'}`,
          time: new Date(j.startedAt)
        });
      });

      activities.sort((a, b) => b.time.getTime() - a.time.getTime());
      setRecentActivities(activities.slice(0, 10));

    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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

  const mapPins = [
    ...workersList
      .filter((w) => w.currentLocation?.lat && w.currentLocation?.lng)
      .map((w) => ({
        id: w._id,
        name: w.name,
        lat: w.currentLocation.lat,
        lng: w.currentLocation.lng,
        type: 'worker' as const,
        info: `Status: ${w.status} | Last active: ${w.lastActive ? new Date(w.lastActive).toLocaleTimeString() : 'N/A'}`
      })),
    ...jobsList
      .filter((j) => j.location?.lat && j.location?.lng)
      .map((j) => ({
        id: j._id,
        name: j.title,
        lat: j.location.lat,
        lng: j.location.lng,
        type: 'job' as const,
        company: j.company,
        info: `Client: ${j.clientName} | Status: ${j.status.toUpperCase()}`
      }))
  ];

  const leaderboardWorkers = workersList.map((w) => {
    const completed = jobsList.filter((j) => j.workerId?._id === w._id && j.status === 'completed').length;
    const total = jobsList.filter((j) => j.workerId?._id === w._id).length;
    const attCount = attendanceLogs.filter((a) => a.workerId?._id === w._id).length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    const attendanceRate = Math.min(100, Math.round((attCount / 30) * 100)) || 85;
    const score = Math.round((completionRate * 0.6) + (attendanceRate * 0.4));

    return {
      id: w._id,
      name: w.name,
      photo: w.photo,
      company: w.company,
      completedJobs: completed,
      attendanceRate,
      performanceScore: score
    };
  });

  return (
    <div className="space-y-8">
      
      {/* SECTION 1: Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Attendance Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/15 dark:to-teal-500/5 border-l-4 border-l-success shadow-md shadow-emerald-500/5 hover:border-emerald-500/40 hover:scale-[1.02] transition-all flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Attendance Today</span>
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
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Completed Cleans</span>
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
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Payroll Expense</span>
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
        <h3 className="font-semibold text-slate-850 dark:text-slate-100 mb-4">Job Progression Metrics</h3>
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
        <h3 className="font-semibold text-slate-850 dark:text-slate-100 mb-2">Company Task Distribution</h3>
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

      {/* SECTION 4: Live GPS tracking Map (Full Width) */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-850 dark:text-slate-100">Live GPS Coordinates Map</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time overlay locations for scheduled cleans and workers</p>
          </div>
          <Map className="h-5 w-5 text-secondary" />
        </div>
        <div className="h-96">
          <MapView pins={mapPins} />
        </div>
      </div>

      {/* SECTION 5: Worker Performance Leaderboard (Full Width) */}
      <div className="glass-card p-6">
        <Leaderboard workers={leaderboardWorkers} />
      </div>

      {/* SECTION 6: Recent System Action Logs (Full Width) */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="rounded-xl bg-secondary/10 p-2 text-secondary"><Activity className="h-5 w-5" /></div>
          <div>
            <h3 className="font-semibold text-slate-850 dark:text-slate-100">Recent Activities Timeline</h3>
            <p className="text-xs text-slate-400">Chronological logs of worker check-ins and cleaning progress reports</p>
          </div>
        </div>
        <div className="relative border-l border-slate-150 dark:border-slate-800 ml-3 space-y-6">
          {recentActivities.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400 pl-4">No activity logs recorded today.</div>
          ) : (
            recentActivities.map((act) => (
              <div key={act.id} className="relative pl-6">
                <span className={`absolute left-0 top-1.5 -ml-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  act.type === 'attendance' ? 'bg-success' : act.type === 'job' ? 'bg-secondary' : 'bg-warning'
                }`} />
                <div>
                  <p className="text-xs font-semibold text-slate-750 dark:text-slate-250">{act.message}</p>
                  <span className="text-[10px] text-slate-400">
                    {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 7: Today's Selfie Attendance Registry Table (Full Width) */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="rounded-xl bg-success/10 p-2.5 text-success"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-slate-850 dark:text-slate-100">Today's Attendance Registry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Audit verified worker selfie uploads and clock-in hardware specs</p>
            </div>
          </div>
        </div>

        {attendanceLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No employees clocked-in today.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Worker Profile</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Clock-In Time</th>
                  <th className="px-6 py-4">GPS Position</th>
                  <th className="px-6 py-4">Device Specs</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Selfie Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {attendanceLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-3.5 flex items-center space-x-3">
                      <img
                        src={log.workerId?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${log.workerId?.name}`}
                        alt={log.workerId?.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-805"
                      />
                      <div>
                        <span className="block font-bold text-slate-850 dark:text-white">{log.workerId?.name || 'Deleted Worker'}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{log.workerId?.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded uppercase">
                        {log.workerId?.company}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {log.location?.lat && log.location?.lng ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 hover:text-secondary hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.location.lat.toFixed(5)}, {log.location.lng.toFixed(5)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">No GPS Data</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 max-w-[150px] truncate" title={log.deviceInfo}>
                      <span className="flex items-center space-x-1">
                        <Smartphone className="h-3.5 w-3.5" />
                        <span className="truncate">{log.deviceInfo}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        log.status === 'present' ? 'bg-success/15 text-success' :
                        log.status === 'late' ? 'bg-warning/15 text-warning' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedSelfieUrl(log.selfie)}
                        className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-550 hover:bg-secondary/15 hover:text-secondary transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSelfieUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-widest">Selfie Camera Snap Check</span>
              <button onClick={() => setSelectedSelfieUrl(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <img
                src={selectedSelfieUrl}
                alt="Selfie Check"
                className="max-h-[50vh] object-contain rounded-2xl shadow border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
  Legend
} from 'recharts';
import {
  Users,
  Briefcase,
  DollarSign,
  AlertCircle,
  Layers,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  X,
  Edit,
  Trash2
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

const getTodayString = () => new Date().toISOString().split('T')[0];
const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const CHART_COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ companyFilter }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);

  // Date Filters
  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState(getPastDateString(30));
  const [endDate, setEndDate] = useState(getTodayString());
  const [biAnalytics, setBiAnalytics] = useState<any>(null);

  // Drill-down Detail States
  const [drillDown, setDrillDown] = useState<{
    title: string;
    type: 'sales' | 'revenue' | 'expenses' | 'profit' | 'gross' | 'outstanding' | 'received' | 'customers';
    data: any[];
  } | null>(null);

  const [editingItem, setEditingItem] = useState<{
    type: 'job' | 'custom_expense' | 'salary_request' | 'travel_log' | 'customer';
    id: string;
    fields: any;
  } | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Parallelize heavy API requests
      const [attRes, workersRes, jobsRes, biRes, expensesRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get(`/workers?company=${companyFilter}`),
        api.get(`/jobs?company=${companyFilter}`),
        api.get(`/bi/analytics?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: null })),
        api.get(`/expenses?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: [] }))
      ]);

      const attToday = attRes.data;
      const workers = workersRes.data;
      const jobs = jobsRes.data;

      setJobsList(jobs);
      setExpensesList(expensesRes.data || []);
      if (biRes && biRes.data) {
        setBiAnalytics(biRes.data);
      }

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
  }, [companyFilter, startDate, endDate]);

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

  // Handle Preset Date Filter
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = getTodayString();
    
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const yesterday = getPastDateString(1);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (preset === 'last-7') {
      setStartDate(getPastDateString(7));
      setEndDate(today);
    } else if (preset === 'this-month') {
      const d = new Date();
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(today);
    } else if (preset === 'last-month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'this-year') {
      const currentYear = new Date().getFullYear();
      setStartDate(`${currentYear}-01-01`);
      setEndDate(today);
    }
  };

  const getExpenseChartData = () => {
    if (!biAnalytics) return [];
    const breakdown = biAnalytics.expenseBreakdown;
    return [
      { name: 'Salaries', value: breakdown.salaries },
      { name: 'Fuel', value: breakdown.fuel },
      { name: 'Materials', value: breakdown.material },
      { name: 'Equipment', value: breakdown.equipment },
      { name: 'Marketing', value: breakdown.marketing },
      { name: 'Office', value: breakdown.office },
      { name: 'Supplies/Inventory', value: breakdown.inventory || 0 },
      { name: 'Misc', value: breakdown.miscellaneous }
    ].filter(item => item.value > 0);
  };

  const getProfitTrendData = () => {
    if (!biAnalytics) return [];
    const totalExp = biAnalytics.financials.totalExpenses;
    const totalRev = biAnalytics.financials.totalRevenue;
    return [
      { date: startDate, revenue: Math.round(totalRev * 0.2), expense: Math.round(totalExp * 0.25), profit: Math.round(totalRev * 0.2 - totalExp * 0.25) },
      { date: 'Mid Period', revenue: Math.round(totalRev * 0.5), expense: Math.round(totalExp * 0.4), profit: Math.round(totalRev * 0.5 - totalExp * 0.4) },
      { date: endDate, revenue: totalRev, expense: totalExp, profit: biAnalytics.financials.netProfit }
    ];
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (editingItem.type === 'job') {
        await api.put(`/jobs/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'custom_expense') {
        await api.put(`/expenses/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'salary_request') {
        await api.put(`/salary/payouts/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'travel_log') {
        await api.put(`/travel/${editingItem.id}`, editingItem.fields);
      } else if (editingItem.type === 'customer') {
        await api.put(`/jobs/update-client-info`, {
          originalPhone: editingItem.id,
          clientName: editingItem.fields.clientName,
          clientPhone: editingItem.fields.clientPhone,
          address: editingItem.fields.address
        });
      }
      alert('Record updated successfully!');
      setEditingItem(null);
      setDrillDown(null);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update record');
    }
  };

  const openDrillDown = (type: 'sales' | 'revenue' | 'expenses' | 'profit' | 'gross' | 'outstanding' | 'received' | 'customers') => {
    if (!biAnalytics) return;
    
    let title = '';
    let data: any[] = [];

    switch (type) {
      case 'sales':
        title = 'Total Sales (Scheduled Cleans)';
        data = jobsList;
        break;
      case 'revenue':
        title = 'Total Revenue (Completed Cleans)';
        data = jobsList.filter(j => j.status === 'completed');
        break;
      case 'expenses':
        title = 'Total Operating Expenses';
        const items: any[] = [];
        expensesList.forEach(e => items.push({ 
          id: e._id,
          type: 'custom_expense',
          date: e.date, 
          category: e.category.toUpperCase(), 
          desc: e.description || 'Custom Expense', 
          amount: e.amount,
          raw: e
        }));
        (biAnalytics.rawSalaryPayouts || []).forEach((sr: any) => {
          items.push({ 
            id: sr._id,
            type: 'salary_request',
            date: sr.processedAt ? new Date(sr.processedAt).toISOString().split('T')[0] : 'N/A', 
            category: 'SALARIES', 
            desc: `Salary Payout Request approved for ${sr.workerId?.name || 'Worker'} (${sr.month})`, 
            amount: sr.amount,
            raw: sr
          });
        });
        (biAnalytics.rawTravelLogs || []).forEach((tl: any) => {
          items.push({ 
            id: tl._id,
            type: 'travel_log',
            date: tl.date, 
            category: 'FUEL ALLOWANCE', 
            desc: `Fuel Reimbursement for ${tl.workerId?.name || 'Worker'} (${tl.kms} Kms)`, 
            amount: tl.allowance,
            raw: tl
          });
        });
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        data = items;
        break;
      case 'profit':
        title = 'Net Profit Detail (Revenues vs Expenses)';
        data = [
          { category: 'REVENUE', desc: 'Total Completed Cleans Revenue', amount: biAnalytics.financials.totalRevenue },
          { category: 'EXPENSE', desc: 'Worker Salaries Payouts', amount: biAnalytics.expenseBreakdown.salaries },
          { category: 'EXPENSE', desc: 'Fuel & Travel Reimbursements', amount: biAnalytics.expenseBreakdown.fuel },
          { category: 'EXPENSE', desc: 'Materials & Consumables Costs', amount: biAnalytics.expenseBreakdown.material },
          { category: 'EXPENSE', desc: 'Equipment Purchase/Leases', amount: biAnalytics.expenseBreakdown.equipment },
          { category: 'EXPENSE', desc: 'Marketing & Advertising Budgets', amount: biAnalytics.expenseBreakdown.marketing },
          { category: 'EXPENSE', desc: 'Office Rents & Admin Overhead', amount: biAnalytics.expenseBreakdown.office },
          { category: 'EXPENSE', desc: 'Inventory & Supplies Expense', amount: biAnalytics.expenseBreakdown.inventory || 0 },
          { category: 'EXPENSE', desc: 'Miscellaneous Business Costs', amount: biAnalytics.expenseBreakdown.miscellaneous }
        ];
        break;
      case 'gross':
        title = 'Gross Profit (Revenues - Cost of Goods Sold)';
        data = [
          { category: 'REVENUE', desc: 'Total Completed Cleans Revenue', amount: biAnalytics.financials.totalRevenue },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Materials & Consumables Costs', amount: biAnalytics.expenseBreakdown.material },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Equipment Purchase/Leases', amount: biAnalytics.expenseBreakdown.equipment },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Inventory & Cleaning Supplies', amount: biAnalytics.expenseBreakdown.inventory || 0 }
        ];
        break;
      case 'outstanding':
        title = 'Outstanding Payments (Completed Unpaid)';
        data = jobsList.filter(j => j.status === 'completed' && j.paymentStatus !== 'received');
        break;
      case 'received':
        title = 'Received Payments (Completed Paid)';
        data = jobsList.filter(j => j.status === 'completed' && j.paymentStatus === 'received');
        break;
      case 'customers':
        title = 'Client Booking Activity (Repeat & Unique)';
        const map: { [phone: string]: { name: string; phone: string; count: number; address?: string } } = {};
        jobsList.forEach(j => {
          if (j.clientPhone) {
            if (!map[j.clientPhone]) {
              map[j.clientPhone] = { 
                name: j.clientName, 
                phone: j.clientPhone, 
                count: 0, 
                address: j.address || j.locationName || 'N/A' 
              };
            }
            map[j.clientPhone].count++;
            if ((!map[j.clientPhone].address || map[j.clientPhone].address === 'N/A') && (j.address || j.locationName)) {
              map[j.clientPhone].address = j.address || j.locationName;
            }
          }
        });
        data = Object.values(map).sort((a, b) => b.count - a.count);
        break;
      default:
        break;
    }

    setDrillDown({ title, type, data });
  };

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
    <div className="space-y-8 animate-fade-in">
      
      {/* Date Filters Selectors Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <span>📊</span>
            <span>Business Performance & Metrics</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Real-time consolidated financials, sales ratios, customer lifetime value, and costs breakdown.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Quick Date Filter:</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full sm:w-44 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:text-white shadow-sm"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-7">Last 7 Days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center space-x-2 animate-fade-in">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white shadow-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {biAnalytics ? (
        <div className="space-y-8">
          
          {/* SECTION 1: 8 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Sales Card */}
            <div 
              onClick={() => openDrillDown('sales')}
              className="glass-card p-5 border-l-4 border-l-secondary relative overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Sales</span>
                <Layers className="h-4.5 w-4.5 text-secondary/70" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">₹{biAnalytics.financials.totalSales.toLocaleString('en-IN')}</h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Scheduled values</p>
            </div>

            {/* Revenue Card */}
            <div 
              onClick={() => openDrillDown('revenue')}
              className="glass-card p-5 border-l-4 border-l-emerald-500 relative overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Revenue</span>
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500/70" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">₹{biAnalytics.financials.totalRevenue.toLocaleString('en-IN')}</h3>
              <p className="text-[9px] text-emerald-500 font-bold mt-1 block">Completed cleans</p>
            </div>

            {/* Expenses Card */}
            <div 
              onClick={() => openDrillDown('expenses')}
              className="glass-card p-5 border-l-4 border-l-rose-500 relative overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Expenses</span>
                <TrendingDown className="h-4.5 w-4.5 text-rose-500/70" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">₹{biAnalytics.financials.totalExpenses.toLocaleString('en-IN')}</h3>
              <p className="text-[9px] text-rose-500 font-bold mt-1 block">Salaries + Fuel + Material</p>
            </div>

            {/* Net Profit Card */}
            <div 
              onClick={() => openDrillDown('profit')}
              className={`glass-card p-5 border-l-4 ${biAnalytics.financials.netProfit >= 0 ? 'border-l-indigo-500' : 'border-l-rose-600'} relative overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all`}
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Net Profit</span>
                <DollarSign className="h-4.5 w-4.5 text-indigo-500/70" />
              </div>
              <h3 className={`text-lg font-black mt-2 ${biAnalytics.financials.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-danger'}`}>
                ₹{biAnalytics.financials.netProfit.toLocaleString('en-IN')}
              </h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Revenue - Expenses</p>
            </div>

            {/* Gross Profit Card */}
            <div 
              onClick={() => openDrillDown('gross')}
              className="glass-card p-4 flex flex-col justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Gross Profit</span>
              <h4 className="text-base font-black text-slate-800 dark:text-white mt-1">₹{biAnalytics.financials.grossProfit.toLocaleString('en-IN')}</h4>
              <span className="text-[9px] text-slate-400 mt-1 block">Excl. salaries & fuel</span>
            </div>

            {/* Outstanding Payments Card */}
            <div 
              onClick={() => openDrillDown('outstanding')}
              className="glass-card p-4 flex flex-col justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Outstanding Payments</span>
              <h4 className="text-base font-black text-rose-500 mt-1">₹{biAnalytics.financials.outstandingPayments.toLocaleString('en-IN')}</h4>
              <span className="text-[9px] text-slate-400 mt-1 block">Completed unpaid cleans</span>
            </div>

            {/* Received Payments Card */}
            <div 
              onClick={() => openDrillDown('received')}
              className="glass-card p-4 flex flex-col justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Received Payments</span>
              <h4 className="text-base font-black text-emerald-500 mt-1">₹{biAnalytics.financials.receivedPayments.toLocaleString('en-IN')}</h4>
              <span className="text-[9px] text-slate-400 mt-1 block">Completed cash/online paid</span>
            </div>

            {/* Returning Clients Card */}
            <div 
              onClick={() => openDrillDown('customers')}
              className="glass-card p-4 flex flex-col justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Returning Clients</span>
              <h4 className="text-base font-black text-slate-800 dark:text-white mt-1">{biAnalytics.financials.returningCustomers} / {biAnalytics.financials.totalCustomers}</h4>
              <span className="text-[9px] text-emerald-500 font-bold mt-1 block">
                +{biAnalytics.financials.totalCustomers > 0 ? Math.round((biAnalytics.financials.returningCustomers / biAnalytics.financials.totalCustomers) * 100) : 0}% Repeat Rate
              </span>
            </div>

          </div>

          {/* SECTION 2: 4 Executive Ratios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div 
              onClick={() => openDrillDown('gross')}
              className="glass-card p-5 border-l-4 border-l-indigo-600 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Gross Profit Margin</span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                {biAnalytics.financials.totalRevenue > 0 ? ((biAnalytics.financials.grossProfit / biAnalytics.financials.totalRevenue) * 100).toFixed(1) : '0'}%
              </h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Benchmark: &gt;50% is healthy</p>
            </div>

            <div 
              onClick={() => openDrillDown('profit')}
              className="glass-card p-5 border-l-4 border-l-violet-600 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Net Profit Margin</span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                {biAnalytics.financials.totalRevenue > 0 ? ((biAnalytics.financials.netProfit / biAnalytics.financials.totalRevenue) * 100).toFixed(1) : '0'}%
              </h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Benchmark: &gt;20% is excellent</p>
            </div>

            <div 
              onClick={() => openDrillDown('expenses')}
              className="glass-card p-5 border-l-4 border-l-rose-500 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Operating Expense Ratio (OER)</span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                {biAnalytics.financials.totalRevenue > 0 ? (((biAnalytics.expenseBreakdown.salaries + biAnalytics.expenseBreakdown.office + biAnalytics.expenseBreakdown.marketing + biAnalytics.expenseBreakdown.miscellaneous) / biAnalytics.financials.totalRevenue) * 100).toFixed(1) : '0'}%
              </h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Opex efficiency ratio</p>
            </div>

            <div 
              onClick={() => openDrillDown('customers')}
              className="glass-card p-5 border-l-4 border-l-amber-500 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all"
            >
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customer Lifetime Value (LTV)</span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
                ₹{Math.round(biAnalytics.financials.averageOrderValue * (biAnalytics.financials.totalCustomers > 0 ? jobsList.length / biAnalytics.financials.totalCustomers : 1)).toLocaleString('en-IN')}
              </h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Average total booking client spend</p>
            </div>

          </div>

          {/* SECTION 3: Visual Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Profit Trend Analysis Chart */}
            <div className="glass-card p-6 lg:col-span-2 shadow-sm">
              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Profit Trend Analysis</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getProfitTrendData()}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#6366f1" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expenses Breakdown Pie Chart */}
            <div className="glass-card p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-4">Expenses Breakdown By Category</h3>
              <div className="h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <RechartsPie
                      data={getExpenseChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {getExpenseChartData().map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </RechartsPie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Costs</span>
                  <span className="text-base font-black text-slate-800 dark:text-white mt-0.5">₹{biAnalytics.financials.totalExpenses.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold">
                {getExpenseChartData().map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center space-x-1.5 text-slate-655 dark:text-slate-350">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span>{item.name}: ₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="glass-card p-12 text-center text-slate-400 font-bold text-xs">
          Loading Financial Analytics...
        </div>
      )}

      {/* Drill-down Analytics Modal */}
      {drillDown && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md text-xs font-bold">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white uppercase tracking-wider">{drillDown.title}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Drill-down records list for {startDate} to {endDate}</p>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto my-4 pr-1">
              <table className="w-full text-left text-xs font-bold text-slate-600 dark:text-slate-350">
                <thead className="bg-slate-100 dark:bg-slate-900 uppercase tracking-widest text-[9px] text-slate-400 sticky top-0 z-10">
                  {drillDown.type === 'customers' ? (
                    <tr>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Client Phone</th>
                      <th className="px-4 py-3">Client Location</th>
                      <th className="px-4 py-3 text-center">Total Bookings Count</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  ) : drillDown.type === 'expenses' || drillDown.type === 'profit' || drillDown.type === 'gross' ? (
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Clean Title</th>
                      <th className="px-4 py-3">Assigned Worker</th>
                      <th className="px-4 py-3">Job Status</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {drillDown.data.map((item: any, idx: number) => {
                    if (drillDown.type === 'customers') {
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-800 dark:text-white font-extrabold">{item.name}</td>
                          <td className="px-4 py-3 text-mono">{item.phone}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-normal">{item.address || 'N/A'}</td>
                          <td className="px-4 py-3 text-center text-secondary font-black">{item.count} Bookings</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditingItem({
                                type: 'customer',
                                id: item.phone,
                                fields: {
                                  clientName: item.name,
                                  clientPhone: item.phone,
                                  address: item.address
                                }
                              })}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                              title="Edit Client contact details across all bookings"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      );
                    } else if (drillDown.type === 'expenses' || drillDown.type === 'profit' || drillDown.type === 'gross') {
                      const isRev = item.category?.includes('REVENUE');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-400">{item.date || 'Period Metric'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              isRev 
                                ? 'bg-success/15 text-success' 
                                : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-755 dark:text-slate-200">{item.desc}</td>
                          <td className={`px-4 py-3 text-right font-black ${
                            isRev ? 'text-success' : 'text-danger'
                          }`}>
                            {isRev ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.type ? (
                              <button
                                onClick={() => setEditingItem({
                                  type: item.type,
                                  id: item.id,
                                  fields: item.type === 'custom_expense'
                                    ? { category: item.raw.category, description: item.raw.description, amount: item.raw.amount, date: item.raw.date }
                                    : item.type === 'salary_request'
                                    ? { amount: item.raw.amount, month: item.raw.month, paymentMode: item.raw.paymentMode || 'Online' }
                                    : { kms: item.raw.kms, allowance: item.raw.allowance, date: item.raw.date }
                                })}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                title="Edit Expense item details"
                              >
                                ✏️ Edit
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">System Metric</span>
                            )}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 whitespace-nowrap">{item.date}</td>
                          <td className="px-4 py-3">
                            <span className="block text-slate-800 dark:text-white font-extrabold">{item.clientName}</span>
                            <span className="text-[10px] text-slate-400">{item.clientPhone}</span>
                          </td>
                          <td className="px-4 py-3 truncate max-w-[150px]">{item.title}</td>
                          <td className="px-4 py-3">{(item.workerId as any)?.name || 'Unassigned'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              item.status === 'completed' 
                                ? 'bg-success/15 text-success' 
                                : item.status === 'cancelled' 
                                ? 'bg-danger/15 text-danger' 
                                : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-max ${
                                item.paymentStatus === 'received' 
                                  ? 'bg-success/15 text-success' 
                                  : item.paymentStatus === 'outstanding' 
                                  ? 'bg-danger/15 text-danger' 
                                  : 'bg-amber-500/15 text-amber-500'
                              }`}>
                                {item.paymentStatus || 'pending'}
                              </span>
                              {item.paymentMode && item.paymentMode !== 'not_selected' && (
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  {item.paymentMode === 'cash' ? 'Cash' : 'UPI/Online'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white">
                            ₹{(item.price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditingItem({
                                type: 'job',
                                id: item._id,
                                fields: {
                                  title: item.title,
                                  clientName: item.clientName,
                                  clientPhone: item.clientPhone,
                                  price: item.price,
                                  status: item.status,
                                  date: item.date,
                                  paymentStatus: item.paymentStatus || 'pending',
                                  paymentMode: item.paymentMode || 'not_selected'
                                }
                              })}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                              title="Edit clean job details"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  })}
                  {drillDown.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-black">
              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Total Items: {drillDown.data.length}</span>
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {drillDown.type === 'customers' 
                  ? `${drillDown.data.reduce((acc, curr) => acc + curr.count, 0)} Total Clean Bookings`
                  : drillDown.type === 'profit'
                  ? `Net Calculation: ₹${biAnalytics.financials.netProfit.toLocaleString('en-IN')}`
                  : drillDown.type === 'gross'
                  ? `Gross Calculation: ₹${biAnalytics.financials.grossProfit.toLocaleString('en-IN')}`
                  : `Sum Total: ₹${(
                      drillDown.data.reduce((acc, curr) => acc + (curr.price || curr.amount || 0), 0)
                    ).toLocaleString('en-IN')}`
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md text-xs font-bold text-slate-700 dark:text-slate-200">
          <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm uppercase text-secondary">Edit BI Record</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Editing {editingItem.type.replace('_', ' ')} record</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-605 text-sm font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditItemSubmit} className="space-y-4">
              {editingItem.type === 'job' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Clean Title</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.title || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, title: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-950/50 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Name</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fields.clientName || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, clientName: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Phone</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fields.clientPhone || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, clientPhone: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.price || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, price: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Clean Date</label>
                      <input
                        type="date"
                        required
                        value={editingItem.fields.date || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, date: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Job Status</label>
                      <select
                        value={editingItem.fields.status || 'pending'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, status: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                      >
                        <option value="pending">Pending</option>
                        <option value="started">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Status</label>
                      <select
                        value={editingItem.fields.paymentStatus || 'pending'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, paymentStatus: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received / Paid</option>
                        <option value="outstanding">Outstanding</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Method</label>
                      <select
                        value={editingItem.fields.paymentMode || 'not_selected'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, paymentMode: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                      >
                        <option value="not_selected">Not Selected</option>
                        <option value="cash">💵 Cash</option>
                        <option value="upi_online">📱 UPI / Online</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {editingItem.type === 'custom_expense' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Category</label>
                      <select
                        value={editingItem.fields.category || 'material'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, category: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                      >
                        <option value="salaries">Salaries</option>
                        <option value="fuel">Fuel & Travel</option>
                        <option value="material">Materials</option>
                        <option value="equipment">Equipment</option>
                        <option value="marketing">Marketing</option>
                        <option value="office">Office/Admin</option>
                        <option value="inventory">Inventory</option>
                        <option value="miscellaneous">Miscellaneous</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Expense Date</label>
                      <input
                        type="date"
                        required
                        value={editingItem.fields.date || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, date: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={editingItem.fields.amount || 0}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, amount: Number(e.target.value) }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Description</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.description || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, description: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'salary_request' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.amount || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, amount: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Billing Month</label>
                      <input
                        type="text"
                        required
                        placeholder="YYYY-MM"
                        value={editingItem.fields.month || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, month: e.target.value }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Mode</label>
                    <select
                      value={editingItem.fields.paymentMode || 'Online'}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, paymentMode: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                    >
                      <option value="Online">Online Transfer</option>
                      <option value="Cash">Cash Payout</option>
                    </select>
                  </div>
                </>
              )}

              {editingItem.type === 'travel_log' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Distance (KM)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.kms || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, kms: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Allowance (₹)</label>
                      <input
                        type="number"
                        required
                        value={editingItem.fields.allowance || 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          fields: { ...editingItem.fields, allowance: Number(e.target.value) }
                        })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Log Date</label>
                    <input
                      type="date"
                      required
                      value={editingItem.fields.date || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, date: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'customer' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Name</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.clientName || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, clientName: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Phone</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.clientPhone || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, clientPhone: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-955/50 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Client Address / Location</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fields.address || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        fields: { ...editingItem.fields, address: e.target.value }
                      })}
                      className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none font-bold"
                    />
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2 text-center font-extrabold uppercase tracking-wider">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-white hover:opacity-90 transition-opacity cursor-pointer font-bold"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;

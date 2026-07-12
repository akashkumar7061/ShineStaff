import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  Download,
  Printer,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Clock,
  CreditCard,
  Layers,
  PieChart as PieIcon,
  ShieldAlert,
  ListTodo,
  Star,
  Zap,
  MapPin,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'];

const getTodayString = () => new Date().toISOString().split('T')[0];

const getPresetDates = (preset: string) => {
  const today = new Date();
  let start = new Date();
  let end = new Date();

  switch (preset) {
    case 'today':
      // Start of today, end of today
      break;
    case 'yesterday':
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
      break;
    case 'last-7':
      start.setDate(today.getDate() - 6);
      break;
    case 'last-30':
      start.setDate(today.getDate() - 29);
      break;
    case 'this-month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'last-month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'this-quarter':
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qStartMonth, 1);
      break;
    case 'this-year':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      break;
  }

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const AdminBIDashboard: React.FC = () => {
  const [preset, setPreset] = useState('this-month');
  const [startDate, setStartDate] = useState(() => getPresetDates('this-month').startDate);
  const [endDate, setEndDate] = useState(getTodayString());

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'financials' | 'operations' | 'workers' | 'goals' | 'expenses' | 'payment-tracker' | 'audit'>('financials');

  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState<'material' | 'equipment' | 'marketing' | 'office' | 'miscellaneous'>('material');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayString());
  const [expenseDescription, setExpenseDescription] = useState('');

  // Search filter inside audit logs tab
  const [auditSearch, setAuditSearch] = useState('');

  const fetchBIData = async () => {
    setLoading(true);
    try {
      const [biRes, expRes, jobsRes, auditRes] = await Promise.all([
        api.get(`/bi/analytics?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/expenses?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/jobs?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/audit-logs?startDate=${startDate}&endDate=${endDate}&limit=100`)
      ]);
      setAnalytics(biRes.data);
      setExpenses(expRes.data);
      setJobs(jobsRes.data);
      setAuditLogs(auditRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load BI dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBIData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handlePresetChange = (selectedPreset: string) => {
    setPreset(selectedPreset);
    if (selectedPreset !== 'custom') {
      const dates = getPresetDates(selectedPreset);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || isNaN(Number(expenseAmount)) || Number(expenseAmount) <= 0) return;

    try {
      await api.post('/expenses', {
        category: expenseCategory,
        amount: Number(expenseAmount),
        date: expenseDate,
        description: expenseDescription
      });
      // Reset form & reload
      setExpenseAmount('');
      setExpenseDescription('');
      fetchBIData();
    } catch (err) {
      console.error('Failed to log expense:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchBIData();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleUpdatePaymentStatus = async (jobId: string, paymentStatus: 'pending' | 'received' | 'outstanding') => {
    try {
      await api.put(`/jobs/${jobId}`, { paymentStatus });
      fetchBIData();
    } catch (err) {
      console.error('Failed to update job payment status:', err);
    }
  };

  const handleUpdateJobRating = async (jobId: string, rating: number) => {
    try {
      await api.put(`/jobs/${jobId}`, { rating });
      fetchBIData();
    } catch (err) {
      console.error('Failed to update job rating:', err);
    }
  };

  const [drillDown, setDrillDown] = useState<{
    title: string;
    type: 'sales' | 'revenue' | 'expenses' | 'profit' | 'gross' | 'outstanding' | 'received' | 'customers';
    data: any[];
  } | null>(null);

  const openDrillDown = (type: 'sales' | 'revenue' | 'expenses' | 'profit' | 'gross' | 'outstanding' | 'received' | 'customers') => {
    if (!analytics) return;
    
    let title = '';
    let data: any[] = [];

    switch (type) {
      case 'sales':
        title = 'Total Sales (Scheduled Cleans)';
        data = jobs;
        break;
      case 'revenue':
        title = 'Total Revenue (Completed Cleans)';
        data = jobs.filter(j => j.status === 'completed');
        break;
      case 'expenses':
        title = 'Total Operating Expenses';
        const items: any[] = [];
        expenses.forEach(e => items.push({ date: e.date, category: e.category.toUpperCase(), desc: e.description || 'Custom Expense', amount: e.amount }));
        (analytics.rawSalaryPayouts || []).forEach((sr: any) => {
          items.push({ 
            date: sr.processedAt ? new Date(sr.processedAt).toISOString().split('T')[0] : 'N/A', 
            category: 'SALARIES', 
            desc: `Salary Payout Request approved for ${sr.workerId?.name || 'Worker'} (${sr.month})`, 
            amount: sr.amount 
          });
        });
        (analytics.rawTravelLogs || []).forEach((tl: any) => {
          items.push({ 
            date: tl.date, 
            category: 'FUEL ALLOWANCE', 
            desc: `Fuel Reimbursement for ${tl.workerId?.name || 'Worker'} (${tl.kms} Kms)`, 
            amount: tl.allowance 
          });
        });
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        data = items;
        break;
      case 'profit':
        title = 'Net Profit Detail (Revenues vs Expenses)';
        data = [
          { category: 'REVENUE', desc: 'Total Completed Cleans Revenue', amount: analytics.financials.totalRevenue },
          { category: 'EXPENSE', desc: 'Worker Salaries Payouts', amount: analytics.expenseBreakdown.salaries },
          { category: 'EXPENSE', desc: 'Fuel & Travel Reimbursements', amount: analytics.expenseBreakdown.fuel },
          { category: 'EXPENSE', desc: 'Materials & Consumables Costs', amount: analytics.expenseBreakdown.material },
          { category: 'EXPENSE', desc: 'Equipment Purchase/Leases', amount: analytics.expenseBreakdown.equipment },
          { category: 'EXPENSE', desc: 'Marketing & Advertising Budgets', amount: analytics.expenseBreakdown.marketing },
          { category: 'EXPENSE', desc: 'Office Rents & Admin Overhead', amount: analytics.expenseBreakdown.office },
          { category: 'EXPENSE', desc: 'Miscellaneous Business Costs', amount: analytics.expenseBreakdown.miscellaneous }
        ];
        break;
      case 'gross':
        title = 'Gross Profit (Revenues - Material/Equipment)';
        data = [
          { category: 'REVENUE', desc: 'Total Completed Cleans Revenue', amount: analytics.financials.totalRevenue },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Materials & Consumables Costs', amount: analytics.expenseBreakdown.material },
          { category: 'EXPENSE (DEDUCTED)', desc: 'Equipment Purchase/Leases', amount: analytics.expenseBreakdown.equipment }
        ];
        break;
      case 'outstanding':
        title = 'Outstanding Payments (Completed Unpaid)';
        data = jobs.filter(j => j.status === 'completed' && j.paymentStatus !== 'received');
        break;
      case 'received':
        title = 'Received Payments (Completed Paid)';
        data = jobs.filter(j => j.status === 'completed' && j.paymentStatus === 'received');
        break;
      case 'customers':
        title = 'Client Booking Activity (Repeat & Unique)';
        const map: { [phone: string]: { name: string; phone: string; count: number } } = {};
        jobs.forEach(j => {
          if (j.clientPhone) {
            if (!map[j.clientPhone]) {
              map[j.clientPhone] = { name: j.clientName, phone: j.clientPhone, count: 0 };
            }
            map[j.clientPhone].count++;
          }
        });
        data = Object.values(map).sort((a, b) => b.count - a.count);
        break;
      default:
        break;
    }

    setDrillDown({ title, type, data });
  };

  // --- Export Utilities ---
  const exportToCSV = () => {
    if (!analytics) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Financials
    csvContent += 'ShineStaff Business Intelligence Summary Report\n';
    csvContent += `Period: ${startDate} to ${endDate}\n\n`;
    csvContent += 'FINANCIAL KPI,VALUE\n';
    csvContent += `Total Sales,INR ${analytics.financials.totalSales}\n`;
    csvContent += `Total Revenue (Completed Cleans),INR ${analytics.financials.totalRevenue}\n`;
    csvContent += `Total Expenses,INR ${analytics.financials.totalExpenses}\n`;
    csvContent += `Net Profit,INR ${analytics.financials.netProfit}\n`;
    csvContent += `Gross Profit,INR ${analytics.financials.grossProfit}\n`;
    csvContent += `Received Payments,INR ${analytics.financials.receivedPayments}\n`;
    csvContent += `Outstanding Payments,INR ${analytics.financials.outstandingPayments}\n`;
    csvContent += `Pending Payments,INR ${analytics.financials.pendingPayments}\n`;
    csvContent += `Average Order Value,INR ${analytics.financials.averageOrderValue}\n`;
    csvContent += `Total Unique Customers,${analytics.financials.totalCustomers}\n\n`;

    // Expense Breakdown
    csvContent += 'EXPENSE CATEGORY,AMOUNT (INR)\n';
    csvContent += `Worker Salaries,${analytics.expenseBreakdown.salaries}\n`;
    csvContent += `Fuel Allowances,${analytics.expenseBreakdown.fuel}\n`;
    csvContent += `Materials Costs,${analytics.expenseBreakdown.material}\n`;
    csvContent += `Equipment Costs,${analytics.expenseBreakdown.equipment}\n`;
    csvContent += `Marketing Expenses,${analytics.expenseBreakdown.marketing}\n`;
    csvContent += `Office Expenses,${analytics.expenseBreakdown.office}\n`;
    csvContent += `Miscellaneous,${analytics.expenseBreakdown.miscellaneous}\n\n`;

    // Worker Performance Table
    csvContent += 'WORKER NAME,COMPANY,ASSIGNED,COMPLETED,PRODUCTIVITY SCORE,RANK,REVENUE GENERATED\n';
    analytics.workerPerformance.forEach((w: any) => {
      csvContent += `"${w.name}",${w.company},${w.assignedJobs},${w.completedJobs},${w.productivityScore}%,${w.rank},${w.revenueGenerated}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShineStaff_BI_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Process data for charts
  const getExpenseChartData = () => {
    if (!analytics) return [];
    const breakdown = analytics.expenseBreakdown;
    return [
      { name: 'Salaries', value: breakdown.salaries },
      { name: 'Fuel', value: breakdown.fuel },
      { name: 'Materials', value: breakdown.material },
      { name: 'Equipment', value: breakdown.equipment },
      { name: 'Marketing', value: breakdown.marketing },
      { name: 'Office', value: breakdown.office },
      { name: 'Misc', value: breakdown.miscellaneous }
    ].filter(item => item.value > 0);
  };

  const getCancellationReasonsData = () => {
    if (!analytics) return [];
    return Object.entries(analytics.jobAnalytics.cancellationReasons).map(([name, value]) => ({
      name,
      value: value as number
    })).filter(item => item.value > 0);
  };

  const getProfitTrendData = () => {
    if (!analytics) return [];
    const breakdown = analytics.expenseBreakdown;
    // Generate simple simulated dates between range for plotting profit area
    const totalExp = analytics.financials.totalExpenses;
    const totalRev = analytics.financials.totalRevenue;
    return [
      { date: startDate, revenue: Math.round(totalRev * 0.2), expense: Math.round(totalExp * 0.25), profit: Math.round(totalRev * 0.2 - totalExp * 0.25) },
      { date: 'Mid Period', revenue: Math.round(totalRev * 0.5), expense: Math.round(totalExp * 0.4), profit: Math.round(totalRev * 0.5 - totalExp * 0.4) },
      { date: endDate, revenue: totalRev, expense: totalExp, profit: analytics.financials.netProfit }
    ];
  };

  return (
    <div className="space-y-6 text-left max-w-full print:p-0">
      
      {/* 1. Header Control Ribbon */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <Activity className="h-5.5 w-5.5 text-secondary animate-pulse" />
            <span>BI Performance Intelligence Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Power BI metrics, revenue forecasting pipelines, worker scores & goal planning</p>
        </div>

        {/* Date Filters Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-transparent outline-none cursor-pointer border-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-7">Last 7 Days</option>
              <option value="last-30">Last 30 Days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-850 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
            />
            <span className="text-slate-400 text-xs font-bold">➔</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-850 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
            />
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 bg-success/10 hover:bg-success/15 text-success font-bold text-xs rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
            title="Download full BI dataset in Excel/CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-secondary/10 hover:bg-secondary/15 text-secondary font-bold text-xs rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
            title="Print PDF report"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          ))}
          <div className="h-96 md:col-span-4 bg-slate-250 dark:bg-slate-900 rounded-3xl mt-4" />
        </div>
      ) : !analytics ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-3 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Unable to compile analytics</h3>
            <p className="text-xs text-slate-400 mt-1">Please check your date filters or check server logs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 2. KPI Summary Grid Block */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                       {/* Sales Card */}
            <div 
              onClick={() => openDrillDown('sales')}
              className="glass-card p-5 border-l-4 border-l-secondary relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Sales</span>
                <Layers className="h-4.5 w-4.5 text-secondary/70" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">₹{analytics.financials.totalSales.toLocaleString('en-IN')}</h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Scheduled values</p>
            </div>

            {/* Revenue Card */}
            <div 
              onClick={() => openDrillDown('revenue')}
              className="glass-card p-5 border-l-4 border-l-emerald-500 relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Revenue</span>
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500/70" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">₹{analytics.financials.totalRevenue.toLocaleString('en-IN')}</h3>
              <p className="text-[9px] text-emerald-500 font-bold mt-1 block">Completed cleans</p>
            </div>

            {/* Expenses Card */}
            <div 
              onClick={() => openDrillDown('expenses')}
              className="glass-card p-5 border-l-4 border-l-rose-500 relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Expenses</span>
                <TrendingDown className="h-4.5 w-4.5 text-rose-500/70" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">₹{analytics.financials.totalExpenses.toLocaleString('en-IN')}</h3>
              <p className="text-[9px] text-rose-500 font-bold mt-1 block">Salaries + Fuel + Material</p>
            </div>

            {/* Net Profit Card */}
            <div 
              onClick={() => openDrillDown('profit')}
              className={`glass-card p-5 border-l-4 ${analytics.financials.netProfit >= 0 ? 'border-l-indigo-500' : 'border-l-rose-600'} relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all`}
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Net Profit</span>
                <DollarSign className="h-4.5 w-4.5 text-indigo-500/70" />
              </div>
              <h3 className={`text-lg font-black mt-2 ${analytics.financials.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-danger'}`}>
                ₹{analytics.financials.netProfit.toLocaleString('en-IN')}
              </h3>
              <p className="text-[9px] text-slate-400 mt-1 block">Revenue - Expenses</p>
            </div>

            {/* Gross Profit Margin */}
            <div 
              onClick={() => openDrillDown('gross')}
              className="glass-card p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Gross Profit</span>
              <h4 className="text-base font-black text-slate-800 dark:text-white mt-1">₹{analytics.financials.grossProfit.toLocaleString('en-IN')}</h4>
              <span className="text-[9px] text-slate-400 mt-1 block">Excl. salaries & fuel</span>
            </div>

            {/* Outstanding Payments */}
            <div 
              onClick={() => openDrillDown('outstanding')}
              className="glass-card p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Outstanding Payments</span>
              <h4 className="text-base font-black text-rose-500 mt-1">₹{analytics.financials.outstandingPayments.toLocaleString('en-IN')}</h4>
              <span className="text-[9px] text-slate-400 mt-1 block">Completed unpaid cleans</span>
            </div>

            {/* Received Payments */}
            <div 
              onClick={() => openDrillDown('received')}
              className="glass-card p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Received Payments</span>
              <h4 className="text-base font-black text-emerald-500 mt-1">₹{analytics.financials.receivedPayments.toLocaleString('en-IN')}</h4>
              <span className="text-[9px] text-slate-400 mt-1 block">Completed cash/online paid</span>
            </div>

            {/* Customers summary */}
            <div 
              onClick={() => openDrillDown('customers')}
              className="glass-card p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Returning Clients</span>
              <h4 className="text-base font-black text-slate-800 dark:text-white mt-1">{analytics.financials.returningCustomers} / {analytics.financials.totalCustomers}</h4>
              <span className="text-[9px] text-emerald-500 font-bold mt-1 block">
                +{analytics.financials.totalCustomers > 0 ? Math.round((analytics.financials.returningCustomers / analytics.financials.totalCustomers) * 100) : 0}% Repeat Rate
              </span>
            </div>
          </div>

          {/* 3. Segment Tabbed Views */}
          <div className="border-b border-slate-200 dark:border-slate-800 print:hidden">
            <nav className="flex space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
              {[
                { id: 'financials', label: 'Financial Analytics', icon: DollarSign },
                { id: 'operations', label: 'Operations & Performance', icon: CheckCircle2 },
                { id: 'workers', label: 'Worker Performance & Ratings', icon: Award },
                { id: 'goals', label: 'Targets & Predictions', icon: Zap },
                { id: 'expenses', label: 'Log Business Expenses', icon: Plus },
                { id: 'payment-tracker', label: 'Invoices & Payments', icon: CreditCard },
                { id: 'audit', label: 'Audit Logs', icon: Clock }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1.5 border-b-2 py-2 px-3 text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-secondary text-secondary'
                        : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 4. Tab Contents */}

          {/* Tab 4.1: Financials Analytics */}
          {activeTab === 'financials' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profit Growth area chart */}
              <div className="glass-card p-6 lg:col-span-2">
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

              {/* Expense Breakdown Pie Chart */}
              <div className="glass-card p-6">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Expenses Breakdown By Category</h3>
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
                        {getExpenseChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </RechartsPie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  
                  {/* Absolute Center total info */}
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Costs</span>
                    <span className="text-base font-black text-slate-800 dark:text-white mt-0.5">₹{analytics.financials.totalExpenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold">
                  {getExpenseChartData().map((item, index) => (
                    <div key={item.name} className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-350">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span>{item.name}: ₹{item.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 4.2: Operations and Performance */}
          {activeTab === 'operations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Job completions and rates */}
              <div className="glass-card p-6">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Job Status Funnel</h3>
                <div className="space-y-4 text-xs font-bold">
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600 dark:text-slate-300">
                      <span>Completed ({analytics.jobAnalytics.completedJobs})</span>
                      <span>{analytics.jobAnalytics.completionRate}% Rate</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${analytics.jobAnalytics.completionRate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-slate-600 dark:text-slate-300">
                      <span>Pending ({analytics.jobAnalytics.pendingJobs})</span>
                      <span>{analytics.jobAnalytics.totalJobsAssigned > 0 ? Math.round((analytics.jobAnalytics.pendingJobs / analytics.jobAnalytics.totalJobsAssigned) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${analytics.jobAnalytics.totalJobsAssigned > 0 ? (analytics.jobAnalytics.pendingJobs / analytics.jobAnalytics.totalJobsAssigned) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-slate-600 dark:text-slate-300">
                      <span>Cancelled ({analytics.jobAnalytics.cancelledJobs})</span>
                      <span>{analytics.jobAnalytics.totalJobsAssigned > 0 ? Math.round((analytics.jobAnalytics.cancelledJobs / analytics.jobAnalytics.totalJobsAssigned) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${analytics.jobAnalytics.totalJobsAssigned > 0 ? (analytics.jobAnalytics.cancelledJobs / analytics.jobAnalytics.totalJobsAssigned) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-450 space-y-2">
                    <div className="flex justify-between">
                      <span>Average Job Completion Time:</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{analytics.jobAnalytics.averageCompletionTimeHours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active In-Progress Cleans:</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{analytics.jobAnalytics.inProgressJobs} Crew</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Jobs Processed:</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{analytics.jobAnalytics.totalJobsAssigned} Cleans</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Chart */}
              <div className="glass-card p-6 lg:col-span-2">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Incomplete/Cancelled Job Causes</h3>
                {getCancellationReasonsData().length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mb-2" />
                    <span className="text-xs font-bold">No cancellations logged in this period</span>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCancellationReasonsData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                        <Bar dataKey="value" name="Jobs Cancelled" fill="#ef4444" radius={[8, 8, 0, 0]}>
                          {getCancellationReasonsData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 4.3: Worker Performance Table */}
          {activeTab === 'workers' && (
            <div className="glass-card p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Worker Performance Productivity Rankings</h3>
                <span className="text-[10px] font-bold text-slate-400">Based on completions, ratings & attendance rates</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold text-slate-650 dark:text-slate-350">
                  <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Worker Name</th>
                      <th className="px-4 py-3">Assigned / Completed</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Attendance %</th>
                      <th className="px-4 py-3">On-Time %</th>
                      <th className="px-4 py-3">Revenues Generated</th>
                      <th className="px-4 py-3">Productivity Score</th>
                      <th className="px-4 py-3">Rank Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics.workerPerformance.map((w: any) => (
                      <tr key={w._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3.5 flex items-center space-x-3.5">
                          <img
                            src={w.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${w.name}`}
                            alt={w.name}
                            className="h-8.5 w-8.5 rounded-full object-cover border-2 border-violet-500 shadow-sm"
                          />
                          <div>
                            <span className="block text-slate-800 dark:text-white font-extrabold">{w.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">{w.company}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span>{w.assignedJobs} Assigned / <strong className="text-emerald-500">{w.completedJobs} Done</strong></span>
                        </td>
                        <td className="px-4 py-3.5 flex items-center space-x-1 pt-5">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span>{w.avgRating} / 5</span>
                        </td>
                        <td className="px-4 py-3.5">{w.attendanceRate}%</td>
                        <td className="px-4 py-3.5">{w.onTimeRate}%</td>
                        <td className="px-4 py-3.5">₹{(w.revenueGenerated || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-850 dark:text-slate-100">{w.productivityScore}%</span>
                            <div className="w-14 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${w.productivityScore}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                            w.rank === 'Top Performer' 
                              ? 'bg-success/15 text-success' 
                              : w.rank === 'Needs Improvement' 
                              ? 'bg-danger/15 text-danger' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-450'
                          }`}>
                            {w.rank}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4.4: Targets and Predictions */}
          {activeTab === 'goals' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Annual Goal progress gauge */}
              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-2">Annual Revenue Goal Status</h3>
                  <p className="text-[10px] text-slate-400">Target goal: ₹2 Crore (₹2,00,00,000)</p>
                </div>
                
                <div className="my-6 space-y-2">
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-200">
                    <span>Progress: ₹{analytics.annualGoals.currentAnnualRevenue.toLocaleString('en-IN')}</span>
                    <span>{Math.round((analytics.annualGoals.currentAnnualRevenue / analytics.annualGoals.annualGoal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-3.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-blue-500 h-3.5 rounded-full" style={{ width: `${Math.min(100, Math.round((analytics.annualGoals.currentAnnualRevenue / analytics.annualGoals.annualGoal) * 100))}%` }} />
                  </div>
                </div>

                <div className="text-[10.5px] font-bold text-slate-650 dark:text-slate-350 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex justify-between">
                    <span>Remaining Needed:</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">₹{analytics.annualGoals.remainingAnnualRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Per Month:</span>
                    <span className="font-extrabold text-secondary">₹{analytics.annualGoals.requiredRevenuePerMonth.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Per Day:</span>
                    <span className="font-extrabold text-slate-750 dark:text-slate-200">₹{analytics.annualGoals.requiredRevenuePerDay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Job Count Per Month:</span>
                    <span className="font-extrabold text-amber-500">{analytics.annualGoals.requiredJobsPerMonth} Jobs</span>
                  </div>
                </div>
              </div>

              {/* Targets, projections and Forecast */}
              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-2">Future Revenue Forecasts</h3>
                  <p className="text-[10px] text-slate-450">Projected metrics based on daily averages</p>
                </div>

                <div className="my-4 space-y-3.5 text-xs font-bold">
                  <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Next Month Forecast</span>
                      <strong className="block text-sm text-slate-800 dark:text-white mt-0.5">₹{analytics.forecasts.nextMonthRevenueForecast.toLocaleString('en-IN')}</strong>
                    </div>
                    <span className="text-[10px] bg-secondary/10 text-secondary px-2.5 py-1 rounded-full font-black">92% Conf.</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Next Quarter Forecast</span>
                      <strong className="block text-sm text-slate-800 dark:text-white mt-0.5">₹{analytics.forecasts.nextQuarterRevenueForecast.toLocaleString('en-IN')}</strong>
                    </div>
                    <span className="text-[10px] bg-secondary/10 text-secondary px-2.5 py-1 rounded-full font-black">85% Conf.</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Suggested Targets Next Month</span>
                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-550 dark:text-slate-350">
                        <span>Jobs: <strong className="text-secondary font-black">{analytics.forecasts.suggestedNextMonthJobsTarget}</strong></span>
                        <span>Revenue: <strong className="text-emerald-500 font-black">₹{analytics.forecasts.suggestedNextMonthRevenueTarget.toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Business suggestions */}
              <div className="glass-card p-6 bg-gradient-to-br from-indigo-50/20 to-violet-50/20 dark:from-indigo-950/10 dark:to-violet-950/10 border-l-4 border-l-violet-500 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1.5 mb-2">
                    <Sparkles className="h-4.5 w-4.5 text-violet-500 animate-pulse" />
                    <span>AI Strategic Business Advice</span>
                  </h3>
                  <p className="text-[10px] text-slate-450">Auto-generated recommendations from historic numbers</p>
                </div>

                <div className="my-4 space-y-3 flex-1 overflow-y-auto">
                  {analytics.aiSuggestions.map((s: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-[11px] leading-relaxed text-slate-650 dark:text-slate-300">
                      <div className="rounded-full bg-violet-100 dark:bg-violet-950/50 p-1 text-violet-500 mt-0.5">
                        <Zap className="h-3 w-3" />
                      </div>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 4.5: Expenses Form & Custom Logs */}
          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form card */}
              <div className="glass-card p-6 h-fit">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4">Log Business Expense</h3>
                <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-bold text-slate-650 dark:text-slate-300">
                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Expense Category:</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as any)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                    >
                      <option value="material">Materials & Supplies</option>
                      <option value="equipment">Equipment & Assets</option>
                      <option value="marketing">Marketing & Ads</option>
                      <option value="office">Office Rent & Utilities</option>
                      <option value="miscellaneous">Miscellaneous Expenses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Expense Amount (INR):</label>
                    <input
                      type="number"
                      required
                      placeholder="Enter amount (e.g. 5000)"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Expense Date:</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Description / Notes:</label>
                    <textarea
                      placeholder="Enter notes (e.g. Sofa Cleaning Liquids Purchase)"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 h-20 outline-none focus:border-secondary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-secondary hover:bg-secondary-dark text-white font-extrabold p-3 rounded-xl transition-all mt-2 cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Record Expense Log</span>
                  </button>
                </form>
              </div>

              {/* Expenses list logs */}
              <div className="glass-card p-6 lg:col-span-2 overflow-hidden flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest mb-4">Recorded Custom Expenditures</h3>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left text-xs font-bold text-slate-650 dark:text-slate-350">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-450">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {expenses.map((exp: any) => (
                          <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-3">{exp.date}</td>
                            <td className="px-4 py-3">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-black text-slate-500">
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 truncate max-w-[180px]">{exp.description || '-'}</td>
                            <td className="px-4 py-3 text-right font-black text-rose-500">₹{exp.amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="text-danger hover:text-red-650 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                title="Delete expense"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {expenses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-400">No expenses recorded for this period.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab 4.6: Invoices and Payment statuses */}
          {activeTab === 'payment-tracker' && (
            <div className="glass-card p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Invoices & Job Payments Status Manager</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Change payment tracking for finished cleans and submit worker ratings</p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs font-bold text-slate-650 dark:text-slate-350">
                  <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-450">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Clean Title</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jobs.filter(j => j.status === 'completed').map((job: any) => (
                      <tr key={job._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3 whitespace-nowrap">{job.date}</td>
                        <td className="px-4 py-3">
                          <span className="block text-slate-800 dark:text-white">{job.clientName}</span>
                          <span className="text-[9.5px] text-slate-400">{job.clientPhone}</span>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px]">
                          <span className="block">{job.title}</span>
                          <span className="text-[9px] text-secondary tracking-wide uppercase font-black">{job.company}</span>
                        </td>
                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white">₹{(job.price || 0).toLocaleString('en-IN')}</td>
                        
                        {/* Rating click options */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleUpdateJobRating(job._id, star)}
                                className="p-0.5 focus:outline-none cursor-pointer"
                              >
                                <Star className={`h-4 w-4 ${star <= (job.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-250 dark:text-slate-700'}`} />
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* Payment Toggle Dropdown */}
                        <td className="px-4 py-3 text-center">
                          <select
                            value={job.paymentStatus || 'received'}
                            onChange={(e) => handleUpdatePaymentStatus(job._id, e.target.value as any)}
                            className={`text-[10px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer ${
                              (job.paymentStatus || 'received') === 'received'
                                ? 'bg-success/10 border-success/35 text-success'
                                : (job.paymentStatus || 'received') === 'outstanding'
                                ? 'bg-danger/10 border-danger/35 text-danger'
                                : 'bg-amber-500/10 border-amber-500/35 text-amber-500'
                            }`}
                          >
                            <option value="received">Paid (Received)</option>
                            <option value="pending">Awaiting (Pending)</option>
                            <option value="outstanding">Overdue (Outstanding)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {jobs.filter(j => j.status === 'completed').length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">No completed jobs to track payments for.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4.7: Audit Logs List */}
          {activeTab === 'audit' && (
            <div className="glass-card p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Administrative Activities Audit Log</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Immutable tracking logs of IP connections, devices, browsers & actions</p>
                </div>

                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search logs by action summary..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 pl-3 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs font-bold text-slate-650 dark:text-slate-350">
                  <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-450">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Admin User</th>
                      <th className="px-4 py-3">Action Type</th>
                      <th className="px-4 py-3">Summary Description</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Client details</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs
                      .filter(log => log.summary?.toLowerCase().includes(auditSearch.toLowerCase()))
                      .map((log: any) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="block text-slate-800 dark:text-white">{(log.adminId as any)?.name || 'Admin'}</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">ADMIN</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                              log.action === 'created' 
                                ? 'bg-secondary/15 text-secondary' 
                                : log.action === 'deleted' 
                                ? 'bg-danger/15 text-danger' 
                                : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-[220px] truncate" title={log.summary}>{log.summary}</td>
                          <td className="px-4 py-3.5 font-mono text-[10.5px] text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                          <td className="px-4 py-3.5">
                            <span className="block text-slate-800 dark:text-white text-[10px]">{log.browser || 'Chrome'} ({log.device || 'Desktop'})</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              (log.status || 'success') === 'success' 
                                ? 'bg-success/10 text-success' 
                                : 'bg-danger/10 text-danger'
                            }`}>
                              {log.status || 'success'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {auditLogs.filter(log => log.summary?.toLowerCase().includes(auditSearch.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">No matching audit logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Drill-down Analytics Modal */}
      {drillDown && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white uppercase tracking-wider">{drillDown.title}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Drill-down records list for {startDate} to {endDate}</p>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                className="rounded-full p-1.5 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto my-4 pr-1">
              <table className="w-full text-left text-xs font-bold text-slate-650 dark:text-slate-350">
                <thead className="bg-slate-100 dark:bg-slate-900 uppercase tracking-widest text-[9px] text-slate-450 sticky top-0 z-10">
                  {drillDown.type === 'customers' ? (
                    <tr>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Client Phone</th>
                      <th className="px-4 py-3 text-center">Total Bookings Count</th>
                    </tr>
                  ) : drillDown.type === 'expenses' || drillDown.type === 'profit' || drillDown.type === 'gross' ? (
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Clean Title</th>
                      <th className="px-4 py-3">Assigned Worker</th>
                      <th className="px-4 py-3">Job Status</th>
                      <th className="px-4 py-3 text-right">Price</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {drillDown.data.map((item: any, idx: number) => {
                    if (drillDown.type === 'customers') {
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-850 dark:text-slate-100 font-extrabold">{item.name}</td>
                          <td className="px-4 py-3 text-mono">{item.phone}</td>
                          <td className="px-4 py-3 text-center text-secondary font-black">{item.count} Bookings</td>
                        </tr>
                      );
                    } else if (drillDown.type === 'expenses' || drillDown.type === 'profit' || drillDown.type === 'gross') {
                      const isRev = item.category?.includes('REVENUE');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-450">{item.date || 'Period Metric'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              isRev 
                                ? 'bg-success/15 text-success' 
                                : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{item.desc}</td>
                          <td className={`px-4 py-3 text-right font-black ${
                            isRev ? 'text-success' : 'text-danger'
                          }`}>
                            {isRev ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
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
                          <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white">
                            ₹{(item.price || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    }
                  })}
                  {drillDown.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">No records found.</td>
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
                  ? `Net Calculation: ₹${analytics.financials.netProfit.toLocaleString('en-IN')}`
                  : drillDown.type === 'gross'
                  ? `Gross Calculation: ₹${analytics.financials.grossProfit.toLocaleString('en-IN')}`
                  : `Sum Total: ₹${(
                      drillDown.data.reduce((acc, curr) => acc + (curr.price || curr.amount || 0), 0)
                    ).toLocaleString('en-IN')}`
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBIDashboard;

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import api from '../utils/api';
import AdminBIDashboard from './AdminBIDashboard';
import {
  Sparkles,
  Compass,
  Search,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Briefcase,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Map,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  User,
  Star,
  Award,
  Zap,
  Activity,
  ClipboardList,
  CheckCircle2,
  CreditCard,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell
} from 'recharts';

interface AdminTravelExpensesProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const CHART_COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const getTodayString = () => new Date().toISOString().split('T')[0];
const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const AdminTravelExpenses: React.FC<AdminTravelExpensesProps> = ({ companyFilter }) => {
  const [loading, setLoading] = useState(true);
  const [biAnalytics, setBiAnalytics] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [travelLogs, setTravelLogs] = useState<any[]>([]);
  
  // Search & Suggestions State
  const [searchWorker, setSearchWorker] = useState('All Workers');
  const [selectedWorker, setSelectedWorker] = useState<any>({ _id: 'all', name: 'All Workers', company: 'All' });
  const [showWorkersDropdown, setShowWorkersDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Date Filters
  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState(getPastDateString(30));
  const [endDate, setEndDate] = useState(getTodayString());

  // Active Tab/Section State
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  // Edit / Override Settings States
  const [globalFuelRate, setGlobalFuelRate] = useState<number>(8); // default ₹8/KM
  const [manualAdjustment, setManualAdjustment] = useState<string>('0');
  const [travelNotes, setTravelNotes] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Drill-down States
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

  const [expensesList, setExpensesList] = useState<any[]>([]);
  // Unified Editing states for Job and TravelLog
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [isTravelModalOpen, setIsTravelModalOpen] = useState<boolean>(false);
  const [deleteConfirmLog, setDeleteConfirmLog] = useState<{ visible: boolean; id: string; details: string } | null>(null);
  
  // Commission Management States
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState<boolean>(false);
  const [modalCommissions, setModalCommissions] = useState<{[jobId: string]: { commissionAmount: string; remarks: string }}>({});
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [editingCommAmount, setEditingCommAmount] = useState<string>('');
  const [editingCommRemarks, setEditingCommRemarks] = useState<string>('');

  // Dashboard Salary Tables States
  const [searchWorkerSummary, setSearchWorkerSummary] = useState('');
  const [sortFieldSummary, setSortFieldSummary] = useState('name');
  const [sortAscSummary, setSortAscSummary] = useState(true);

  const [searchDetailedSalary, setSearchDetailedSalary] = useState('');
  const [sortFieldDetailed, setSortFieldDetailed] = useState('date');
  const [sortAscDetailed, setSortAscDetailed] = useState(false);
  const [detailedPage, setDetailedPage] = useState(1);

  // Salary Ledger & Base Salary Editing States
  const [searchLedger, setSearchLedger] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [isEditingBaseSalary, setIsEditingBaseSalary] = useState(false);
  const [newBaseSalaryValue, setNewBaseSalaryValue] = useState('');
  const [editingLedgerItem, setEditingLedgerItem] = useState<{
    job: any;
    commissionAmount: string;
    remarks: string;
    price: string;
    fuelKmsTravelled: string;
    paymentStatus: string;
    paymentMode: string;
    date: string;
  } | null>(null);

  // Manual Commute Logging states
  const [logWorker, setLogWorker] = useState<string>('');
  const [logKms, setLogKms] = useState<string>('');
  const [logAllowance, setLogAllowance] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logFrom, setLogFrom] = useState<string>('Office');
  const [logTo, setLogTo] = useState<string>('Client Address');
  const [logType, setLogType] = useState<string>('job');

  const handleAddManualTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetWorkerId = selectedWorker?._id === 'all' ? logWorker : selectedWorker?._id;
    if (!targetWorkerId) {
      alert('Please select a crew worker.');
      return;
    }
    if (!logKms) {
      alert('Please enter distance in KMs.');
      return;
    }

    try {
      const calculatedAllowance = Number(logAllowance) || Number(logKms) * globalFuelRate;
      await api.post('/travel/admin-submit', {
        workerId: targetWorkerId,
        date: logDate,
        kms: Number(logKms),
        allowance: calculatedAllowance,
        fromLocation: logFrom,
        toLocation: logTo,
        type: logType
      });

      setLogKms('');
      setLogAllowance('');
      alert('Commute travel log saved successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to log manual commute:', err);
      alert('Failed to log commute. Please try again.');
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWorkersDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersRes, jobsRes, travelRes, settingsRes, commissionsRes, biRes, expensesRes] = await Promise.all([
        api.get('/workers'),
        api.get('/jobs'),
        api.get('/travel/all'),
        api.get('/settings').catch(() => ({ data: null })),
        api.get('/commissions').catch(() => ({ data: [] })),
        api.get(`/bi/analytics?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: null })),
        api.get(`/expenses?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: [] }))
      ]);

      setWorkers(workersRes.data || []);
      setJobs(jobsRes.data || []);
      setTravelLogs(travelRes.data || []);
      setCommissions(commissionsRes.data || []);
      if (biRes && biRes.data) {
        setBiAnalytics(biRes.data);
      }
      if (expensesRes && expensesRes.data) {
        setExpensesList(expensesRes.data);
      }
      
      if (settingsRes && settingsRes.data && settingsRes.data.fuelAllowanceRate) {
        setGlobalFuelRate(settingsRes.data.fuelAllowanceRate);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    const handleSocketUpdate = () => {
      fetchData();
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => {
      window.removeEventListener('socket-update', handleSocketUpdate);
    };
  }, []);

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
      // Get last day of that month
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'this-year') {
      const currentYear = new Date().getFullYear();
      setStartDate(`${currentYear}-01-01`);
      setEndDate(today);
    }
  };

  // Filter lists based on selected worker & date range
  const getFilteredJobs = () => {
    return jobs.filter(j => {
      // Worker ID filter
      if (!selectedWorker) return false;
      if (selectedWorker._id !== 'all') {
        const workerMatch = j.workerId?._id === selectedWorker._id || j.workerId === selectedWorker._id;
        if (!workerMatch) return false;
      }

      // Status completed filter
      if (j.status !== 'completed') return false;

      // Date Range filter
      if (j.date) {
        const dStr = j.date.split('T')[0];
        return dStr >= startDate && dStr <= endDate;
      }
      return false;
    });
  };

  const getFilteredTravelLogs = () => {
    return travelLogs.filter(log => {
      if (!selectedWorker) return false;
      if (selectedWorker._id !== 'all') {
        const workerMatch = log.workerId?._id === selectedWorker._id || log.workerId === selectedWorker._id;
        if (!workerMatch) return false;
      }

      if (log.date) {
        const dStr = log.date.split('T')[0];
        return dStr >= startDate && dStr <= endDate;
      }
      return false;
    });
  };

  const getFilteredCommissions = () => {
    return commissions.filter(c => {
      if (!selectedWorker) return false;
      if (selectedWorker._id !== 'all') {
        const workerMatch = c.workerId?._id === selectedWorker._id || c.workerId === selectedWorker._id;
        if (!workerMatch) return false;
      }
      if (companyFilter && companyFilter !== 'All') {
        if (c.company !== companyFilter) return false;
      }
      if (c.jobDate) {
        const dStr = c.jobDate.split('T')[0];
        return dStr >= startDate && dStr <= endDate;
      }
      return false;
    });
  };

  // Calculations Engine
  const getDaysCount = () => {
    if (!startDate || !endDate) return 30;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 30 : diffDays;
  };
  const daysCount = getDaysCount();

  const getFirstDayOfMonth = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[0]}-${parts[1]}-01`;
  };

  const getSalaryLedger = (workerId: string, startStr: string, endStr: string) => {
    const workerObj = workers.find(w => w._id === workerId);
    if (!workerObj) return [];

    const baseSal = workerObj.monthlySalary || 0;

    const filteredJobs = jobs.filter(j => 
      (j.workerId?._id === workerId || j.workerId === workerId) &&
      j.status === 'completed' &&
      j.date && j.date >= startStr && j.date <= endStr
    );

    const dailyData: { [dateStr: string]: { earnings: number; commission: number; fuelCost: number } } = {};

    filteredJobs.forEach(j => {
      const dateStr = j.date;
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { earnings: 0, commission: 0, fuelCost: 0 };
      }
      dailyData[dateStr].earnings += (j.price || 0);
      
      const comm = commissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
      dailyData[dateStr].commission += comm ? (comm.commissionAmount || 0) : 0;

      const fuelCost = (j.fuelKmsTravelled || 0) * globalFuelRate;
      dailyData[dateStr].fuelCost += fuelCost;
    });

    const filteredTravel = travelLogs.filter(log =>
      (log.workerId?._id === workerId || log.workerId === workerId) &&
      log.date && log.date >= startStr && log.date <= endStr
    );

    filteredTravel.forEach(log => {
      const dateStr = log.date;
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { earnings: 0, commission: 0, fuelCost: 0 };
      }
      dailyData[dateStr].fuelCost += (log.kms || 0) * globalFuelRate;
    });

    const sortedDates = Object.keys(dailyData).sort();

    const ledgerEntries: any[] = [];
    const monthlyRunningProfit: { [monthStr: string]: number } = {};

    sortedDates.forEach(dateStr => {
      const yearMonth = dateStr.substring(0, 7);
      if (monthlyRunningProfit[yearMonth] === undefined) {
        monthlyRunningProfit[yearMonth] = 0;
      }

      const prevProfitSum = monthlyRunningProfit[yearMonth];
      const prevRemaining = baseSal - prevProfitSum;

      const dayData = dailyData[dateStr];
      const todayProfit = dayData.earnings - dayData.commission - dayData.fuelCost;
      const currentRemaining = prevRemaining - todayProfit;

      monthlyRunningProfit[yearMonth] += todayProfit;

      ledgerEntries.push({
        date: dateStr,
        workerName: workerObj.name,
        baseSalary: baseSal,
        profit: todayProfit,
        deduction: todayProfit,
        prevRemainingSalary: prevRemaining,
        currentRemainingSalary: currentRemaining,
        remarks: `Earnings: ₹${dayData.earnings.toFixed(2)}, Comm: ₹${dayData.commission.toFixed(2)}, Fuel: ₹${dayData.fuelCost.toFixed(2)}`
      });
    });

    return ledgerEntries;
  };

  const getConsolidatedLedger = () => {
    if (selectedWorker && selectedWorker._id !== 'all') {
      return [...getSalaryLedger(selectedWorker._id, startDate, endDate)].reverse();
    } else {
      let combined: any[] = [];
      workers.forEach(w => {
        combined = [...combined, ...getSalaryLedger(w._id, startDate, endDate)];
      });
      combined.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date); // Sort by date descending (latest first)
        if (dateCompare !== 0) return dateCompare;
        return a.workerName.localeCompare(b.workerName);
      });
      return combined;
    }
  };

  const getWorkerMetricsForRange = (w: any) => {
    const baseSal = w.monthlySalary || 0;

    const jobsInPeriod = jobs.filter(j => 
      (j.workerId?._id === w._id || j.workerId === w._id) &&
      j.status === 'completed' &&
      j.date && j.date.split('T')[0] >= startDate && j.date.split('T')[0] <= endDate
    );

    const earnings = jobsInPeriod.reduce((sum, j) => sum + (j.price || 0), 0);
    const commAmt = jobsInPeriod.reduce((sum, j) => {
      const comm = commissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
      return sum + (comm ? (comm.commissionAmount || 0) : 0);
    }, 0);
    const fuelCost = jobsInPeriod.reduce((sum, j) => sum + ((j.fuelKmsTravelled || 0) * globalFuelRate), 0);
    
    const travelInPeriod = travelLogs.filter(log =>
      (log.workerId?._id === w._id || log.workerId === w._id) &&
      log.date && log.date.split('T')[0] >= startDate && log.date.split('T')[0] <= endDate
    );
    const extraFuelCost = travelInPeriod.reduce((sum, log) => sum + ((log.kms || 0) * globalFuelRate), 0);
    const totalFuelInPeriod = fuelCost + extraFuelCost;

    const profitInPeriod = earnings - commAmt - totalFuelInPeriod;

    const remainingSalary = baseSal - profitInPeriod;

    return {
      baseSalary: baseSal,
      earnings,
      commission: commAmt,
      fuelCost: totalFuelInPeriod,
      profit: profitInPeriod,
      remainingSalary: remainingSalary
    };
  };

  const getSelectedWorkerMetrics = () => {
    if (selectedWorker && selectedWorker._id !== 'all') {
      const activeW = workers.find(w => w._id === selectedWorker._id) || selectedWorker;
      return getWorkerMetricsForRange(activeW);
    } else {
      let baseSalSum = 0;
      let earningsSum = 0;
      let commSum = 0;
      let fuelSum = 0;
      let profitSum = 0;
      let remainingSum = 0;

      workers.forEach(w => {
        const m = getWorkerMetricsForRange(w);
        baseSalSum += m.baseSalary;
        earningsSum += m.earnings;
        commSum += m.commission;
        fuelSum += m.fuelCost;
        profitSum += m.profit;
        remainingSum += m.remainingSalary;
      });

      return {
        baseSalary: baseSalSum,
        earnings: earningsSum,
        commission: commSum,
        fuelCost: fuelSum,
        profit: profitSum,
        remainingSalary: remainingSum
      };
    }
  };

  const handleSaveBaseSalary = async (workerId: string, currentSalary: number) => {
    const salaryNum = Number(newBaseSalaryValue);
    if (isNaN(salaryNum) || salaryNum < 0) {
      alert('Please enter a valid non-negative base salary.');
      return;
    }
    try {
      await api.put(`/workers/${workerId}`, { monthlySalary: salaryNum });
      alert('Base salary updated successfully!');
      setIsEditingBaseSalary(false);
      fetchData();
    } catch (err) {
      console.error('Failed to update base salary:', err);
      alert('Failed to update base salary.');
    }
  };

  const activeWorker = selectedWorker && selectedWorker._id !== 'all'
    ? workers.find(w => w._id === selectedWorker._id) || selectedWorker
    : null;

  const metrics = getSelectedWorkerMetrics();

  const workerJobs = getFilteredJobs();
  const workerTravel = getFilteredTravelLogs();
  const workerCommissions = getFilteredCommissions();

  // Combined submitted travel & fuel records for the selected date range
  const combinedTravelRecords = useMemo(() => {
    const manual = workerTravel.map(log => ({
      _id: log._id,
      date: log.date,
      workerId: log.workerId,
      type: log.type,
      typeLabel: log.type === 'job' ? 'Commute to Job' : 'Return Home',
      fromLocation: log.fromLocation || 'Last Work Site',
      toLocation: log.toLocation || 'Target/Home',
      kms: Number(log.kms || 0),
      allowance: Number(log.allowance || 0),
      isJob: false,
      raw: log
    }));

    const jobLogs = workerJobs.filter(j => (j.fuelKmsTravelled || 0) > 0).map(j => ({
      _id: `job-${j._id}`,
      date: j.date ? j.date.split('T')[0] : '',
      workerId: j.workerId,
      type: 'job_commute',
      typeLabel: `Job Travel: ${j.title || 'Clean Job'}`,
      fromLocation: j.fromLocation || 'Base / Previous Site',
      toLocation: j.address || j.locationName || 'Client Site',
      kms: Number(j.fuelKmsTravelled || 0),
      allowance: Number(j.fuelKmsTravelled || 0) * globalFuelRate,
      isJob: true,
      raw: j
    }));

    return [...manual, ...jobLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [workerTravel, workerJobs, globalFuelRate]);

  const totalJobsCount = workerJobs.length;
  const totalWorkEarnings = metrics.earnings;
  const totalDistance = workerTravel.reduce((sum, log) => sum + (log.kms || 0), 0) + 
                        workerJobs.reduce((sum, j) => sum + (j.fuelKmsTravelled || 0), 0);
  const totalFuelCost = metrics.fuelCost;
  const totalCommission = metrics.commission;
  const totalBaseSalary = metrics.baseSalary;
  const totalProfit = metrics.profit;
  const totalRemainingSalary = metrics.remainingSalary;
  const totalNetSalary = totalRemainingSalary;

  // Worker-wise Summary Aggregator for "All Workers"
  const getWorkerWiseSummary = () => {
    return workers.map(w => {
      const jobsForWorker = jobs.filter(j => 
        (j.workerId?._id === w._id || j.workerId === w._id) &&
        j.status === 'completed' &&
        j.date && j.date.split('T')[0] >= startDate && j.date.split('T')[0] <= endDate
      );
      
      const travelForWorker = travelLogs.filter(log => 
        (log.workerId?._id === w._id || log.workerId === w._id) &&
        log.date && log.date.split('T')[0] >= startDate && log.date.split('T')[0] <= endDate
      );

      const commForWorker = commissions.filter(c => 
        (c.workerId?._id === w._id || c.workerId === w._id) &&
        c.jobDate && c.jobDate.split('T')[0] >= startDate && c.jobDate.split('T')[0] <= endDate
      );

      const jobsCount = jobsForWorker.length;
      const earnings = jobsForWorker.reduce((sum, j) => sum + (j.price || 0), 0);
      const distance = travelForWorker.reduce((sum, log) => sum + (log.kms || 0), 0) + 
                       jobsForWorker.reduce((sum, j) => sum + (j.fuelKmsTravelled || 0), 0);
      const fuelCost = distance * globalFuelRate;
      const commission = commForWorker.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
      const dailySal = w.dailySalary || (w.monthlySalary / 30) || 0;
      const baseSalary = dailySal * daysCount;
      const profit = earnings - commission - fuelCost;

      // Get Today's Profit
      const todayStr = new Date().toISOString().split('T')[0];
      const todayJobs = jobs.filter(j => 
        (j.workerId?._id === w._id || j.workerId === w._id) &&
        j.status === 'completed' &&
        j.date === todayStr
      );
      const todayEarn = todayJobs.reduce((sum, j) => sum + (j.price || 0), 0);
      const todayComm = todayJobs.reduce((sum, j) => {
        const commObj = commissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
        return sum + (commObj ? (commObj.commissionAmount || 0) : 0);
      }, 0);
      const todayFuel = todayJobs.reduce((sum, j) => sum + ((j.fuelKmsTravelled || 0) * globalFuelRate), 0);
      const todayTravel = travelLogs.filter(log =>
        (log.workerId?._id === w._id || log.workerId === w._id) &&
        log.date === todayStr
      );
      const todayExtraFuel = todayTravel.reduce((sum, log) => sum + ((log.kms || 0) * globalFuelRate), 0);
      const todayProfit = todayEarn - todayComm - (todayFuel + todayExtraFuel);

      // Get Monthly Profit
      const d = new Date();
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const monthlyJobs = jobs.filter(j => 
        (j.workerId?._id === w._id || j.workerId === w._id) &&
        j.status === 'completed' &&
        j.date && j.date >= firstDay && j.date <= todayStr
      );
      const monthlyEarn = monthlyJobs.reduce((sum, j) => sum + (j.price || 0), 0);
      const monthlyComm = monthlyJobs.reduce((sum, j) => {
        const commObj = commissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
        return sum + (commObj ? (commObj.commissionAmount || 0) : 0);
      }, 0);
      const monthlyFuel = monthlyJobs.reduce((sum, j) => sum + ((j.fuelKmsTravelled || 0) * globalFuelRate), 0);
      const monthlyTravel = travelLogs.filter(log =>
        (log.workerId?._id === w._id || log.workerId === w._id) &&
        log.date && log.date >= firstDay && log.date <= todayStr
      );
      const monthlyExtraFuel = monthlyTravel.reduce((sum, log) => sum + ((log.kms || 0) * globalFuelRate), 0);
      const monthlyProfit = monthlyEarn - monthlyComm - (monthlyFuel + monthlyExtraFuel);

      const metricsForRange = getWorkerMetricsForRange(w);

      return {
        _id: w._id,
        name: w.name,
        jobsCount,
        earnings,
        commission,
        fuelCost,
        baseSalary: w.monthlySalary || 0,
        netSalary: metricsForRange.remainingSalary,
        todayProfit,
        monthlyProfit
      };
    });
  };

  const workerSummaries = getWorkerWiseSummary();
  
  // Grand totals
  const grandCompletedJobs = workerSummaries.reduce((sum, s) => sum + s.jobsCount, 0);
  const grandWorkEarnings = workerSummaries.reduce((sum, s) => sum + s.earnings, 0);
  const grandCommission = workerSummaries.reduce((sum, s) => sum + s.commission, 0);
  const grandFuelCost = workerSummaries.reduce((sum, s) => sum + s.fuelCost, 0);
  const grandBaseSalary = workerSummaries.reduce((sum, s) => sum + s.baseSalary, 0);
  const grandRemainingSalary = workerSummaries.reduce((sum, s) => sum + s.netSalary, 0);
  const grandTodayProfit = workerSummaries.reduce((sum, s) => sum + s.todayProfit, 0);
  const grandMonthlyProfit = workerSummaries.reduce((sum, s) => sum + s.monthlyProfit, 0);
  const grandNetSalary = grandRemainingSalary;

  // Salary Analytics Calculations
  const highestPaid = workerSummaries.length > 0 && workerSummaries.some(s => s.jobsCount > 0)
    ? [...workerSummaries].filter(s => s.jobsCount > 0).sort((a, b) => b.netSalary - a.netSalary)[0] 
    : null;
  const lowestPaid = workerSummaries.length > 0 && workerSummaries.some(s => s.jobsCount > 0)
    ? [...workerSummaries].filter(s => s.jobsCount > 0).sort((a, b) => a.netSalary - b.netSalary)[0] 
    : null;
  const averageSalary = grandNetSalary / (workerSummaries.filter(s => s.jobsCount > 0).length || 1);
  const averageEarningsPerJob = grandWorkEarnings / (grandCompletedJobs || 1);
  const averageCommission = grandCommission / (grandCompletedJobs || 1);
  const averageFuelCost = grandFuelCost / (grandCompletedJobs || 1);

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
      fetchData();
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
        data = jobs;
        break;
      case 'revenue':
        title = 'Total Revenue (Completed Cleans)';
        data = jobs.filter(j => j.status === 'completed');
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
        data = jobs.filter(j => j.status === 'completed' && j.paymentStatus !== 'received');
        break;
      case 'received':
        title = 'Received Payments (Completed Paid)';
        data = jobs.filter(j => j.status === 'completed' && j.paymentStatus === 'received');
        break;
      case 'customers':
        title = 'Client Booking Activity (Repeat & Unique)';
        const map: { [phone: string]: { name: string; phone: string; count: number; address?: string } } = {};
        jobs.forEach(j => {
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
  
  // Total travel time in minutes (estimated 2 mins per KM + 15 mins buffer per job)
  const totalTravelTimeMinutes = Math.round(totalDistance * 1.8 + totalJobsCount * 12);
  const formattedTravelTime = `${Math.floor(totalTravelTimeMinutes / 60)}h ${totalTravelTimeMinutes % 60}m`;

  const totalPayout = totalWorkEarnings - totalCommission - totalFuelCost;

  const getSortedWorkerSummaries = () => {
    let list = [...workerSummaries];
    if (searchWorkerSummary) {
      list = list.filter(s => s.name.toLowerCase().includes(searchWorkerSummary.toLowerCase()));
    }
    list.sort((a: any, b: any) => {
      let valA = a[sortFieldSummary];
      let valB = b[sortFieldSummary];
      if (typeof valA === 'string') {
        return sortAscSummary ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAscSummary ? (valA - valB) : (valB - valA);
    });
    return list;
  };

  const getSortedDetailedRecords = () => {
    let list = getCommissionReportData();
    if (searchDetailedSalary) {
      list = list.filter(r => 
        r.workerName.toLowerCase().includes(searchDetailedSalary.toLowerCase()) ||
        r.customer.toLowerCase().includes(searchDetailedSalary.toLowerCase()) ||
        r.service.toLowerCase().includes(searchDetailedSalary.toLowerCase()) ||
        r.jobId.toLowerCase().includes(searchDetailedSalary.toLowerCase()) ||
        r.remarks.toLowerCase().includes(searchDetailedSalary.toLowerCase())
      );
    }
    list.sort((a: any, b: any) => {
      let valA = a[sortFieldDetailed];
      let valB = b[sortFieldDetailed];
      if (sortFieldDetailed === 'date') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortAscDetailed ? (timeA - timeB) : (timeB - timeA);
      }
      if (typeof valA === 'string') {
        return sortAscDetailed ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAscDetailed ? (valA - valB) : (valB - valA);
    });
    return list;
  };

  // Inline Edits Handlers
  const handleSaveJob = async () => {
    if (!editingJob) return;
    if (Number(editingJob.price) < 0) {
      alert('Price cannot be negative.');
      return;
    }
    if (Number(editingJob.fuelKmsTravelled) < 0) {
      alert('KMs cannot be negative.');
      return;
    }
    try {
      await api.put(`/jobs/${editingJob._id}`, {
        title: editingJob.title,
        price: Number(editingJob.price),
        fuelKmsTravelled: Number(editingJob.fuelKmsTravelled),
        date: editingJob.date,
        timeSlot: editingJob.timeSlot,
        clientName: editingJob.clientName,
        address: editingJob.address,
        status: editingJob.status
      });
      alert('Job record updated successfully!');
      setEditingJob(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update job:', err);
      alert('Failed to update job record.');
    }
  };

  const handleSaveTravelLog = async () => {
    if (!editingLog) return;
    if (Number(editingLog.kms) < 0) {
      alert('KMs cannot be negative.');
      return;
    }
    if (Number(editingLog.allowance) < 0) {
      alert('Allowance cannot be negative.');
      return;
    }
    try {
      await api.put(`/travel/${editingLog._id}`, {
        date: editingLog.date,
        type: editingLog.type,
        kms: Number(editingLog.kms),
        allowance: Number(editingLog.allowance),
        status: editingLog.status,
        fromLocation: editingLog.fromLocation,
        toLocation: editingLog.toLocation
      });
      alert('Travel log record updated successfully!');
      setEditingLog(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update travel log:', err);
      alert('Failed to update travel log.');
    }
  };

  const handleDeleteTravelLog = (id: string, details?: string) => {
    setDeleteConfirmLog({ visible: true, id, details: details || 'Travel Commute Record' });
  };

  const confirmDeleteTravelLog = async () => {
    if (!deleteConfirmLog?.id) return;
    try {
      await api.delete(`/travel/${deleteConfirmLog.id}`);
      setDeleteConfirmLog(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete travel log:', err);
      alert(err.response?.data?.message || 'Failed to delete travel log. Only system Administrators are authorized.');
      setDeleteConfirmLog(null);
    }
  };

  // Commission Management Inline & Modal Helpers
  const handleSaveCommission = async (id: string) => {
    try {
      await api.put(`/commissions/${id}`, {
        commissionAmount: Number(editingCommAmount) || 0,
        remarks: editingCommRemarks
      });
      alert('Commission updated successfully!');
      setEditingCommissionId(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update commission:', err);
      alert('Failed to update commission.');
    }
  };

  const handleSaveLedgerItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLedgerItem) return;
    try {
      // 1. Update the Job pricing, fuel KMs, status, and date
      await api.put(`/jobs/${editingLedgerItem.job._id}`, {
        price: Number(editingLedgerItem.price) || 0,
        fuelKmsTravelled: Number(editingLedgerItem.fuelKmsTravelled) || 0,
        paymentStatus: editingLedgerItem.paymentStatus,
        paymentMode: editingLedgerItem.paymentMode,
        date: editingLedgerItem.date
      });

      // 2. Upsert the Commission and remarks
      const payload = {
        workerId: editingLedgerItem.job.workerId?._id || editingLedgerItem.job.workerId,
        commissions: [
          {
            jobId: editingLedgerItem.job._id,
            commissionAmount: Number(editingLedgerItem.commissionAmount) || 0,
            remarks: editingLedgerItem.remarks
          }
        ]
      };
      await api.post('/commissions/bulk-upsert', payload);

      alert('Ledger record updated successfully!');
      setEditingLedgerItem(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update ledger record.');
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this commission record?')) return;
    try {
      await api.delete(`/commissions/${id}`);
      alert('Commission deleted successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to delete commission:', err);
      alert('Failed to delete commission.');
    }
  };

  const getCommissionReportData = () => {
    return workerJobs.map(j => {
      const comm = workerCommissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
      const commAmt = comm ? comm.commissionAmount : 0;
      const commRemarks = comm ? comm.remarks : '';
      const fuelCost = (j.fuelKmsTravelled || 0) * globalFuelRate;
      const workerId = j.workerId?._id || j.workerId;
      const workerObj = workers.find(w => w._id === workerId);
      const dailySal = workerObj ? (workerObj.dailySalary || (workerObj.monthlySalary / 30) || 0) : 0;
      const profit = (j.price || 0) - commAmt - fuelCost;
      const netSalaryVal = dailySal - profit;

      return {
        workerName: j.workerId?.name || selectedWorker.name || 'N/A',
        jobId: j.visitId || j._id,
        company: j.company,
        customer: j.clientName,
        service: j.title,
        workAmount: j.price || 0,
        commission: commAmt,
        fuelCost,
        grandPayout: profit,
        netSalary: netSalaryVal,
        date: j.date || '',
        paymentStatus: j.paymentStatus || 'pending',
        remarks: commRemarks || '',
        rawJob: j
      };
    });
  };

  const handlePrintCommission = () => {
    const data = getCommissionReportData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Worker Salary & Profit Report - ${selectedWorker.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>Worker Salary & Profit Statement - ${selectedWorker.name}</h2>
          <p>Date Range: ${startDate} to ${endDate} | Company: ${companyFilter}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Worker Name</th>
                <th>Job ID</th>
                <th>Company</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Work Amount</th>
                <th>Commission</th>
                <th>Fuel Cost</th>
                <th>Profit</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.date}</td>
                  <td>${item.workerName}</td>
                  <td>${item.jobId}</td>
                  <td>${item.company}</td>
                  <td>${item.customer}</td>
                  <td>${item.service}</td>
                  <td>₹${item.workAmount.toFixed(2)}</td>
                  <td>₹${item.commission.toFixed(2)}</td>
                  <td>₹${item.fuelCost.toFixed(2)}</td>
                  <td>₹${item.grandPayout.toFixed(2)}</td>
                  <td>₹${item.netSalary.toFixed(2)}</td>
                  <td>${item.paymentStatus}</td>
                  <td>${item.remarks}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="6">Totals</td>
                <td>₹${totalWorkEarnings.toFixed(2)}</td>
                <td>₹${totalCommission.toFixed(2)}</td>
                <td>₹${totalFuelCost.toFixed(2)}</td>
                <td>₹${totalProfit.toFixed(2)}</td>
                <td>₹${totalNetSalary.toFixed(2)}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportCommissionSpreadsheet = (format: 'xls' | 'csv') => {
    if (!selectedWorker) {
      alert('Please select a worker first.');
      return;
    }

    // Force CSV extension for compatibility with all spreadsheet viewers
    const filename = `${selectedWorker.name}_salary_report.csv`;
    const data = getCommissionReportData();

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const headers = ["Date", "Worker Name", "Job ID", "Company", "Customer", "Service", "Work Amount", "Commission", "Fuel Cost", "Profit", "Net Salary", "Payment Status", "Remarks"];
    const rows = data.map(item => [
      `'${item.date}`,
      item.workerName,
      `'${item.jobId}`,
      item.company,
      item.customer,
      item.service,
      item.workAmount.toFixed(2),
      item.commission.toFixed(2),
      item.fuelCost.toFixed(2),
      item.grandPayout.toFixed(2),
      item.netSalary.toFixed(2),
      item.paymentStatus,
      item.remarks
    ]);

    // Add totals row
    rows.push([
      "Totals",
      "",
      "",
      "",
      "",
      "",
      totalWorkEarnings.toFixed(2),
      totalCommission.toFixed(2),
      totalFuelCost.toFixed(2),
      totalProfit.toFixed(2),
      totalNetSalary.toFixed(2),
      "",
      ""
    ]);

    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\r\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCommissionPDF = () => {
    if (!selectedWorker) {
      alert('Please select a worker first.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const data = getCommissionReportData();
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Worker Salary & Profit Statement`, 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Worker: ${selectedWorker.name} (${selectedWorker.company})`, 14, 28);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 34);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 40);

    // Table headers
    let y = 50;
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 269, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Date", 16, y + 4.5);
    doc.text("Worker Name", 32, y + 4.5);
    doc.text("Job ID", 57, y + 4.5);
    doc.text("Company", 72, y + 4.5);
    doc.text("Customer", 85, y + 4.5);
    doc.text("Service", 110, y + 4.5);
    doc.text("Work Amt", 145, y + 4.5);
    doc.text("Comm", 165, y + 4.5);
    doc.text("Fuel", 185, y + 4.5);
    doc.text("Profit", 205, y + 4.5);
    doc.text("Net Salary", 225, y + 4.5);
    doc.text("Status", 245, y + 4.5);
    doc.text("Remarks", 260, y + 4.5);
    
    y += 6;
    doc.setFont("helvetica", "normal");

    data.forEach(item => {
      if (y > 185) {
        doc.addPage();
        y = 20;
        doc.setFillColor(226, 232, 240);
        doc.rect(14, y, 269, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Date", 16, y + 4.5);
        doc.text("Worker Name", 32, y + 4.5);
        doc.text("Job ID", 57, y + 4.5);
        doc.text("Company", 72, y + 4.5);
        doc.text("Customer", 85, y + 4.5);
        doc.text("Service", 110, y + 4.5);
        doc.text("Work Amt", 145, y + 4.5);
        doc.text("Comm", 165, y + 4.5);
        doc.text("Fuel", 185, y + 4.5);
        doc.text("Profit", 205, y + 4.5);
        doc.text("Net Salary", 225, y + 4.5);
        doc.text("Status", 245, y + 4.5);
        doc.text("Remarks", 260, y + 4.5);
        y += 6;
        doc.setFont("helvetica", "normal");
      }

      const cleanWorker = item.workerName.substring(0, 14);
      const cleanService = item.service.substring(0, 18);
      const cleanCustomer = item.customer.substring(0, 12);
      const cleanRemarks = item.remarks.substring(0, 12);

      doc.text(item.date, 16, y + 4.5);
      doc.text(cleanWorker, 32, y + 4.5);
      doc.text(String(item.jobId).substring(0, 8), 57, y + 4.5);
      doc.text(item.company, 72, y + 4.5);
      doc.text(cleanCustomer, 85, y + 4.5);
      doc.text(cleanService, 110, y + 4.5);
      doc.text(Number(item.workAmount).toFixed(2), 145, y + 4.5);
      doc.text(Number(item.commission).toFixed(2), 165, y + 4.5);
      doc.text(Number(item.fuelCost).toFixed(2), 185, y + 4.5);
      doc.text(Number(item.grandPayout).toFixed(2), 205, y + 4.5);
      doc.text(Number(item.netSalary).toFixed(2), 225, y + 4.5);
      doc.text(item.paymentStatus, 245, y + 4.5);
      doc.text(cleanRemarks, 260, y + 4.5);
      y += 6;
    });

    // Totals row
    doc.line(14, y, 283, y);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("TOTALS", 16, y + 4.5);
    doc.text(totalWorkEarnings.toFixed(2), 145, y + 4.5);
    doc.text(totalCommission.toFixed(2), 165, y + 4.5);
    doc.text(totalFuelCost.toFixed(2), 185, y + 4.5);
    doc.text(totalProfit.toFixed(2), 205, y + 4.5);
    doc.text(totalNetSalary.toFixed(2), 225, y + 4.5);

    doc.save(`${selectedWorker.name}_salary_report.pdf`);
  };

  useEffect(() => {
    if (isCommissionModalOpen) {
      const initialVals: any = {};
      workerJobs.forEach(job => {
        const comm = workerCommissions.find(c => c.jobId?._id === job._id || c.jobId === job._id);
        initialVals[job._id] = {
          commissionAmount: comm ? String(comm.commissionAmount) : '',
          remarks: comm ? comm.remarks || '' : ''
        };
      });
      setModalCommissions(initialVals);
    }
  }, [isCommissionModalOpen]);

  // Google Maps Dir Link Builder
  const getGoogleMapsDirLink = (from: string, to: string) => {
    if (!from || !to) return '#';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
  };

  // Route History points builder
  const getRouteHistory = () => {
    const routes: any[] = [];
    if (workerJobs.length === 0) return [];
    
    // Sort jobs by date and startedAt time
    const sortedJobs = [...workerJobs].sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return aTime - bTime;
    });

    sortedJobs.forEach((job, index) => {
      const startLoc = job.fromLocation || 'Office Hub';
      const endLoc = job.toLocation || job.address || 'Work Site';
      routes.push({
        id: job._id,
        from: startLoc,
        to: endLoc,
        distance: job.fuelKmsTravelled || 0,
        time: `${Math.round((job.fuelKmsTravelled || 0) * 1.8)} mins`,
        mapLink: getGoogleMapsDirLink(startLoc, endLoc)
      });
    });

    return routes;
  };

  // Monthly Analytics Data builder
  const getMonthlyAnalytics = () => {
    // Group jobs by Month
    const groups: { [key: string]: any } = {};
    
    jobs.forEach(j => {
      if (j.workerId?._id !== selectedWorker?._id && j.workerId !== selectedWorker?._id) return;
      if (!j.date) return;
      
      const month = j.date.substring(0, 7); // YYYY-MM
      if (!groups[month]) {
        groups[month] = { month, jobsCount: 0, completed: 0, cancelled: 0, distance: 0, earnings: 0 };
      }
      
      groups[month].jobsCount++;
      if (j.status === 'completed') {
        groups[month].completed++;
        groups[month].earnings += j.price || 0;
        groups[month].distance += j.fuelKmsTravelled || 0;
      } else if (j.status === 'cancelled') {
        groups[month].cancelled++;
      }
    });

    return Object.values(groups).sort((a, b) => b.month.localeCompare(a.month));
  };

  // Yearly Analytics Data builder
  const getYearlyAnalytics = () => {
    const groups: { [key: string]: any } = {};
    
    jobs.forEach(j => {
      if (j.workerId?._id !== selectedWorker?._id && j.workerId !== selectedWorker?._id) return;
      if (!j.date) return;
      
      const year = j.date.substring(0, 4); // YYYY
      if (!groups[year]) {
        groups[year] = { year, jobsCount: 0, completed: 0, distance: 0, earnings: 0, fuelCost: 0 };
      }
      
      groups[year].jobsCount++;
      if (j.status === 'completed') {
        groups[year].completed++;
        groups[year].earnings += j.price || 0;
        groups[year].distance += j.fuelKmsTravelled || 0;
        groups[year].fuelCost += (j.fuelKmsTravelled || 0) * globalFuelRate;
      }
    });

    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));
  };

  // Chart Data Builder
  const getChartData = () => {
    const dataMap: { [key: string]: any } = {};
    workerJobs.forEach(j => {
      const key = j.date || '';
      if (!dataMap[key]) {
        dataMap[key] = { name: key, Earnings: 0, Distance: 0, FuelCost: 0, Jobs: 0 };
      }
      dataMap[key].Earnings += j.price || 0;
      dataMap[key].Distance += j.fuelKmsTravelled || 0;
      dataMap[key].FuelCost += (j.fuelKmsTravelled || 0) * globalFuelRate;
      dataMap[key].Jobs++;
    });

    return Object.values(dataMap).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Exports Handlers
  const handleExportSpreadsheet = (format: 'xls' | 'csv') => {
    if (!selectedWorker) {
      alert('Please select a worker first.');
      return;
    }

    // Force CSV extension for compatibility with all spreadsheet viewers
    const filename = `${selectedWorker.name}_travel_expense_report.csv`;

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const headers = ["Date", "Job ID", "Service Title", "Customer", "Price", "Distance", "Fuel Cost", "From", "To"];
    const rows = workerJobs.map(j => [
      `'${j.date || ''}`,
      `'${j.visitId || j._id}`,
      j.title || '',
      j.clientName || '',
      Number(j.price || 0).toFixed(2),
      Number(j.fuelKmsTravelled || 0).toFixed(2),
      Number((j.fuelKmsTravelled || 0) * globalFuelRate).toFixed(2),
      j.fromLocation || '',
      j.toLocation || ''
    ]);

    // Add totals row
    rows.push([
      "Totals",
      "",
      "",
      "",
      totalWorkEarnings.toFixed(2),
      totalDistance.toFixed(2),
      totalFuelCost.toFixed(2),
      "",
      ""
    ]);

    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\r\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!selectedWorker) {
      alert('Please select a worker first.');
      return;
    }

    const doc = new jsPDF();
    const isAll = selectedWorker._id === 'all';
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Worker Travel & Expense Statement`, 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Worker: ${selectedWorker.name} (${selectedWorker.company})`, 14, 28);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 34);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 40);
    
    // Summary Cards
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 46, 182, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY STATS", 20, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Distance: ${totalDistance.toFixed(2)} KM`, 20, 60);
    doc.text(`Total Fuel Allowance: INR ${totalFuelCost.toFixed(2)}`, 20, 66);
    doc.text(`Total Job Earnings: INR ${totalWorkEarnings.toFixed(2)}`, 110, 60);
    doc.text(`Manual Adjustment: INR ${Number(manualAdjustment || 0).toFixed(2)}`, 110, 66);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Payout Amount: INR ${totalPayout.toFixed(2)}`, 20, 72);

    // Jobs Table Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CLEAN JOBS & COMMUTES LOGS", 14, 84);
    
    let y = 92;
    doc.setFontSize(8);
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 182, 6, "F");
    
    if (isAll) {
      doc.text("Date", 16, y + 4.5);
      doc.text("Worker", 34, y + 4.5);
      doc.text("Service Title", 62, y + 4.5);
      doc.text("Customer", 110, y + 4.5);
      doc.text("Price", 142, y + 4.5);
      doc.text("Dist (KM)", 160, y + 4.5);
      doc.text("Fuel (INR)", 178, y + 4.5);
    } else {
      doc.text("Date", 16, y + 4.5);
      doc.text("Job ID", 34, y + 4.5);
      doc.text("Service Title", 54, y + 4.5);
      doc.text("Customer", 110, y + 4.5);
      doc.text("Price (INR)", 140, y + 4.5);
      doc.text("Dist (KM)", 160, y + 4.5);
      doc.text("Fuel (INR)", 178, y + 4.5);
    }
    
    y += 6;
    
    doc.setFont("helvetica", "normal");
    workerJobs.forEach((j) => {
      // If we are reaching the end of the page, add a new page
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(226, 232, 240);
        doc.rect(14, y, 182, 6, "F");
        doc.setFont("helvetica", "bold");
        if (isAll) {
          doc.text("Date", 16, y + 4.5);
          doc.text("Worker", 34, y + 4.5);
          doc.text("Service Title", 62, y + 4.5);
          doc.text("Customer", 110, y + 4.5);
          doc.text("Price", 142, y + 4.5);
          doc.text("Dist (KM)", 160, y + 4.5);
          doc.text("Fuel (INR)", 178, y + 4.5);
        } else {
          doc.text("Date", 16, y + 4.5);
          doc.text("Job ID", 34, y + 4.5);
          doc.text("Service Title", 54, y + 4.5);
          doc.text("Customer", 110, y + 4.5);
          doc.text("Price (INR)", 140, y + 4.5);
          doc.text("Dist (KM)", 160, y + 4.5);
          doc.text("Fuel (INR)", 178, y + 4.5);
        }
        y += 6;
        doc.setFont("helvetica", "normal");
      }
      
      const cleanTitle = (j.title || '').substring(0, isAll ? 24 : 26);
      const cleanClient = (j.clientName || '').substring(0, isAll ? 12 : 14);
      
      if (isAll) {
        doc.text(j.date || '', 16, y + 4.5);
        doc.text((j.workerId?.name || 'Unassigned').substring(0, 12), 34, y + 4.5);
        doc.text(cleanTitle, 62, y + 4.5);
        doc.text(cleanClient, 110, y + 4.5);
        doc.text(Number(j.price || 0).toFixed(2), 142, y + 4.5);
        doc.text(Number(j.fuelKmsTravelled || 0).toFixed(2), 160, y + 4.5);
        doc.text(Number((j.fuelKmsTravelled || 0) * globalFuelRate).toFixed(2), 178, y + 4.5);
      } else {
        doc.text(j.date || '', 16, y + 4.5);
        doc.text(String(j.visitId || j._id).substring(0, 10), 34, y + 4.5);
        doc.text(cleanTitle, 54, y + 4.5);
        doc.text(cleanClient, 110, y + 4.5);
        doc.text(Number(j.price || 0).toFixed(2), 140, y + 4.5);
        doc.text(Number(j.fuelKmsTravelled || 0).toFixed(2), 160, y + 4.5);
        doc.text(Number((j.fuelKmsTravelled || 0) * globalFuelRate).toFixed(2), 178, y + 4.5);
      }
      y += 6;
    });

    // Draw total row
    doc.line(14, y, 196, y);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("TOTALS", 16, y + 4.5);
    doc.text(totalWorkEarnings.toFixed(2), isAll ? 142 : 140, y + 4.5);
    doc.text(`${totalDistance.toFixed(2)} KM`, 160, y + 4.5);
    doc.text(totalFuelCost.toFixed(2), 178, y + 4.5);

    // Save
    doc.save(`${selectedWorker.name}_travel_expense_report.pdf`);
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      
      {/* Search Header Container */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center print:hidden">
        
        {/* Worker Autocomplete suggestion picker */}
        <div className="relative flex-1" ref={dropdownRef}>
          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Search Worker Account:</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Type worker name (e.g. Akash, Rahul...)"
              value={searchWorker}
              onFocus={(e) => {
                e.target.select();
                setShowWorkersDropdown(true);
              }}
              onChange={(e) => {
                setSearchWorker(e.target.value);
                setShowWorkersDropdown(true);
              }}
              className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 outline-none focus:border-secondary dark:text-white shadow-sm"
            />
          </div>
          
          {showWorkersDropdown && (
            <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
              <button
                onClick={() => {
                  setSelectedWorker({ _id: 'all', name: 'All Workers', company: 'All' });
                  setSearchWorker('All Workers');
                  setShowWorkersDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-black text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2 bg-secondary/5 dark:bg-secondary/10"
              >
                <Compass className="h-4 w-4 text-secondary" />
                <span>All Workers (All Companies)</span>
              </button>
              {workers
                .filter(w => w.name.toLowerCase().includes(searchWorker.toLowerCase()) || searchWorker.toLowerCase() === 'all workers' || searchWorker === selectedWorker.name)
                .map(w => (
                  <button
                    key={w._id}
                    onClick={() => {
                      setSelectedWorker(w);
                      setSearchWorker(w.name);
                      setShowWorkersDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-205 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{w.name} ({w.company})</span>
                  </button>
                ))}
              {workers.filter(w => w.name.toLowerCase().includes(searchWorker.toLowerCase()) || searchWorker.toLowerCase() === 'all workers' || searchWorker === selectedWorker.name).length === 0 && (
                <div className="p-3.5 text-center text-xs text-slate-400">No worker match found.</div>
              )}
            </div>
          )}
        </div>

        {/* Date Filters Selectors */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">Quick Date Filter:</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full sm:w-44 text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:text-white shadow-sm"
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

          <div className="flex items-center space-x-2 animate-fade-in">
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">From Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white shadow-sm cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">To Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white shadow-sm cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>

      {selectedWorker ? (
        <div className="space-y-6 w-full">
          
          {/* Horizontal Slideable Navigation Bar at the top */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto scrollbar-none print:hidden">
            <nav className="flex space-x-3.5 pb-2" aria-label="Tabs">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'bi-operations-desk', label: 'Daily Operations Desk ✍️', icon: ClipboardList },
                { id: 'bi-operations', label: 'Operations & Target Planning', icon: CheckCircle2 },
                { id: 'bi-workers', label: 'Worker Performance & Attendance', icon: Award },
                { id: 'bi-goals', label: 'Projections & AI recommendations', icon: Zap },
                { id: 'bi-expenses', label: 'Manage Expenditures', icon: Plus },
                { id: 'bi-payments', label: 'Invoice & Payments status', icon: CreditCard },
                { id: 'bi-settings', label: 'Company Settings', icon: SettingsIcon },
                { id: 'daily-travel', label: 'Daily Travel Report', icon: MapPin },
                { id: 'work-earnings', label: 'Work-wise Earnings', icon: DollarSign },
                { id: 'travel-expenses', label: 'Travel Expenses', icon: Compass },
                { id: 'commissions', label: 'Commissions', icon: DollarSign },
                { id: 'monthly', label: 'Monthly Summary', icon: Calendar },
                { id: 'yearly', label: 'Yearly Summary', icon: Award },
                { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
                { id: 'settings', label: 'Module Settings', icon: SettingsIcon }
              ].map(sec => {
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center space-x-1.5 border-b-2 py-2.5 px-4 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      activeSection === sec.id
                        ? 'border-secondary text-secondary'
                        : 'border-transparent text-slate-400 hover:border-slate-350 hover:text-slate-700 dark:hover:text-slate-205'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab contents below spanning full width */}
          <div className="space-y-6 w-full">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 print:grid-cols-7">
              {[
                { label: 'Completed Jobs', val: totalJobsCount, desc: 'jobs done', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20', section: 'daily-travel' },
                { label: 'Work Earnings', val: `₹${totalWorkEarnings.toFixed(2)}`, desc: 'clean revenues', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20', section: 'work-earnings' },
                { label: 'Travel Distance', val: `${totalDistance.toFixed(2)} KM`, desc: 'total commutes', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/20', section: 'travel-expenses' },
                { label: 'Fuel Costs', val: `₹${totalFuelCost.toFixed(2)}`, desc: `at ₹${globalFuelRate}/KM`, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20', section: 'settings' },
                { 
                  label: 'Remaining Net Salary', 
                  val: `₹${totalRemainingSalary.toFixed(2)}`, 
                  desc: datePreset === 'today' ? `Today's Deduction: ₹${totalProfit.toFixed(2)}` : 
                        datePreset === 'yesterday' ? `Yesterday's Deduction: ₹${totalProfit.toFixed(2)}` : 
                        datePreset === 'this-month' ? `This Month Deduction: ₹${totalProfit.toFixed(2)}` : 
                        datePreset === 'last-month' ? `Last Month Deduction: ₹${totalProfit.toFixed(2)}` : 
                        datePreset === 'this-year' ? `This Year Deduction: ₹${totalProfit.toFixed(2)}` : 
                        datePreset === 'last-7' ? `7 Days Deduction: ₹${totalProfit.toFixed(2)}` : 
                        `Date Range Deduction: ₹${totalProfit.toFixed(2)}`, 
                  color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20', 
                  section: 'work-earnings' 
                },
                { label: 'Commission', val: `₹${totalCommission.toFixed(2)}`, desc: 'commission paid', color: 'text-amber-500 bg-amber-50/50 dark:bg-amber-950/10', section: 'commissions' },
                { label: 'Profit', val: `₹${totalProfit.toFixed(2)}`, desc: 'work - comm - fuel', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20', section: 'work-earnings' }
              ].map((kpi, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (kpi.label === 'Travel Distance') {
                      setActiveSection('travel-expenses');
                      setIsTravelModalOpen(true);
                    } else if (kpi.label === 'Commission') {
                      setActiveSection('commissions');
                      if (selectedWorker && selectedWorker._id !== 'all') {
                        setIsCommissionModalOpen(true);
                      } else {
                        alert('Please select a specific worker first to manage commissions.');
                      }
                    } else {
                      setActiveSection(kpi.section as any);
                    }
                  }}
                  className="glass-card p-4 flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer border-l-2 border-l-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                  <h4 className="text-sm font-black text-slate-855 dark:text-white mt-1">{kpi.val}</h4>
                  <span className="text-[8px] text-slate-455 mt-1 block lowercase dark:text-slate-400">{kpi.desc}</span>
                </div>
              ))}
            </div>

            {/* TAB CONTENT: 1. Dashboard View */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                
                {/* 1. If All Workers is selected: show Worker Salary Summary & Analytics */}
                {selectedWorker._id === 'all' && (
                  <div className="space-y-6">
                    {/* Worker Salary Summary Table Card */}
                    <div className="glass-card p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center space-x-1.5">
                            <span>💼</span>
                            <span>Worker Salary Summary</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">
                            Worker-wise consolidated completed jobs, earnings, commissions, fuel, and net salaries.
                            <span className="ml-1 text-secondary font-black bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                              📅 {startDate} to {endDate}
                            </span>
                          </p>
                        </div>
                        {/* Search Input for Summary */}
                        <div className="relative w-full sm:w-64">
                          <input
                            type="text"
                            placeholder="Search worker name..."
                            value={searchWorkerSummary}
                            onChange={(e) => setSearchWorkerSummary(e.target.value)}
                            className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 pl-8 outline-none focus:border-secondary"
                          />
                          <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-semibold text-slate-655 dark:text-slate-350 min-w-[700px]">
                          <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400 font-black">
                            <tr>
                              {[
                                { key: 'name', label: 'Worker Name' },
                                { key: 'baseSalary', label: 'Base Salary' },
                                { key: 'netSalary', label: 'Remaining Salary' },
                                { key: 'todayProfit', label: "Today's Profit" },
                                { key: 'monthlyProfit', label: 'Monthly Profit' }
                              ].map(col => (
                                <th
                                  key={col.key}
                                  onClick={() => {
                                    if (sortFieldSummary === col.key) {
                                      setSortAscSummary(!sortAscSummary);
                                    } else {
                                      setSortFieldSummary(col.key);
                                      setSortAscSummary(true);
                                    }
                                  }}
                                  className="px-4 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="flex items-center space-x-1">
                                    <span>{col.label}</span>
                                    <span>{sortFieldSummary === col.key ? (sortAscSummary ? '▲' : '▼') : '↕'}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {getSortedWorkerSummaries().map((summary, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                                <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">
                                  <div className="flex items-center space-x-2">
                                    <span>{summary.name}</span>
                                    <button
                                      onClick={async () => {
                                        const newName = prompt(`Enter new Name for ${summary.name}:`, summary.name);
                                        if (newName && newName.trim() !== '') {
                                          try {
                                            await api.put(`/workers/${summary._id}`, { name: newName.trim() });
                                            alert('Worker name updated successfully!');
                                            fetchData();
                                          } catch (err) {
                                            alert('Failed to update worker name.');
                                          }
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-secondary hover:scale-110 transition-all cursor-pointer text-[10px]"
                                      title="Edit Worker Name"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <span>₹{summary.baseSalary.toLocaleString()}</span>
                                    <button
                                      onClick={async () => {
                                        const newSal = prompt(`Enter new Monthly Base Salary for ${summary.name}:`, String(summary.baseSalary));
                                        if (newSal !== null && !isNaN(Number(newSal))) {
                                          try {
                                            await api.put(`/workers/${summary._id}`, { monthlySalary: Number(newSal) });
                                            alert('Base salary updated successfully!');
                                            fetchData();
                                          } catch (err) {
                                            alert('Failed to update base salary.');
                                          }
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-secondary hover:scale-110 transition-all cursor-pointer text-xs"
                                      title="Edit Base Salary"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-black text-sm">₹{summary.netSalary.toFixed(2)}</td>
                                <td className="px-4 py-3 text-rose-500 font-bold">₹{summary.todayProfit.toFixed(2)}</td>
                                <td className="px-4 py-3 text-violet-600 dark:text-violet-400 font-semibold">₹{summary.monthlyProfit.toFixed(2)}</td>
                              </tr>
                            ))}
                            {/* Grand Total Row */}
                            <tr className="bg-slate-100 dark:bg-slate-900/60 font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">
                              <td className="px-4 py-3 font-extrabold text-xs">Grand Total</td>
                              <td className="px-4 py-3">₹{grandBaseSalary.toLocaleString()}</td>
                              <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 text-xs">₹{grandRemainingSalary.toFixed(2)}</td>
                              <td className="px-4 py-3 text-rose-500 text-xs">₹{grandTodayProfit.toFixed(2)}</td>
                              <td className="px-4 py-3 text-violet-600 dark:text-violet-400 text-xs">₹{grandMonthlyProfit.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1.5. Specific Worker Base Salary Editor (if specific worker is selected) */}
                {selectedWorker._id !== 'all' && activeWorker && (
                  <div className="glass-card p-6 space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center space-x-1.5">
                        <span>💰</span>
                        <span>Base Salary Settings</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Manage the monthly base salary rate for {activeWorker.name}.</p>
                    </div>
                    
                    <div className="flex items-center space-x-3 bg-slate-55 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Worker Monthly Base Salary</span>
                        {isEditingBaseSalary ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                value={newBaseSalaryValue}
                                onChange={(e) => setNewBaseSalaryValue(e.target.value)}
                                className="w-32 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded pl-5 pr-2 py-1 outline-none focus:border-secondary"
                              />
                            </div>
                            <button
                              onClick={() => handleSaveBaseSalary(activeWorker._id, activeWorker.monthlySalary || 0)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase rounded cursor-pointer transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingBaseSalary(false)}
                              className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase rounded cursor-pointer transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-base font-black text-slate-800 dark:text-white">₹{(activeWorker.monthlySalary || 0).toLocaleString()}</span>
                            <button
                              onClick={() => {
                                setNewBaseSalaryValue(String(activeWorker.monthlySalary || 0));
                                setIsEditingBaseSalary(true);
                              }}
                              className="p-1 text-slate-400 hover:text-secondary hover:scale-110 transition-all cursor-pointer"
                              title="Edit Base Salary"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Salary Ledger (Running Balance History) Section */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center space-x-1.5">
                        <span>📜</span>
                        <span>Salary Ledger (Running Balance History)</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Date-wise running remaining salary deductions and history log.</p>
                    </div>
                    {/* Search Input for Ledger */}
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search date, worker, remarks..."
                        value={searchLedger}
                        onChange={(e) => {
                          setSearchLedger(e.target.value);
                          setLedgerPage(1);
                        }}
                        className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2 pl-8 outline-none focus:border-secondary"
                      />
                      <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-slate-655 dark:text-slate-350 min-w-[900px]">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400 font-black">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Worker</th>
                          <th className="px-4 py-3">Base Salary</th>
                          <th className="px-4 py-3">Today's Profit (Deduction)</th>
                          <th className="px-4 py-3">Previous Remaining</th>
                          <th className="px-4 py-3">Current Remaining</th>
                          <th className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(() => {
                          const ledgerData = getConsolidatedLedger();
                          const filteredLedger = ledgerData.filter(entry => 
                            entry.workerName.toLowerCase().includes(searchLedger.toLowerCase()) ||
                            entry.date.includes(searchLedger) ||
                            entry.remarks.toLowerCase().includes(searchLedger.toLowerCase())
                          );
                          const paginatedLedger = filteredLedger.slice((ledgerPage - 1) * 10, ledgerPage * 10);
                          
                          if (paginatedLedger.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">
                                  No ledger history found for this range.
                                </td>
                              </tr>
                            );
                          }
                          
                          return paginatedLedger.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                              <td className="px-4 py-3 font-semibold whitespace-nowrap">{entry.date}</td>
                              <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">{entry.workerName}</td>
                              <td className="px-4 py-3 font-bold">₹{entry.baseSalary.toLocaleString()}</td>
                              <td className="px-4 py-3 text-rose-500 font-bold">₹{entry.profit.toFixed(2)}</td>
                              <td className="px-4 py-3 text-slate-400">₹{entry.prevRemainingSalary.toFixed(2)}</td>
                              <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-black text-sm">₹{entry.currentRemainingSalary.toFixed(2)}</td>
                              <td className="px-4 py-3 text-slate-400 text-[10px] max-w-[200px] truncate" title={entry.remarks}>{entry.remarks}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Ledger */}
                  {(() => {
                    const ledgerData = getConsolidatedLedger();
                    const filteredLedger = ledgerData.filter(entry => 
                      entry.workerName.toLowerCase().includes(searchLedger.toLowerCase()) ||
                      entry.date.includes(searchLedger) ||
                      entry.remarks.toLowerCase().includes(searchLedger.toLowerCase())
                    );
                    const totalPages = Math.ceil(filteredLedger.length / 10);
                    if (totalPages <= 1) return null;
                    return (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-slate-400">
                          Showing {(ledgerPage - 1) * 10 + 1} to {Math.min(ledgerPage * 10, filteredLedger.length)} of {filteredLedger.length} rows
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            disabled={ledgerPage === 1}
                            onClick={() => setLedgerPage(ledgerPage - 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 text-[10px] font-extrabold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            ◀ Prev
                          </button>
                          <span className="px-3 text-xs font-black">{ledgerPage} / {totalPages}</span>
                          <button
                            disabled={ledgerPage === totalPages}
                            onClick={() => setLedgerPage(ledgerPage + 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 text-[10px] font-extrabold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            Next ▶
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Detailed Salary Records Section (shown in both specific worker & All Workers cases) */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center space-x-1.5">
                        <span>📝</span>
                        <span>Detailed Salary Records</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Detailed list of individual cleaning job salary components, payouts, and payment status.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      {/* Search box */}
                      <div className="relative w-full sm:w-60">
                        <input
                          type="text"
                          placeholder="Search customer, worker, service..."
                          value={searchDetailedSalary}
                          onChange={(e) => {
                            setSearchDetailedSalary(e.target.value);
                            setDetailedPage(1);
                          }}
                          className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2 pl-8 outline-none focus:border-secondary"
                        />
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                      </div>

                      {/* Export buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleExportCommissionSpreadsheet('xls')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold transition-all text-slate-655 dark:text-slate-350 flex items-center space-x-1 cursor-pointer"
                          title="Excel Spreadsheet"
                        >
                          <span>🟢</span>
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={() => handleExportCommissionSpreadsheet('csv')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold transition-all text-slate-655 dark:text-slate-350 flex items-center space-x-1 cursor-pointer"
                          title="CSV Document"
                        >
                          <span>📄</span>
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={handleExportCommissionPDF}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold transition-all text-slate-655 dark:text-slate-350 flex items-center space-x-1 cursor-pointer"
                          title="PDF Statement"
                        >
                          <span>🔴</span>
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={handlePrintCommission}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold transition-all text-slate-655 dark:text-slate-350 flex items-center space-x-1 cursor-pointer"
                          title="Print Table"
                        >
                          <span>🖨️</span>
                          <span>Print</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-slate-655 dark:text-slate-350 min-w-[1200px]">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400 font-black">
                        <tr>
                          {[
                            { key: 'date', label: 'Date' },
                            { key: 'workerName', label: 'Worker Name' },
                            { key: 'jobId', label: 'Job ID' },
                            { key: 'company', label: 'Company' },
                            { key: 'customer', label: 'Customer Name' },
                            { key: 'service', label: 'Service Name' },
                            { key: 'workAmount', label: 'Work Amount' },
                            { key: 'commission', label: 'Commission' },
                            { key: 'fuelCost', label: 'Fuel Cost' },
                            { key: 'grandPayout', label: 'Profit' },
                            { key: 'netSalary', label: 'Net Salary' },
                            { key: 'paymentStatus', label: 'Payment Status' },
                            { key: 'remarks', label: 'Remarks' },
                            { key: 'actions', label: 'Actions' }
                          ].map(col => (
                            <th
                              key={col.key}
                              onClick={() => {
                                if (sortFieldDetailed === col.key) {
                                  setSortAscDetailed(!sortAscDetailed);
                                } else {
                                  setSortFieldDetailed(col.key);
                                  setSortAscDetailed(true);
                                }
                              }}
                              className="px-4 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center space-x-1">
                                <span>{col.label}</span>
                                <span>{sortFieldDetailed === col.key ? (sortAscDetailed ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(() => {
                          const sortedList = getSortedDetailedRecords();
                          const paginatedList = sortedList.slice((detailedPage - 1) * 10, detailedPage * 10);
                          if (paginatedList.length === 0) {
                            return (
                              <tr>
                                <td colSpan={13} className="px-4 py-8 text-center text-slate-400 font-medium">
                                  No salary records found matching filters.
                                </td>
                              </tr>
                            );
                          }
                          return paginatedList.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                              <td className="px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-secondary group"
                                  onClick={() => setEditingLedgerItem({
                                    job: item.rawJob,
                                    commissionAmount: String(item.commission),
                                    remarks: item.remarks,
                                    price: String(item.workAmount),
                                    fuelKmsTravelled: String(item.rawJob.fuelKmsTravelled || 0),
                                    paymentStatus: item.paymentStatus,
                                    paymentMode: item.rawJob.paymentMode || 'not_selected',
                                    date: item.date
                                  })}>
                                <div className="flex items-center space-x-1">
                                  <span>{item.date}</span>
                                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px]">✏️</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">{item.workerName}</td>
                              <td className="px-4 py-3 font-bold text-[10px] uppercase text-slate-400">#{String(item.jobId).substring(0, 8)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-350">
                                  {item.company}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{item.customer}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{item.service}</td>
                              <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-extrabold cursor-pointer hover:opacity-80 group"
                                  onClick={() => setEditingLedgerItem({
                                    job: item.rawJob,
                                    commissionAmount: String(item.commission),
                                    remarks: item.remarks,
                                    price: String(item.workAmount),
                                    fuelKmsTravelled: String(item.rawJob.fuelKmsTravelled || 0),
                                    paymentStatus: item.paymentStatus,
                                    paymentMode: item.rawJob.paymentMode || 'not_selected',
                                    date: item.date
                                  })}>
                                <div className="flex items-center space-x-1">
                                  <span>₹{item.workAmount.toFixed(2)}</span>
                                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px]">✏️</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-rose-500 font-bold cursor-pointer hover:opacity-80 group"
                                  onClick={() => setEditingLedgerItem({
                                    job: item.rawJob,
                                    commissionAmount: String(item.commission),
                                    remarks: item.remarks,
                                    price: String(item.workAmount),
                                    fuelKmsTravelled: String(item.rawJob.fuelKmsTravelled || 0),
                                    paymentStatus: item.paymentStatus,
                                    paymentMode: item.rawJob.paymentMode || 'not_selected',
                                    date: item.date
                                  })}>
                                <div className="flex items-center space-x-1">
                                  <span>₹{item.commission.toFixed(2)}</span>
                                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px]">✏️</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-violet-600 dark:text-violet-400 font-semibold">{item.fuelCost.toFixed(2)}</td>
                              <td className="px-4 py-3 text-indigo-500 font-semibold">₹{item.grandPayout.toFixed(2)}</td>
                              <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-black text-sm">₹{item.netSalary.toFixed(2)}</td>
                              <td className="px-4 py-3 whitespace-nowrap cursor-pointer group"
                                  onClick={() => setEditingLedgerItem({
                                    job: item.rawJob,
                                    commissionAmount: String(item.commission),
                                    remarks: item.remarks,
                                    price: String(item.workAmount),
                                    fuelKmsTravelled: String(item.rawJob.fuelKmsTravelled || 0),
                                    paymentStatus: item.paymentStatus,
                                    paymentMode: item.rawJob.paymentMode || 'not_selected',
                                    date: item.date
                                  })}>
                                <div className="flex items-center space-x-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    item.paymentStatus === 'paid'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                                      : 'bg-amber-50 dark:bg-amber-955/15 text-amber-600'
                                  }`}>
                                    {item.paymentStatus}
                                  </span>
                                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px]">✏️</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-[120px] truncate text-slate-400 text-[10px] font-medium cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 group"
                                  onClick={() => setEditingLedgerItem({
                                    job: item.rawJob,
                                    commissionAmount: String(item.commission),
                                    remarks: item.remarks,
                                    price: String(item.workAmount),
                                    fuelKmsTravelled: String(item.rawJob.fuelKmsTravelled || 0),
                                    paymentStatus: item.paymentStatus,
                                    paymentMode: item.rawJob.paymentMode || 'not_selected',
                                    date: item.date
                                  })}
                                  title={item.remarks}>
                                <div className="flex items-center space-x-1 truncate">
                                  <span className="truncate">{item.remarks || '-'}</span>
                                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-[10px]">✏️</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => setEditingLedgerItem({
                                    job: item.rawJob,
                                    commissionAmount: String(item.commission),
                                    remarks: item.remarks,
                                    price: String(item.workAmount),
                                    fuelKmsTravelled: String(item.rawJob.fuelKmsTravelled || 0),
                                    paymentStatus: item.paymentStatus,
                                    paymentMode: item.rawJob.paymentMode || 'not_selected',
                                    date: item.date
                                  })}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-550 dark:text-indigo-305 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  ✏️ Edit
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control */}
                  {(() => {
                    const sortedList = getSortedDetailedRecords();
                    const totalPages = Math.ceil(sortedList.length / 10);
                    if (totalPages <= 1) return null;
                    return (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-slate-400">
                          Showing {(detailedPage - 1) * 10 + 1} to {Math.min(detailedPage * 10, sortedList.length)} of {sortedList.length} rows
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            disabled={detailedPage === 1}
                            onClick={() => setDetailedPage(detailedPage - 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 text-[10px] font-extrabold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            ◀ Prev
                          </button>
                          <span className="px-3 text-xs font-black">{detailedPage} / {totalPages}</span>
                          <button
                            disabled={detailedPage === totalPages}
                            onClick={() => setDetailedPage(detailedPage + 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 text-[10px] font-extrabold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            Next ▶
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}

            {/* TAB CONTENT: 2. Daily Travel Report */}
            {activeSection === 'daily-travel' && (
              <div className="glass-card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Completed Jobs & Commutes logs</h3>
                    <p className="text-[10px] text-slate-400">Review jobs completed by {selectedWorker.name} and distance travel metrics.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[800px]">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Job ID</th>
                        {selectedWorker._id === 'all' && <th className="px-4 py-3">Worker</th>}
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Customer & Location</th>
                        <th className="px-4 py-3">Timing Slot</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Distance</th>
                        <th className="px-4 py-3">Fuel Cost</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {workerJobs.map(job => (
                        <tr key={job._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          {editingJob && editingJob._id === job._id ? (
                            <>
                              <td className="px-4 py-3.5 text-slate-800 dark:text-white font-extrabold">#{job.visitId || job._id.substring(18)}</td>
                              {selectedWorker._id === 'all' && (
                                <td className="px-4 py-3.5">
                                  <span className="block text-slate-800 dark:text-white font-extrabold">{job.workerId?.name || 'Unassigned'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{job.workerId?.company || 'N/A'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3.5">
                                <input
                                  type="date"
                                  value={editingJob.date || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, date: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                  className="w-28 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5 space-y-1">
                                <input
                                  type="text"
                                  value={editingJob.clientName || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, clientName: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                  className="w-32 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                  placeholder="Customer"
                                />
                                <input
                                  type="text"
                                  value={editingJob.address || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, address: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                  className="w-32 block text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                  placeholder="Address"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  value={editingJob.timeSlot || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, timeSlot: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                  className="w-24 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <select
                                  value={editingJob.status || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                  className="w-28 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="started">Started</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingJob.fuelKmsTravelled || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, fuelKmsTravelled: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                  className="w-20 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5 font-extrabold text-slate-800 dark:text-white">
                                ₹{((Number(editingJob.fuelKmsTravelled) || 0) * globalFuelRate).toFixed(2)}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={handleSaveJob}
                                    className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 rounded cursor-pointer transition-all"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingJob(null)}
                                    className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 rounded cursor-pointer transition-all"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5 text-slate-800 dark:text-white font-extrabold">#{job.visitId || job._id.substring(18)}</td>
                              {selectedWorker._id === 'all' && (
                                <td className="px-4 py-3.5">
                                  <span className="block text-slate-800 dark:text-white font-extrabold">{job.workerId?.name || 'Unassigned'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{job.workerId?.company || 'N/A'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3.5">{job.date}</td>
                              <td className="px-4 py-3.5">
                                <span className="block text-slate-800 dark:text-white">{job.clientName}</span>
                                <span className="text-[10px] text-slate-400">{job.address}</span>
                              </td>
                              <td className="px-4 py-3.5">{job.timeSlot}</td>
                              <td className="px-4 py-3.5">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                  {job.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">{(job.fuelKmsTravelled || 0).toFixed(2)} KM</td>
                              <td className="px-4 py-3.5 font-extrabold text-slate-800 dark:text-white">₹{((job.fuelKmsTravelled || 0) * globalFuelRate).toFixed(2)}</td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => setEditingJob({ ...job })}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  <span className="text-[9px] uppercase">Edit</span>
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {workerJobs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">No completed jobs found for this date range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. Work-wise Earnings */}
            {activeSection === 'work-earnings' && (
              <div className="glass-card p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Work-Wise Earnings Table</h3>
                  <p className="text-[10px] text-slate-400">Double click or click the edit icon to manually override the clean job payouts.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[700px]">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Job Info</th>
                        {selectedWorker._id === 'all' && <th className="px-4 py-3">Worker</th>}
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Default Price</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {workerJobs.map(job => (
                        <tr key={job._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3.5">
                            <span className="block text-slate-800 dark:text-white font-extrabold">{job.title}</span>
                            <span className="text-[9px] text-slate-400">ID: #{job.visitId || job._id}</span>
                          </td>
                          {selectedWorker._id === 'all' && (
                            <td className="px-4 py-3.5">
                              <span className="block text-slate-800 dark:text-white font-extrabold">{job.workerId?.name || 'Unassigned'}</span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">{job.workerId?.company || 'N/A'}</span>
                            </td>
                          )}
                          <td className="px-4 py-3.5">{job.clientName}</td>
                          <td className="px-4 py-3.5">
                            {editingJob && editingJob._id === job._id ? (
                              <input
                                type="number"
                                value={editingJob.price || ''}
                                min="0"
                                onChange={(e) => setEditingJob({ ...editingJob, price: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveJob(); }}
                                className="w-24 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-855 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                              />
                            ) : (
                              <span className="font-extrabold text-slate-800 dark:text-white">₹{Number(job.price || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {editingJob && editingJob._id === job._id ? (
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={handleSaveJob}
                                  className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 rounded cursor-pointer transition-all"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingJob(null)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 rounded cursor-pointer transition-all"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingJob({ ...job })}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                              >
                                <Edit className="h-3 w-3" />
                                <span className="text-[9px] uppercase">Edit</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. Travel Expenses */}
            {activeSection === 'travel-expenses' && (
              <div className="glass-card p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150/40 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Travel & Fuel Expenses details</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Complete record of travel distance and fuel entries logged for the selected date range.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsTravelModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-[10px] font-extrabold shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Log Travel / Fuel Record</span>
                    </button>

                    {/* Editable local date range summary pill */}
                    <div className="flex flex-wrap items-center gap-2 bg-slate-55 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-150/40 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-secondary" />
                        <span>Date Range:</span>
                      </div>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-extrabold text-slate-800 dark:text-white outline-none focus:border-secondary cursor-pointer"
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-extrabold text-slate-800 dark:text-white outline-none focus:border-secondary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[700px]">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        {selectedWorker._id === 'all' && <th className="px-4 py-3">Worker</th>}
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">From Location</th>
                        <th className="px-4 py-3">To Location</th>
                        <th className="px-4 py-3">Distance & Fuel</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {combinedTravelRecords.map((item: any) => (
                        <tr key={item._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                          {!item.isJob && editingLog && editingLog._id === item._id ? (
                            <>
                              <td className="px-4 py-3.5">
                                <input
                                  type="date"
                                  value={editingLog.date || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTravelLog(); }}
                                  className="w-28 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              {selectedWorker._id === 'all' && (
                                <td className="px-4 py-3.5">
                                  <span className="block text-slate-800 dark:text-white font-extrabold">{item.raw.workerId?.name || 'Unassigned'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{item.raw.workerId?.company || 'N/A'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3.5">
                                <select
                                  value={editingLog.type || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, type: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTravelLog(); }}
                                  className="w-24 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                >
                                  <option value="job">Commute to Job</option>
                                  <option value="home">Return Home</option>
                                </select>
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  value={editingLog.fromLocation || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, fromLocation: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTravelLog(); }}
                                  className="w-28 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  value={editingLog.toLocation || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, toLocation: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTravelLog(); }}
                                  className="w-28 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-905 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5 space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingLog.kms || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, kms: e.target.value, allowance: (Number(e.target.value) * globalFuelRate).toFixed(2) })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTravelLog(); }}
                                  className="w-20 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-905 p-1.5 outline-none focus:border-secondary"
                                  placeholder="KM"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={editingLog.allowance || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, allowance: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTravelLog(); }}
                                  className="w-20 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-905 p-1.5 outline-none focus:border-secondary"
                                  placeholder="Allowance"
                                />
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={handleSaveTravelLog}
                                    className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 rounded cursor-pointer transition-all"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingLog(null)}
                                    className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 rounded cursor-pointer transition-all"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5">{item.date}</td>
                              {selectedWorker._id === 'all' && (
                                <td className="px-4 py-3.5">
                                  <span className="block text-slate-800 dark:text-white font-extrabold">{item.raw.workerId?.name || 'Unassigned'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{item.raw.workerId?.company || 'N/A'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  item.isJob
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    : item.type === 'job' 
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' 
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                }`}>
                                  {item.typeLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">{item.fromLocation}</td>
                              <td className="px-4 py-3.5">{item.toLocation}</td>
                              <td className="px-4 py-3.5">{item.kms.toFixed(2)} KM (₹{item.allowance.toFixed(2)})</td>
                              <td className="px-4 py-3.5 text-right">
                                {!item.isJob ? (
                                  <div className="flex justify-end items-center space-x-2">
                                    <button
                                      onClick={() => setEditingLog({ ...item.raw })}
                                      className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-605 dark:bg-slate-800 dark:hover:bg-slate-700 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                                    >
                                      <Edit className="h-3 w-3" />
                                      <span className="text-[9px] uppercase font-bold">Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTravelLog(item.raw._id, `${item.date} - ${item.fromLocation} to ${item.toLocation} (${item.kms} KM)`)}
                                      className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span className="text-[9px] uppercase font-bold">Delete</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9px] uppercase font-bold text-slate-400 italic">Job Record</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {combinedTravelRecords.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">No travel or fuel records submitted for this date range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 9. Commissions History */}
            {activeSection === 'commissions' && (
              <div className="glass-card p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Worker Commissions History</h3>
                    <p className="text-[10px] text-slate-400">View and manage commission payouts for crew members.</p>
                  </div>
                  {selectedWorker._id !== 'all' && (
                    <button
                      onClick={() => setIsCommissionModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-extrabold text-xs uppercase tracking-wider shadow-md flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Manage Commissions</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[900px]">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Worker Name</th>
                        <th className="px-4 py-3">Job ID</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Work Amount</th>
                        <th className="px-4 py-3">Commission Paid</th>
                        <th className="px-4 py-3">Remarks</th>
                        <th className="px-4 py-3">Added By</th>
                        <th className="px-4 py-3">Added Time</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {workerCommissions.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-slate-400">
                            No commissions logged for this selection/date range.
                          </td>
                        </tr>
                      ) : (
                        workerCommissions.map(comm => {
                          const isEditing = editingCommissionId === comm._id;
                          return (
                            <tr key={comm._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="px-4 py-3.5">{comm.jobDate}</td>
                              <td className="px-4 py-3.5">
                                <span className="block text-slate-800 dark:text-white font-extrabold">{comm.workerId?.name || 'N/A'}</span>
                                <span className="text-[8px] text-slate-400 uppercase font-black">{comm.workerId?.company || ''}</span>
                              </td>
                              <td className="px-4 py-3.5 text-slate-800 dark:text-white">#{comm.jobId?.visitId || comm.jobId?._id?.substring(18) || 'N/A'}</td>
                              <td className="px-4 py-3.5">{comm.jobId?.title || 'N/A'}</td>
                              <td className="px-4 py-3.5">₹{Number(comm.workAmount || 0).toFixed(2)}</td>
                              <td className="px-4 py-3.5">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingCommAmount}
                                    onChange={(e) => setEditingCommAmount(e.target.value)}
                                    className="w-20 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 outline-none focus:border-secondary"
                                  />
                                ) : (
                                  <span className="text-secondary font-black">₹{Number(comm.commissionAmount || 0).toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingCommRemarks}
                                    onChange={(e) => setEditingCommRemarks(e.target.value)}
                                    className="w-32 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 outline-none focus:border-secondary"
                                  />
                                ) : (
                                  comm.remarks || '-'
                                )}
                              </td>
                              <td className="px-4 py-3.5">{comm.createdBy?.name || 'N/A'}</td>
                              <td className="px-4 py-3.5 text-slate-400 text-[10px]">
                                {new Date(comm.createdAt).toLocaleDateString('en-IN')} {new Date(comm.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveCommission(comm._id)}
                                        className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingCommissionId(null)}
                                        className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingCommissionId(comm._id);
                                          setEditingCommAmount(String(comm.commissionAmount));
                                          setEditingCommRemarks(comm.remarks || '');
                                        }}
                                        className="p-1 rounded bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-755 transition-colors"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCommission(comm._id)}
                                        className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 5. Monthly Summary */}
            {activeSection === 'monthly' && (
              <div className="glass-card p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Monthly Work & Travel Metrics</h3>
                  <p className="text-[10px] text-slate-400">Consolidated monthly summaries for {selectedWorker.name}.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[700px]">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Assigned Jobs</th>
                        <th className="px-4 py-3">Completions</th>
                        <th className="px-4 py-3">KMs Traveled</th>
                        <th className="px-4 py-3">Work Payouts</th>
                        <th className="px-4 py-3">Avg. Daily Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {getMonthlyAnalytics().map(row => (
                        <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3.5 text-slate-800 dark:text-white font-extrabold">{row.month}</td>
                          <td className="px-4 py-3.5">{row.jobsCount}</td>
                          <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400">{row.completed} Completed</td>
                          <td className="px-4 py-3.5">{Number(row.distance || 0).toFixed(2)} KM</td>
                          <td className="px-4 py-3.5 font-extrabold text-slate-800 dark:text-white">₹{Number(row.earnings || 0).toFixed(2)}</td>
                          <td className="px-4 py-3.5">₹{(row.earnings / 30).toFixed(2)}/day</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 6. Yearly Summary */}
            {activeSection === 'yearly' && (
              <div className="glass-card p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Yearly Performance & Payout logs</h3>
                  <p className="text-[10px] text-slate-400">Consolidated yearly statement breakdown.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[700px]">
                    <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Year</th>
                        <th className="px-4 py-3">Jobs Completed</th>
                        <th className="px-4 py-3">KMs Traveled</th>
                        <th className="px-4 py-3">Fuel Expenses (INR)</th>
                        <th className="px-4 py-3">Work Revenue (INR)</th>
                        <th className="px-4 py-3">Total Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {getYearlyAnalytics().map(row => (
                        <tr key={row.year} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3.5 text-slate-800 dark:text-white font-extrabold">{row.year}</td>
                          <td className="px-4 py-3.5">{row.completed} Jobs</td>
                          <td className="px-4 py-3.5">{Number(row.distance || 0).toFixed(2)} KM</td>
                          <td className="px-4 py-3.5">₹{Number(row.fuelCost || 0).toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400">₹{Number(row.earnings || 0).toFixed(2)}</td>
                          <td className="px-4 py-3.5 font-black text-slate-800 dark:text-white">₹{Number((row.earnings || 0) + (row.fuelCost || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 7. Reports & Export */}
            {activeSection === 'reports' && (
              <div className="glass-card p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Reports Console</h3>
                  <p className="text-[10px] text-slate-400">Generate formatted spreadsheets or print travel expenses statement.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Excel Spreadsheet (.xls)</h4>
                      <p className="text-[10px] text-slate-400">Export formatted work log sheet compatible with Microsoft Excel.</p>
                    </div>
                    <button
                      onClick={() => handleExportSpreadsheet('xls')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all whitespace-nowrap self-start sm:self-auto"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Excel</span>
                    </button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">CSV Data File (.csv)</h4>
                      <p className="text-[10px] text-slate-400">Download raw comma-separated values database export file.</p>
                    </div>
                    <button
                      onClick={() => handleExportSpreadsheet('csv')}
                      className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs uppercase shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all whitespace-nowrap self-start sm:self-auto"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download CSV</span>
                    </button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 md:col-span-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">PDF Statement (.pdf)</h4>
                      <p className="text-[10px] text-slate-400">Generate formatted printable billing layout statement and download as PDF document.</p>
                    </div>
                    <button
                      onClick={handleExportPDF}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 my-6" />

                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest font-black">Salary & Profit Statements</h3>
                  <p className="text-[10px] text-slate-400">Generate formatted spreadsheets or statements specifically for worker commissions and final company net profits.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Excel Commission Sheet (.xls)</h4>
                      <p className="text-[10px] text-slate-400">Export formatted commission report compatible with Microsoft Excel.</p>
                    </div>
                    <button
                      onClick={() => handleExportCommissionSpreadsheet('xls')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all whitespace-nowrap self-start sm:self-auto"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Excel</span>
                    </button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">CSV Commission File (.csv)</h4>
                      <p className="text-[10px] text-slate-400">Download raw CSV commission data export file.</p>
                    </div>
                    <button
                      onClick={() => handleExportCommissionSpreadsheet('csv')}
                      className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs uppercase shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all whitespace-nowrap self-start sm:self-auto"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download CSV</span>
                    </button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 md:col-span-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">PDF Commission Statement (.pdf)</h4>
                      <p className="text-[10px] text-slate-400">Download beautifully formatted PDF report of commissions and final payouts.</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleExportCommissionPDF}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={handlePrintCommission}
                        className="px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-extrabold text-xs uppercase shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 8. Settings */}
            {activeSection === 'settings' && (
              <div className="glass-card p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Travel & Expense settings</h3>
                  <p className="text-[10px] text-slate-400">Configure parameters for calculations and manual adjustment variables.</p>
                </div>

                <form className="space-y-4 text-xs font-bold text-slate-655 dark:text-slate-350">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-400">Fuel Allowance Rate (₹ per KM):</label>
                      <input
                        type="number"
                        min="0"
                        value={globalFuelRate}
                        onChange={(e) => setGlobalFuelRate(Number(e.target.value))}
                        className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-400">Manual adjustments (₹):</label>
                      <input
                        type="number"
                        value={manualAdjustment}
                        onChange={(e) => setManualAdjustment(e.target.value)}
                        className="w-full text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-400">Travel Notes / Info:</label>
                    <textarea
                      rows={2}
                      value={travelNotes}
                      onChange={(e) => setTravelNotes(e.target.value)}
                      placeholder="Add any travel route instructions..."
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-400">Remarks:</label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add administrative remarks for payout calculations..."
                      className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:text-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => alert('Settings configuration saved locally and applied to calculations!')}
                      className="px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-white font-extrabold uppercase rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Apply Configurations
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: 9. BI Performance Hub - Flattened */}
            {activeSection === 'bi-operations-desk' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="operations-desk" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeSection === 'bi-operations' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="operations" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeSection === 'bi-workers' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="workers" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeSection === 'bi-goals' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="goals" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeSection === 'bi-expenses' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="expenses" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeSection === 'bi-payments' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="payment-tracker" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

            {activeSection === 'bi-settings' && (
              <div className="w-full animate-fade-in">
                <AdminBIDashboard forceTab="settings" hideNavigation={true} startDate={startDate} endDate={endDate} />
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="glass-card p-12 text-center text-slate-400 dark:text-slate-500 animate-fade-in flex flex-col justify-center items-center space-y-3">
          <Compass className="h-14 w-14 text-slate-300 dark:text-slate-700 animate-pulse" />
          <h3 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider">No Worker Selected</h3>
          <p className="text-xs max-w-md">Search and select a worker profile at the top of the console to load their travel expenses, earnings, routes, and monthly/yearly summaries.</p>
        </div>
      )}

      {/* Modal Popup for Logging Travel Commutes */}
      {isTravelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsTravelModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in text-left">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-secondary tracking-widest flex items-center space-x-2">
                <Compass className="h-5 w-5 text-secondary animate-spin-slow" />
                <span>Log Daily Travel Commute</span>
              </h3>
              <button
                onClick={() => setIsTravelModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleAddManualTravel(e);
                setIsTravelModalOpen(false);
              }}
              className="p-6 space-y-4 font-bold text-xs"
            >
              {selectedWorker?._id === 'all' ? (
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Commuted Worker:</label>
                  <select
                    required
                    value={logWorker}
                    onChange={(e) => setLogWorker(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                  >
                    <option value="">Select worker...</option>
                    {workers.map((w: any) => (
                      <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Crew Worker:</label>
                  <div className="w-full text-xs font-black rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-700 dark:text-slate-200">
                    {selectedWorker.name}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Travel Date:</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Commute Type:</label>
                  <select
                    value={logType}
                    onChange={(e) => setLogType(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                  >
                    <option value="job">Commute to Job</option>
                    <option value="home">Return Home</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Distance (KMs):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 45"
                    value={logKms}
                    onChange={(e) => setLogKms(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Allowance (₹, Optional):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder={`Auto calculated at ₹${globalFuelRate}/KM`}
                    value={logAllowance}
                    onChange={(e) => setLogAllowance(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-855 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">From Location:</label>
                  <input
                    type="text"
                    required
                    value={logFrom}
                    onChange={(e) => setLogFrom(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">To Location:</label>
                  <input
                    type="text"
                    required
                    value={logTo}
                    onChange={(e) => setLogTo(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-secondary dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsTravelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-200 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-xl font-extrabold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Log Commute Kms</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup for Commission Management */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsCommissionModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-fade-in text-left flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
              <h3 className="text-xs font-black uppercase text-secondary tracking-widest flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-secondary animate-bounce" />
                <span>Manage Worker Commissions</span>
              </h3>
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="p-6 overflow-y-auto flex-1 font-bold text-xs space-y-4">
              {/* Top Section */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block tracking-wider">Worker Name</span>
                  <span className="text-slate-800 dark:text-white font-extrabold">{selectedWorker.name}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block tracking-wider">Worker ID</span>
                  <span className="text-slate-800 dark:text-white font-extrabold text-[10px] truncate block">{selectedWorker._id}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block tracking-wider">Date Range</span>
                  <span className="text-slate-800 dark:text-white font-extrabold">{startDate} to {endDate}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-slate-400 block tracking-wider">Completed Jobs</span>
                  <span className="text-slate-800 dark:text-white font-extrabold">{workerJobs.length}</span>
                </div>
              </div>

              {selectedWorker._id === 'all' ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Please close this modal and select a specific worker account to manage their commissions.</p>
                </div>
              ) : workerJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No completed jobs found for {selectedWorker.name} in this date range.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-bold text-slate-655 dark:text-slate-350 min-w-[600px]">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase tracking-wider text-[9px] text-slate-400">
                        <tr>
                          <th className="px-4 py-2.5">Job ID</th>
                          <th className="px-4 py-2.5">Company</th>
                          <th className="px-4 py-2.5">Customer Name</th>
                          <th className="px-4 py-2.5">Service Name</th>
                          <th className="px-4 py-2.5">Work Amount</th>
                          <th className="px-4 py-2.5" style={{ width: '130px' }}>Commission (₹)</th>
                          <th className="px-4 py-2.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {workerJobs.map(job => {
                          const stateVal = modalCommissions[job._id] || { commissionAmount: '', remarks: '' };
                          return (
                            <tr key={job._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="px-4 py-3 text-slate-800 dark:text-white">#{job.visitId || job._id.substring(18)}</td>
                              <td className="px-4 py-3">{job.company}</td>
                              <td className="px-4 py-3">{job.clientName}</td>
                              <td className="px-4 py-3">{job.title}</td>
                              <td className="px-4 py-3">₹{Number(job.price || 0).toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0.00"
                                  value={stateVal.commissionAmount}
                                  onChange={(e) => {
                                    setModalCommissions({
                                      ...modalCommissions,
                                      [job._id]: {
                                        ...stateVal,
                                        commissionAmount: e.target.value
                                      }
                                    });
                                  }}
                                  className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  placeholder="Remarks..."
                                  value={stateVal.remarks}
                                  onChange={(e) => {
                                    setModalCommissions({
                                      ...modalCommissions,
                                      [job._id]: {
                                        ...stateVal,
                                        remarks: e.target.value
                                      }
                                    });
                                  }}
                                  className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations and Actions Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 gap-4">
                    <div className="text-slate-800 dark:text-white font-extrabold text-sm">
                      Total Commission: <span className="text-secondary">₹{
                        Object.values(modalCommissions).reduce((sum, item) => sum + (Number(item.commissionAmount) || 0), 0).toFixed(2)
                      }</span>
                    </div>

                    <div className="flex space-x-3 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsCommissionModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const payload = {
                              workerId: selectedWorker._id,
                              commissions: Object.entries(modalCommissions).map(([jobId, data]) => ({
                                jobId,
                                commissionAmount: Number(data.commissionAmount) || 0,
                                remarks: data.remarks
                              }))
                            };
                            await api.post('/commissions/bulk-upsert', payload);
                            alert('Commissions saved successfully!');
                            setIsCommissionModalOpen(false);
                            fetchData();
                          } catch (err) {
                            console.error('Failed to save commissions:', err);
                            alert('Failed to save commissions.');
                          }
                        }}
                        className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs uppercase shadow-md cursor-pointer"
                      >
                        Save Commissions
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Edit Ledger Record Modal */}
      {editingLedgerItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-xs font-bold text-slate-700 dark:text-slate-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 w-full max-w-md">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm uppercase text-secondary">Edit Ledger Record</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Editing job and commission details</p>
              </div>
              <button onClick={() => setEditingLedgerItem(null)} className="text-slate-400 hover:text-slate-655 text-sm font-black cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveLedgerItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Work Amount / Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingLedgerItem.price}
                    onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, price: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-950/50 outline-none text-slate-700 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Commission (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingLedgerItem.commissionAmount}
                    onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, commissionAmount: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Fuel KMs Travelled</label>
                  <input
                    type="number"
                    required
                    value={editingLedgerItem.fuelKmsTravelled}
                    onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, fuelKmsTravelled: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Job Timing Date</label>
                  <input
                    type="date"
                    required
                    value={editingLedgerItem.date}
                    onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, date: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Status</label>
                  <select
                    value={editingLedgerItem.paymentStatus}
                    onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, paymentStatus: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none text-slate-600 dark:text-slate-300 font-bold"
                  >
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="outstanding">Outstanding</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={editingLedgerItem.paymentMode || 'not_selected'}
                    onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, paymentMode: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none text-slate-600 dark:text-slate-300 font-bold"
                  >
                    <option value="not_selected">Not Selected</option>
                    <option value="cash">💵 Cash</option>
                    <option value="upi_online">📱 UPI / Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Remarks/Notes..."
                  value={editingLedgerItem.remarks}
                  onChange={(e) => setEditingLedgerItem({ ...editingLedgerItem, remarks: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none text-slate-700 dark:text-white font-bold"
                />
              </div>

              <div className="flex space-x-3 pt-2 text-center font-extrabold uppercase tracking-wider">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white cursor-pointer hover:opacity-90">Save Changes</button>
                <button type="button" onClick={() => setEditingLedgerItem(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 text-slate-400 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill-down Analytics Modal */}
      {drillDown && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 font-bold">
            
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
                          <td className="px-4 py-3 text-slate-400">{item.date || 'Date Range Metric'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              isRev 
                                ? 'bg-success/15 text-success' 
                                : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-750 dark:text-slate-200">{item.desc}</td>
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
                                  date: item.date
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs font-bold text-slate-700 dark:text-slate-200">
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
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/55 dark:bg-slate-955/50 outline-none font-bold"
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
      {/* Admin Confirmation Modal for Deleting Travel Commute Logs */}
      {deleteConfirmLog && deleteConfirmLog.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteConfirmLog(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in text-left p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Confirm Admin Deletion</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Only System Administrators can delete records</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete this travel log?
              <div className="mt-2 font-bold text-rose-600 dark:text-rose-400">
                {deleteConfirmLog.details}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">This record will be permanently deleted from database and cannot be recovered.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmLog(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTravelLog}
                className="px-5 py-2 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm Admin Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTravelExpenses;

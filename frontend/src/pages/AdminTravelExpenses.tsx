import React, { useEffect, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import api from '../utils/api';
import {
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
  Legend
} from 'recharts';

interface AdminTravelExpensesProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const getTodayString = () => new Date().toISOString().split('T')[0];
const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const AdminTravelExpenses: React.FC<AdminTravelExpensesProps> = ({ companyFilter }) => {
  const [loading, setLoading] = useState(true);
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
  // Unified Editing states for Job and TravelLog
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [isTravelModalOpen, setIsTravelModalOpen] = useState<boolean>(false);
  
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
      const [workersRes, jobsRes, travelRes, settingsRes, commissionsRes] = await Promise.all([
        api.get('/workers'),
        api.get('/jobs'),
        api.get('/travel/all'),
        api.get('/settings').catch(() => ({ data: null })),
        api.get('/commissions').catch(() => ({ data: [] }))
      ]);

      setWorkers(workersRes.data || []);
      setJobs(jobsRes.data || []);
      setTravelLogs(travelRes.data || []);
      setCommissions(commissionsRes.data || []);
      
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
        return j.date >= startDate && j.date <= endDate;
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
        return log.date >= startDate && log.date <= endDate;
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
        return c.jobDate >= startDate && c.jobDate <= endDate;
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
      return getSalaryLedger(selectedWorker._id, startDate, endDate);
    } else {
      let combined: any[] = [];
      workers.forEach(w => {
        combined = [...combined, ...getSalaryLedger(w._id, startDate, endDate)];
      });
      combined.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
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
      j.date && j.date >= startDate && j.date <= endDate
    );

    const earnings = jobsInPeriod.reduce((sum, j) => sum + (j.price || 0), 0);
    const commAmt = jobsInPeriod.reduce((sum, j) => {
      const comm = commissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
      return sum + (comm ? (comm.commissionAmount || 0) : 0);
    }, 0);
    const fuelCost = jobsInPeriod.reduce((sum, j) => sum + ((j.fuelKmsTravelled || 0) * globalFuelRate), 0);
    
    const travelInPeriod = travelLogs.filter(log =>
      (log.workerId?._id === w._id || log.workerId === w._id) &&
      log.date && log.date >= startDate && log.date <= endDate
    );
    const extraFuelCost = travelInPeriod.reduce((sum, log) => sum + ((log.kms || 0) * globalFuelRate), 0);
    const totalFuelInPeriod = fuelCost + extraFuelCost;

    const profitInPeriod = earnings - commAmt - totalFuelInPeriod;

    let remainingSalary = baseSal - profitInPeriod;

    if (datePreset === 'today' || datePreset === 'yesterday') {
      const firstDay = getFirstDayOfMonth(endDate);
      const jobsInMonth = jobs.filter(j => 
        (j.workerId?._id === w._id || j.workerId === w._id) &&
        j.status === 'completed' &&
        j.date && j.date >= firstDay && j.date <= endDate
      );
      const earningsM = jobsInMonth.reduce((sum, j) => sum + (j.price || 0), 0);
      const commM = jobsInMonth.reduce((sum, j) => {
        const comm = commissions.find(c => c.jobId?._id === j._id || c.jobId === j._id);
        return sum + (comm ? (comm.commissionAmount || 0) : 0);
      }, 0);
      const fuelM = jobsInMonth.reduce((sum, j) => sum + ((j.fuelKmsTravelled || 0) * globalFuelRate), 0);
      const travelM = travelLogs.filter(log =>
        (log.workerId?._id === w._id || log.workerId === w._id) &&
        log.date && log.date >= firstDay && log.date <= endDate
      );
      const extraFuelM = travelM.reduce((sum, log) => sum + ((log.kms || 0) * globalFuelRate), 0);
      const profitM = earningsM - commM - (fuelM + extraFuelM);
      remainingSalary = baseSal - profitM;
    }

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
        j.date && j.date >= startDate && j.date <= endDate
      );
      
      const travelForWorker = travelLogs.filter(log => 
        (log.workerId?._id === w._id || log.workerId === w._id) &&
        log.date && log.date >= startDate && log.date <= endDate
      );

      const commForWorker = commissions.filter(c => 
        (c.workerId?._id === w._id || c.workerId === w._id) &&
        c.jobDate && c.jobDate >= startDate && c.jobDate <= endDate
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

  const handleDeleteTravelLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this travel log?')) return;
    try {
      await api.delete(`/travel/${id}`);
      alert('Travel log deleted successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to delete travel log:', err);
      alert('Failed to delete travel log.');
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
        remarks: commRemarks || ''
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
          <p>Period: ${startDate} to ${endDate} | Company: ${companyFilter}</p>
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

    const filename = `${selectedWorker.name}_salary_report.${format}`;
    let content = '';
    const data = getCommissionReportData();

    if (format === 'xls') {
      content = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Salary Report</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        </head>
        <body>
          <h2>Worker Salary & Profit Statement - ${selectedWorker.name}</h2>
          <p>Period: ${startDate} to ${endDate}</p>
          <table border="1">
            <thead>
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <th>Date</th>
                <th>Worker Name</th>
                <th>Job ID</th>
                <th>Company</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Work Amount (INR)</th>
                <th>Commission (INR)</th>
                <th>Fuel Cost (INR)</th>
                <th>Profit (INR)</th>
                <th>Net Salary (INR)</th>
                <th>Payment Status</th>
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
                  <td>${item.workAmount.toFixed(2)}</td>
                  <td>${item.commission.toFixed(2)}</td>
                  <td>${item.fuelCost.toFixed(2)}</td>
                  <td>${item.grandPayout.toFixed(2)}</td>
                  <td>${item.netSalary.toFixed(2)}</td>
                  <td>${item.paymentStatus}</td>
                  <td>${item.remarks}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #e2e8f0;">
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
        </body>
        </html>
      `;
    } else {
      // CSV Export
      const headers = ["Date", "Worker Name", "Job ID", "Company", "Customer", "Service", "Work Amount", "Commission", "Fuel Cost", "Profit", "Net Salary", "Payment Status", "Remarks"];
      const rows = data.map(item => [
        item.date,
        item.workerName,
        item.jobId,
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
      content = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    }

    const blob = new Blob([content], { type: format === 'xls' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
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
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 34);
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

    const filename = `${selectedWorker.name}_travel_expense_report.${format}`;
    let content = '';

    if (format === 'xls') {
      content = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Travel Report</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        </head>
        <body>
          <h2>Worker Travel & Expense Statement - ${selectedWorker.name}</h2>
          <p>Period: ${startDate} to ${endDate}</p>
          <table border="1">
            <thead>
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <th>Date</th>
                <th>Job ID</th>
                <th>Service Title</th>
                <th>Customer</th>
                <th>Price (INR)</th>
                <th>Distance (KM)</th>
                <th>Fuel Cost (₹${globalFuelRate}/KM)</th>
                <th>From Location</th>
                <th>To Location</th>
              </tr>
            </thead>
            <tbody>
              ${workerJobs.map(j => `
                <tr>
                  <td>${j.date || ''}</td>
                  <td>${j.visitId || j._id}</td>
                  <td>${j.title || ''}</td>
                  <td>${j.clientName || ''}</td>
                  <td>${Number(j.price || 0).toFixed(2)}</td>
                  <td>${Number(j.fuelKmsTravelled || 0).toFixed(2)}</td>
                  <td>${Number((j.fuelKmsTravelled || 0) * globalFuelRate).toFixed(2)}</td>
                  <td>${j.fromLocation || ''}</td>
                  <td>${j.toLocation || ''}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="4"><b>Totals</b></td>
                <td><b>₹${totalWorkEarnings.toFixed(2)}</b></td>
                <td><b>${totalDistance.toFixed(2)} KM</b></td>
                <td><b>₹${totalFuelCost.toFixed(2)}</b></td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;
    } else {
      // CSV Export
      const headers = ["Date", "Job ID", "Service Title", "Customer", "Price", "Distance", "Fuel Cost", "From", "To"];
      const rows = workerJobs.map(j => [
        j.date || '',
        j.visitId || j._id,
        j.title || '',
        j.clientName || '',
        Number(j.price || 0).toFixed(2),
        Number(j.fuelKmsTravelled || 0).toFixed(2),
        Number((j.fuelKmsTravelled || 0) * globalFuelRate).toFixed(2),
        j.fromLocation || '',
        j.toLocation || ''
      ]);
      content = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    }

    const blob = new Blob([content], { type: format === 'xls' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
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
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 34);
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
    <div className="space-y-6 select-none pb-12 print:p-0">
      
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

          {datePreset === 'custom' && (
            <div className="flex items-center space-x-2 animate-fade-in">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold rounded-xl border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark dark:text-white shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {selectedWorker ? (
        <div className="space-y-6 w-full">
          
          {/* Horizontal Slideable Navigation Bar at the top */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto scrollbar-none print:hidden">
            <nav className="flex space-x-3.5 pb-2" aria-label="Tabs">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
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
                { label: 'Remaining Net Salary', val: `₹${totalRemainingSalary.toFixed(2)}`, desc: datePreset === 'today' ? `Today's Deduction: ₹${totalProfit.toFixed(2)}` : datePreset === 'this-month' ? `This Month Deduction: ₹${totalProfit.toFixed(2)}` : `Period Deduction: ₹${totalProfit.toFixed(2)}`, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20', section: 'work-earnings' },
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
                          <p className="text-[10px] text-slate-400">Worker-wise consolidated completed jobs, earnings, commissions, fuel, and net salaries.</p>
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
                                <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">{summary.name}</td>
                                <td className="px-4 py-3">₹{summary.baseSalary.toLocaleString()}</td>
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

                    {/* Salary Analytics Grid */}
                    <div className="glass-card p-6 space-y-4">
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center space-x-1.5">
                        <span>📊</span>
                        <span>Salary Analytics</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-6 text-xs font-bold text-slate-655 dark:text-slate-350">
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-955/30 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">Highest Paid Worker</span>
                          <p className="text-lg font-black text-slate-855 dark:text-white">
                            {highestPaid ? highestPaid.name : 'N/A'}
                          </p>
                          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-extrabold">
                            ₹{highestPaid ? highestPaid.netSalary.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        
                        <div className="p-4 bg-rose-50/50 dark:bg-rose-955/15 rounded-2xl border border-rose-100/50 dark:border-rose-955/30 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">Lowest Paid Worker</span>
                          <p className="text-lg font-black text-slate-855 dark:text-white">
                            {lowestPaid ? lowestPaid.name : 'N/A'}
                          </p>
                          <span className="text-sm text-rose-600 dark:text-rose-450 font-extrabold">
                            ₹{lowestPaid ? lowestPaid.netSalary.toFixed(2) : '0.00'}
                          </span>
                        </div>

                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-955/30 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">Average Salary</span>
                          <p className="text-lg font-black text-slate-855 dark:text-white">All Workers</p>
                          <span className="text-sm text-indigo-600 dark:text-indigo-400 font-extrabold">
                            ₹{isNaN(averageSalary) ? '0.00' : averageSalary.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 text-xs font-bold text-slate-655 dark:text-slate-350">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">Avg Earnings Per Job</span>
                          <p className="text-base font-extrabold text-slate-800 dark:text-white">
                            ₹{isNaN(averageEarningsPerJob) ? '0.00' : averageEarningsPerJob.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">Avg Commission Per Job</span>
                          <p className="text-base font-extrabold text-slate-800 dark:text-white">
                            ₹{isNaN(averageCommission) ? '0.00' : averageCommission.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">Avg Fuel Cost Per Job</span>
                          <p className="text-base font-extrabold text-slate-800 dark:text-white">
                            ₹{isNaN(averageFuelCost) ? '0.00' : averageFuelCost.toFixed(2)}
                          </p>
                        </div>
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
                            { key: 'remarks', label: 'Remarks' }
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
                              <td className="px-4 py-3 font-semibold whitespace-nowrap">{item.date}</td>
                              <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">{item.workerName}</td>
                              <td className="px-4 py-3 font-bold text-[10px] uppercase text-slate-400">#{String(item.jobId).substring(0, 8)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-350">
                                  {item.company}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{item.customer}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{item.service}</td>
                              <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-extrabold">₹{item.workAmount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-rose-500 font-bold">₹{item.commission.toFixed(2)}</td>
                              <td className="px-4 py-3 text-violet-600 dark:text-violet-400 font-semibold">₹{item.fuelCost.toFixed(2)}</td>
                              <td className="px-4 py-3 text-indigo-500 font-semibold">₹{item.grandPayout.toFixed(2)}</td>
                              <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-black text-sm">₹{item.netSalary.toFixed(2)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  item.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                                    : 'bg-amber-50 dark:bg-amber-955/15 text-amber-600'
                                }`}>
                                  {item.paymentStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 max-w-[120px] truncate text-slate-400 text-[10px] font-medium" title={item.remarks}>{item.remarks || '-'}</td>
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
                                  className="w-28 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5 space-y-1">
                                <input
                                  type="text"
                                  value={editingJob.clientName || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, clientName: e.target.value })}
                                  className="w-32 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                  placeholder="Customer"
                                />
                                <input
                                  type="text"
                                  value={editingJob.address || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, address: e.target.value })}
                                  className="w-32 block text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                  placeholder="Address"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  value={editingJob.timeSlot || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, timeSlot: e.target.value })}
                                  className="w-24 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <select
                                  value={editingJob.status || ''}
                                  onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })}
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
                          <td colSpan={7} className="text-center py-8 text-slate-400">No completed jobs found for this period.</td>
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
                    <p className="text-[10px] text-slate-400 mt-0.5">Lists travel distance records logged by Selected Worker.</p>
                  </div>
                  
                  {/* Local date range summary */}
                  <div className="flex items-center space-x-2 bg-slate-55 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-150/40 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-secondary" />
                    <span>Period:</span>
                    <span className="text-slate-800 dark:text-white font-extrabold">
                      {new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
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
                        <th className="px-4 py-3">Distance</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {workerTravel.map(log => (
                        <tr key={log._id} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                          {editingLog && editingLog._id === log._id ? (
                            <>
                              <td className="px-4 py-3.5">
                                <input
                                  type="date"
                                  value={editingLog.date || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                                  className="w-28 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              {selectedWorker._id === 'all' && (
                                <td className="px-4 py-3.5">
                                  <span className="block text-slate-800 dark:text-white font-extrabold">{log.workerId?.name || 'Unassigned'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{log.workerId?.company || 'N/A'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3.5">
                                <select
                                  value={editingLog.type || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, type: e.target.value })}
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
                                  className="w-28 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="text"
                                  value={editingLog.toLocation || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, toLocation: e.target.value })}
                                  className="w-28 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-905 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5 space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingLog.kms || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, kms: e.target.value, allowance: (Number(e.target.value) * globalFuelRate).toFixed(2) })}
                                  className="w-20 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-905 p-1.5 outline-none focus:border-secondary"
                                  placeholder="KM"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={editingLog.allowance || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, allowance: e.target.value })}
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
                              <td className="px-4 py-3.5">{log.date}</td>
                              {selectedWorker._id === 'all' && (
                                <td className="px-4 py-3.5">
                                  <span className="block text-slate-800 dark:text-white font-extrabold">{log.workerId?.name || 'Unassigned'}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{log.workerId?.company || 'N/A'}</span>
                                </td>
                              )}
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  log.type === 'job' 
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' 
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                }`}>
                                  {log.type === 'job' ? 'Commute to Job' : 'Return Home'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">{log.fromLocation || 'Last Work Site'}</td>
                              <td className="px-4 py-3.5">{log.toLocation || 'Target/Home'}</td>
                              <td className="px-4 py-3.5">{Number(log.kms || 0).toFixed(2)} KM (₹{Number(log.allowance || 0).toFixed(2)})</td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex justify-end items-center space-x-2">
                                  <button
                                    onClick={() => setEditingLog({ ...log })}
                                    className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-605 dark:bg-slate-800 dark:hover:bg-slate-700 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span className="text-[9px] uppercase font-bold">Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTravelLog(log._id)}
                                    className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded cursor-pointer transition-all inline-flex items-center space-x-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span className="text-[9px] uppercase font-bold">Delete</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {workerTravel.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">No manual travel logs logged for this period.</td>
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
                            No commissions logged for this selection/period.
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
                  <span className="text-[8px] uppercase text-slate-400 block tracking-wider">Date Period</span>
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

    </div>
  );
};

export default AdminTravelExpenses;

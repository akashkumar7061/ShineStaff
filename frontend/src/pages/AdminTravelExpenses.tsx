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

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersRes, jobsRes, travelRes, settingsRes] = await Promise.all([
        api.get('/workers'),
        api.get('/jobs'),
        api.get('/travel/all'),
        api.get('/settings').catch(() => ({ data: null }))
      ]);

      setWorkers(workersRes.data || []);
      setJobs(jobsRes.data || []);
      setTravelLogs(travelRes.data || []);
      
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

  // Calculations Engine
  const workerJobs = getFilteredJobs();
  const workerTravel = getFilteredTravelLogs();

  const totalJobsCount = workerJobs.length;
  const totalWorkEarnings = workerJobs.reduce((sum, j) => sum + (j.price || 0), 0);
  
  // Calculate total KMs from logs + jobs fuelKmsTravelled
  const totalDistance = workerTravel.reduce((sum, log) => sum + (log.kms || 0), 0) + 
                        workerJobs.reduce((sum, j) => sum + (j.fuelKmsTravelled || 0), 0);

  const totalFuelCost = totalDistance * globalFuelRate;
  
  // Total travel time in minutes (estimated 2 mins per KM + 15 mins buffer per job)
  const totalTravelTimeMinutes = Math.round(totalDistance * 1.8 + totalJobsCount * 12);
  const formattedTravelTime = `${Math.floor(totalTravelTimeMinutes / 60)}h ${totalTravelTimeMinutes % 60}m`;

  const totalPayout = totalWorkEarnings + totalFuelCost + Number(manualAdjustment || 0);

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
              onFocus={() => setShowWorkersDropdown(true)}
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
                .filter(w => w.name.toLowerCase().includes(searchWorker.toLowerCase()) || searchWorker.toLowerCase() === 'all workers')
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
              {workers.filter(w => w.name.toLowerCase().includes(searchWorker.toLowerCase()) || searchWorker.toLowerCase() === 'all workers').length === 0 && (
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 print:grid-cols-6">
              {[
                { label: 'Completed Jobs', val: totalJobsCount, desc: 'jobs done', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' },
                { label: 'Work Earnings', val: `₹${totalWorkEarnings.toFixed(2)}`, desc: 'clean revenues', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
                { label: 'Travel Distance', val: `${totalDistance.toFixed(2)} KM`, desc: 'total commutes', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/20' },
                { label: 'Fuel Costs', val: `₹${totalFuelCost.toFixed(2)}`, desc: `at ₹${globalFuelRate}/KM`, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' },
                { label: 'Travel Duration', val: formattedTravelTime, desc: 'time on road', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
                { label: 'Grand Payout', val: `₹${totalPayout.toFixed(2)}`, desc: 'earnings + fuel', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' }
              ].map((kpi, idx) => (
                <div key={idx} className="glass-card p-4 flex flex-col justify-between hover:scale-[1.02] transition-all">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                  <h4 className="text-sm font-black text-slate-855 dark:text-white mt-1">{kpi.val}</h4>
                  <span className="text-[8px] text-slate-450 mt-1 block lowercase dark:text-slate-400">{kpi.desc}</span>
                </div>
              ))}
            </div>

            {/* TAB CONTENT: 1. Dashboard View */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Visual Analytics graphs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Earnings Trend (₹)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getChartData()}>
                          <defs>
                            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                          <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                          <Tooltip />
                          <Area type="monotone" dataKey="Earnings" stroke="#10b981" fillOpacity={1} fill="url(#colorEarnings)" strokeWidth={2} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Travel & Distance Trend (KM)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                          <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Distance" name="Distance (KM)" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Performance Highlights desk */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Commutes Summary Desk</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold text-slate-655 dark:text-slate-350">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">Total Route Travel:</span>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">{totalDistance.toFixed(2)} KMs Traveled</p>
                      <span className="text-[9px] text-emerald-500 font-bold block">₹{totalFuelCost.toFixed(2)} Fuel Allowance Earned</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">Average Speed Allocation:</span>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">~45 KM/Hour</p>
                      <span className="text-[9px] text-slate-455 block">Standard billing commute rate</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">Manual adjustments:</span>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">₹{manualAdjustment}</p>
                      <span className="text-[9px] text-slate-455 block">Adjustable in Travel Settings</span>
                    </div>
                  </div>
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
                <div>
                  <h3 className="text-xs font-black text-slate-455 uppercase tracking-widest">Travel & Fuel Expenses details</h3>
                  <p className="text-[10px] text-slate-400">Lists travel distance records logged by Selected Worker.</p>
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
                                  className="w-28 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                />
                              </td>
                              <td className="px-4 py-3.5 space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingLog.kms || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, kms: e.target.value, allowance: (Number(e.target.value) * globalFuelRate).toFixed(2) })}
                                  className="w-20 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
                                  placeholder="KM"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={editingLog.allowance || ''}
                                  onChange={(e) => setEditingLog({ ...editingLog, allowance: e.target.value })}
                                  className="w-20 block text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 outline-none focus:border-secondary"
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
                                <button
                                  onClick={() => setEditingLog({ ...log })}
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
                      {workerTravel.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">No manual travel logs logged for this period.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Route History summary list */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-455 uppercase tracking-widest flex items-center space-x-1">
                    <Map className="h-4.5 w-4.5 text-secondary" />
                    <span>Auto-calculated Route Commutes History</span>
                  </h4>
                  <div className="space-y-3.5">
                    {getRouteHistory().map((route, index) => (
                      <div key={route.id} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="h-5.5 w-5.5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-[10px]">{index + 1}</span>
                          <div>
                            <div className="font-extrabold text-slate-800 dark:text-white flex items-center space-x-2 flex-wrap">
                              <span>{route.from}</span>
                              <ChevronRight className="h-3 w-3 text-slate-400" />
                              <span>{route.to}</span>
                            </div>
                            <span className="text-[9px] text-slate-455 block mt-0.5">Est. Distance: {Number(route.distance || 0).toFixed(2)} KM | Est. Time: {route.time}</span>
                          </div>
                        </div>
                        <a
                          href={route.mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] uppercase shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1 self-start md:self-auto"
                        >
                          <Compass className="h-3 w-3" />
                          <span>View on Google Maps</span>
                        </a>
                      </div>
                    ))}
                    {getRouteHistory().length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No commute route history generated.</p>
                    )}
                  </div>
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

    </div>
  );
};

export default AdminTravelExpenses;

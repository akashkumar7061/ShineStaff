import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  ClipboardList,
  Plus,
  Check,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Phone,
  DollarSign,
  Calendar,
  Clock,
  Sparkles,
  Archive,
  Pencil
} from 'lucide-react';

const getTodayString = () => new Date().toISOString().split('T')[0];
const getFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const AdminLogDailyJobs: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'completed' | 'approvals' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(getTodayString());

  // --- Quick Job Logger Form State ---
  const [jobTitle, setJobTitle] = useState('');
  const [jobPrice, setJobPrice] = useState('');
  const [jobWorker, setJobWorker] = useState('');
  const [jobClientName, setJobClientName] = useState('');
  const [jobClientPhone, setJobClientPhone] = useState('');
  const [jobCompany, setJobCompany] = useState('SofaShine');
  const [jobDate, setJobDate] = useState(getTodayString());
  const [jobStatus, setJobStatus] = useState<'pending' | 'completed'>('completed');
  const [jobTimeSlot, setJobTimeSlot] = useState('09:00 AM - 12:00 PM');

  // --- Edit Job Modal State ---
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editWorker, setEditWorker] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editCompany, setEditCompany] = useState('SofaShine');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'completed' | 'cancelled' | 'rejected' | 'accepted' | 'started'>('completed');
  const [editTimeSlot, setEditTimeSlot] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, workersRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/workers')
      ]);
      setJobs(jobsRes.data || []);
      setWorkers(workersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs or workers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobPrice || !jobClientName || !jobClientPhone) {
      alert('Please fill out all required job fields.');
      return;
    }

    try {
      await api.post('/jobs', {
        title: jobTitle,
        price: Number(jobPrice),
        workerId: jobWorker === 'unassigned' || !jobWorker ? undefined : jobWorker,
        clientName: jobClientName,
        clientPhone: jobClientPhone,
        company: jobCompany,
        date: jobDate,
        timeSlot: jobTimeSlot,
        status: jobStatus,
        paymentStatus: jobStatus === 'completed' ? 'received' : 'pending',
        address: 'Direct Logged via Daily Logger Console',
        location: { lat: 28.6139, lng: 77.2090 }
      });

      setJobTitle('');
      setJobPrice('');
      setJobWorker('');
      setJobClientName('');
      setJobClientPhone('');
      alert('Clean Job logged successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to quick-add job:', err);
      alert('Failed to log clean job. Please try again.');
    }
  };

  const handleApproveJob = async (jobId: string) => {
    try {
      await api.put(`/jobs/${jobId}`, {
        status: 'completed',
        paymentStatus: 'received'
      });
      alert('Clean job approved & marked as completed!');
      fetchData();
    } catch (err) {
      console.error('Failed to approve job:', err);
      alert('Failed to approve job.');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this clean job?')) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      alert('Clean job deleted successfully.');
      fetchData();
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert('Failed to delete job.');
    }
  };

  const handleUpdateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    try {
      await api.put(`/jobs/${editingJob._id}`, {
        title: editTitle,
        price: Number(editPrice),
        workerId: editWorker === 'unassigned' || !editWorker ? undefined : editWorker,
        clientName: editClientName,
        clientPhone: editClientPhone,
        company: editCompany,
        date: editDate,
        timeSlot: editTimeSlot,
        status: editStatus,
        paymentStatus: editStatus === 'completed' ? 'received' : 'pending'
      });

      alert('Clean Job updated successfully!');
      setEditingJob(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update job:', err);
      alert('Failed to update job.');
    }
  };

  // --- Excel Download Handler ---
  const handleDownloadSpreadsheet = (filterType: 'all' | 'completed' | 'cancelled') => {
    let rangeJobs = jobs.filter(j => j.date && j.date >= startDate && j.date <= endDate);
    let filtered = [...rangeJobs];
    let filename = 'all_work_logs.xls';

    if (filterType === 'completed') {
      filtered = rangeJobs.filter(j => j.status === 'completed');
      filename = 'completed_work_logs.xls';
    } else if (filterType === 'cancelled') {
      filtered = rangeJobs.filter(j => j.status === 'cancelled');
      filename = 'cancelled_work_logs.xls';
    }

    if (filtered.length === 0) {
      alert(`No records found for ${filterType} work category.`);
      return;
    }

    // Build Microsoft Excel XML/HTML spreadsheet format
    let excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Clean Work Logs</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <th>Job ID</th>
              <th>Clean Job Title</th>
              <th>Company Division</th>
              <th>Client Name</th>
              <th>Client Phone</th>
              <th>Price (INR)</th>
              <th>Date</th>
              <th>Time Slot</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th>Assigned Crew Worker</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach(j => {
      excelTemplate += `
        <tr>
          <td>${j._id || ''}</td>
          <td>${j.title || ''}</td>
          <td>${j.company || ''}</td>
          <td>${j.clientName || ''}</td>
          <td>${j.clientPhone || ''}</td>
          <td>${j.price || 0}</td>
          <td>${j.date || ''}</td>
          <td>${j.timeSlot || ''}</td>
          <td>${j.status || ''}</td>
          <td>${j.paymentStatus || ''}</td>
          <td>${j.workerId?.name || 'Unassigned'}</td>
        </tr>
      `;
    });

    excelTemplate += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Filtering lists ---
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const approvalJobs = jobs.filter(j => j.status === 'pending' || j.status === 'cancelled' || j.status === 'rejected');

  const getFilteredList = () => {
    let activeList = [];
    if (activeTab === 'all') {
      activeList = jobs;
    } else if (activeTab === 'completed') {
      activeList = completedJobs;
    } else {
      activeList = approvalJobs;
    }
    
    // Filter by date range first
    let filtered = activeList.filter(j => {
      if (!j.date) return false;
      return j.date >= startDate && j.date <= endDate;
    });

    if (!searchQuery) return filtered;
    return filtered.filter(
      j =>
        (j.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.workerId?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <ClipboardList className="h-6 w-6 text-sky-500" />
            <span>Log Daily Clean Job Dashboard</span>
          </h2>
          <p className="text-[11px] text-slate-450 mt-1 dark:text-slate-400">
            Log new clean jobs, approve pending/cancelled clean entries, and download formatted excelsheet work logs.
          </p>
        </div>

        {/* Export / Download desk */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => handleDownloadSpreadsheet('all')}
            className="flex items-center space-x-1 bg-slate-250 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-205 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm border border-slate-300 dark:border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download All Excel</span>
          </button>
          <button
            onClick={() => handleDownloadSpreadsheet('completed')}
            className="flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm border border-emerald-200 dark:border-emerald-900/50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Completed Work</span>
          </button>
          <button
            onClick={() => handleDownloadSpreadsheet('cancelled')}
            className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm border border-rose-200 dark:border-rose-900/50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Cancelled Work</span>
          </button>
        </div>
      </div>

      {/* Main Layout Stack */}
      <div className="space-y-6">
        
        {/* Top Section: Logging Form */}
        <div className="glass-card p-6 border-t-4 border-t-sky-500">
          <h4 className="text-xs font-black uppercase text-sky-655 tracking-wider mb-4 flex items-center space-x-1.5 dark:text-sky-400">
            <ClipboardList className="h-5 w-5" />
            <span>Log Daily Clean Job</span>
          </h4>
          <form onSubmit={handleAddJob} className="space-y-4 text-xs font-bold text-slate-655 dark:text-slate-350">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Clean Job Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sofa Sanitization Clean"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Price (INR):</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 3500"
                  value={jobPrice}
                  onChange={(e) => setJobPrice(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Date:</label>
                <input
                  type="date"
                  required
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:color-scheme-dark dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Client Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={jobClientName}
                  onChange={(e) => setJobClientName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Phone Number:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={jobClientPhone}
                  onChange={(e) => setJobClientPhone(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Company Division:</label>
                <select
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                >
                  <option value="SofaShine">SofaShine</option>
                  <option value="CleanCruisers">CleanCruisers</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Assign Crew Worker:</label>
                <select
                  value={jobWorker}
                  onChange={(e) => setJobWorker(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                >
                  <option value="">Select worker...</option>
                  <option value="unassigned">Unassigned (Omit Crew)</option>
                  {workers.map((w: any) => (
                    <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Status:</label>
                <select
                  value={jobStatus}
                  onChange={(e) => setJobStatus(e.target.value as any)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-855 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                >
                  <option value="completed">Completed (Paid)</option>
                  <option value="pending">Scheduled (Pending)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Timing Slot:</label>
                <input
                  type="text"
                  value={jobTimeSlot}
                  onChange={(e) => setJobTimeSlot(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold p-2.5 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Log clean scheduled</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bottom Section: Work Logs & Approvals Desk */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            
            {/* Toolbar Desk */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              
              {/* Tab Navigation */}
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 text-[11px] font-bold">
                <button
                  onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>All Clean Logs ({jobs.length})</span>
                </button>
                <button
                  onClick={() => { setActiveTab('completed'); setSearchQuery(''); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'completed'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Completed Work Logs ({completedJobs.length})</span>
                </button>
                <button
                  onClick={() => { setActiveTab('approvals'); setSearchQuery(''); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'approvals'
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Approvals Desk ({approvalJobs.length})</span>
                </button>
              </div>

              {/* Date Range & Search Container */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {/* Date Inputs */}
                <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500">
                  <span className="uppercase tracking-wider">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-[10px] font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-1.5 outline-none focus:border-sky-500 dark:color-scheme-dark dark:text-white"
                  />
                  <span className="uppercase tracking-wider">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-[10px] font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-1.5 outline-none focus:border-sky-500 dark:color-scheme-dark dark:text-white"
                  />
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-[11px] font-semibold pl-8 pr-3 py-2 rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 outline-none focus:border-sky-500 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
              </div>
            ) : getFilteredList().length === 0 ? (
              <div className="text-center py-12 text-slate-450 dark:text-slate-400">
                <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No records found matching your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-105 dark:border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider font-bold">
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3">Job Details</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Worker Assigned</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Actions Desk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredList().map((job) => (
                      <tr
                        key={job._id}
                        className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-xs font-semibold"
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              job.company === 'SofaShine'
                                ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400'
                                : 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                            }`}
                          >
                            {job.company || 'ShineStaff'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-800 dark:text-white">{job.title}</div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <span className="flex items-center"><Calendar className="h-3 w-3 mr-0.5" />{job.date}</span>
                            <span className="flex items-center"><Clock className="h-3 w-3 mr-0.5" />{job.timeSlot}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1 text-slate-800 dark:text-slate-200">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{job.clientName}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-450" />
                            <span>{job.clientPhone}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-800 dark:text-white">
                          ₹{job.price?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          {job.workerId ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {job.workerId.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              job.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : job.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex justify-center items-center space-x-2">
                            {job.status !== 'completed' && (
                              <button
                                onClick={() => handleApproveJob(job._id)}
                                title="Approve Clean Job"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-all"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingJob(job);
                                setEditTitle(job.title || '');
                                setEditPrice(String(job.price || ''));
                                setEditWorker(job.workerId?._id || 'unassigned');
                                setEditClientName(job.clientName || '');
                                setEditClientPhone(job.clientPhone || '');
                                setEditCompany(job.company || 'SofaShine');
                                setEditDate(job.date || getTodayString());
                                setEditStatus(job.status || 'completed');
                                setEditTimeSlot(job.timeSlot || '09:00 AM - 12:00 PM');
                              }}
                              title="Edit Clean Job"
                              className="p-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 cursor-pointer transition-all"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job._id)}
                              title="Delete Clean Job"
                              className="p-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Job Modal */}
      {editingJob && (
        <div onClick={() => setEditingJob(null)} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-2xl p-6 space-y-4 flex flex-col justify-between text-xs animate-fade-in select-none max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setEditingJob(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 font-black text-sm cursor-pointer z-10"
            >
              ✕
            </button>

            <h3 className="text-sm font-black uppercase text-indigo-650 tracking-wider mb-2 flex items-center space-x-1.5 dark:text-indigo-400">
              <ClipboardList className="h-5 w-5" />
              <span>Edit Clean Job Entry</span>
            </h3>

            <form onSubmit={handleUpdateJobSubmit} className="space-y-4 text-xs font-bold text-slate-655 dark:text-slate-350">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Clean Job Title:</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Price (INR):</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Client Name:</label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Phone Number:</label>
                  <input
                    type="text"
                    required
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Company Division:</label>
                  <select
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  >
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Assign Crew Worker:</label>
                  <select
                    value={editWorker}
                    onChange={(e) => setEditWorker(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  >
                    <option value="unassigned">Unassigned (Omit Crew)</option>
                    {workers.map((w: any) => (
                      <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Date:</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:color-scheme-dark dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Status:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-855 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  >
                    <option value="completed">Completed (Paid)</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                    <option value="accepted">Accepted</option>
                    <option value="started">Started</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[9px] uppercase tracking-wider text-slate-455">Timing Slot:</label>
                  <input
                    type="text"
                    value={editTimeSlot}
                    onChange={(e) => setEditTimeSlot(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 outline-none focus:border-sky-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogDailyJobs;

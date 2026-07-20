import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  CreditCard,
  DollarSign,
  QrCode,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  Wallet
} from 'lucide-react';

interface IPaymentRecord {
  _id: string;
  paymentId: string;
  jobId?: any;
  invoiceNumber?: string;
  workerId?: any;
  workerName: string;
  clientName: string;
  clientPhone: string;
  company: string;
  serviceCategory?: string;
  paymentMethod: 'cash' | 'upi_online' | 'card' | 'bank_transfer';
  qrId?: any;
  qrName?: string;
  upiId?: string;
  amount: number;
  paymentDate: string;
  paymentTime: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  collectedBy: string;
  remarks?: string;
}

interface IAnalytics {
  summary: {
    todayCollection: number;
    totalRevenue: number;
    cashCollection: number;
    onlineCollection: number;
    pendingPayments: number;
    failedPayments: number;
    refunds: number;
    totalCount: number;
  };
  qrBreakdown: Array<{ name: string; upiId: string; amount: number; count: number }>;
  companyBreakdown: Array<{ name: string; amount: number }>;
}

const AdminPaymentCollection: React.FC = () => {
  // Filters & State
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateRangePreset, setDateRangePreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(todayStr);

  const [selectedWorker, setSelectedWorker] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedQR, setSelectedQR] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [payments, setPayments] = useState<IPaymentRecord[]>([]);
  const [analytics, setAnalytics] = useState<IAnalytics | null>(null);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [qrList, setQrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quick Preset Date Calculator
  const applyDatePreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'year' | 'custom') => {
    setDateRangePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 6);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(mStart);
      setEndDate(todayStr);
    } else if (preset === 'year') {
      const yStart = `${now.getFullYear()}-01-01`;
      setStartDate(yStart);
      setEndDate(todayStr);
    }
  };

  // Fetch initial lookups (Workers & QRs)
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [wRes, qRes] = await Promise.all([
          api.get('/worker/all').catch(() => ({ data: [] })),
          api.get('/qr').catch(() => ({ data: [] }))
        ]);
        setWorkersList(wRes.data || []);
        setQrList(qRes.data || []);
      } catch (err) {
        console.error('Failed to fetch lookups:', err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch Payments & Analytics
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        startDate,
        endDate,
        workerId: selectedWorker,
        company: selectedCompany,
        paymentMethod: selectedMethod,
        qrName: selectedQR,
        status: selectedStatus,
        search: searchQuery,
        page,
        limit: 50
      };

      const [pRes, aRes] = await Promise.all([
        api.get('/payments/all', { params }),
        api.get('/payments/analytics', { params: { startDate, endDate } })
      ]);

      setPayments(pRes.data.payments || []);
      setTotalPages(pRes.data.pages || 1);
      setTotalCount(pRes.data.total || 0);
      setAnalytics(aRes.data);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedWorker, selectedCompany, selectedMethod, selectedQR, selectedStatus, page]);

  // Handle manual Search trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // Export CSV Helper
  const exportCSV = () => {
    if (payments.length === 0) return alert('No payment data available to export.');
    const headers = [
      'Payment ID', 'Invoice #', 'Job ID', 'Worker', 'Customer', 'Phone',
      'Company', 'Service', 'Method', 'QR Used', 'UPI ID', 'Amount (INR)',
      'Date', 'Time', 'Status', 'Collected By', 'Remarks'
    ];
    const rows = payments.map(p => [
      p.paymentId,
      p.invoiceNumber || '',
      typeof p.jobId === 'object' ? p.jobId?._id || '' : p.jobId || '',
      p.workerName,
      p.clientName,
      p.clientPhone,
      p.company,
      p.serviceCategory || 'Cleaning',
      p.paymentMethod,
      p.qrName || 'N/A',
      p.upiId || 'N/A',
      p.amount,
      p.paymentDate,
      p.paymentTime,
      p.status,
      p.collectedBy,
      `"${(p.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payment_Collection_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Helper
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <Wallet className="h-6 w-6 text-emerald-500" />
            <span>💰 Payment Collection & Revenue ERP</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Centralized tracking of cash, online UPI payments, QR code distribution, and worker collections.</p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all cursor-pointer inline-flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer inline-flex items-center space-x-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        
        {/* Card 1: Today's Collection */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Today's Collection</span>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            ₹{(analytics?.summary.todayCollection || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Live Today</div>
        </div>

        {/* Card 2: Cash Collection */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Cash Received</span>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
            ₹{(analytics?.summary.cashCollection || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Physical Cash</div>
        </div>

        {/* Card 3: Online Collection */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-blue-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Online / UPI</span>
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
            ₹{(analytics?.summary.onlineCollection || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-blue-500 font-bold mt-0.5">QR Collections</div>
        </div>

        {/* Card 4: Pending Payments */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-orange-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Pending</span>
          <div className="text-lg font-black text-orange-600 dark:text-orange-400 mt-1">
            ₹{(analytics?.summary.pendingPayments || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Outstanding</div>
        </div>

        {/* Card 5: Failed Payments */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-rose-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Failed</span>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
            ₹{(analytics?.summary.failedPayments || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Unsuccessful</div>
        </div>

        {/* Card 6: Refunds */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-violet-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Refunds</span>
          <div className="text-lg font-black text-violet-600 dark:text-violet-400 mt-1">
            ₹{(analytics?.summary.refunds || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Returned</div>
        </div>

        {/* Card 7: Total Revenue */}
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-indigo-500 shadow-md">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Period Revenue</span>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
            ₹{(analytics?.summary.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-indigo-500 font-bold mt-0.5">Selected Range</div>
        </div>

      </div>

      {/* QR Analytics Section Cards */}
      {analytics && analytics.qrBreakdown.length > 0 && (
        <div className="glass-card p-5 rounded-3xl shadow-xl space-y-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-secondary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                📊 QR-Wise Collection Analytics & Distribution
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Tracked Online Revenue</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {analytics.qrBreakdown.map((qr, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">{qr.name}</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{qr.count} Txns</span>
                </div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  ₹{qr.amount.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {qr.upiId || 'Mapped QR Code'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Control Bar & Search */}
      <div className="glass-card p-5 rounded-3xl shadow-xl space-y-4 border border-slate-200 dark:border-slate-800">
        
        {/* Quick Date Range Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <span>Date Presets:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: "Today" },
              { id: 'yesterday', label: "Yesterday" },
              { id: '7days', label: "Last 7 Days" },
              { id: 'month', label: "This Month" },
              { id: 'year', label: "This Year" }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id as any)}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer ${
                  dateRangePreset === p.id
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs & Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-bold">
          
          {/* Custom Start Date */}
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setDateRangePreset('custom'); setStartDate(e.target.value); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none text-slate-800 dark:text-white"
            />
          </div>

          {/* Custom End Date */}
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setDateRangePreset('custom'); setEndDate(e.target.value); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none text-slate-800 dark:text-white"
            />
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none text-slate-800 dark:text-white"
            >
              <option value="all">All Companies</option>
              <option value="SofaShine">SofaShine</option>
              <option value="CleanCruisers">CleanCruisers</option>
              <option value="ShineStaff">ShineStaff</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Payment Method</label>
            <select
              value={selectedMethod}
              onChange={(e) => { setSelectedMethod(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none text-slate-800 dark:text-white"
            >
              <option value="all">All Methods</option>
              <option value="upi_online">UPI / Online QR</option>
              <option value="cash">Cash Received</option>
              <option value="card">Card Payment</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {/* QR Code Filter */}
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">QR Code Used</label>
            <select
              value={selectedQR}
              onChange={(e) => { setSelectedQR(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none text-slate-800 dark:text-white"
            >
              <option value="all">All QR Codes</option>
              {qrList.map(qr => (
                <option key={qr._id} value={qr.name}>{qr.name}</option>
              ))}
            </select>
          </div>

          {/* Worker Filter */}
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Collected By Worker</label>
            <select
              value={selectedWorker}
              onChange={(e) => { setSelectedWorker(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none text-slate-800 dark:text-white"
            >
              <option value="all">All Staff & Workers</option>
              {workersList.map(w => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Global Live Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative pt-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Customer Name, Worker Name, Job ID, Invoice #, Phone Number, QR Name, or UPI ID..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-28 text-xs font-bold outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Payment Collection Table */}
      <div className="glass-card rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
          <span>Payment Transactions Log ({totalCount} Records)</span>
          <span>Showing Page {page} of {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Payment ID & Invoice</th>
                <th className="p-4">Customer & Service</th>
                <th className="p-4">Company</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">QR Tracking / Cash details</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Collected By</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-bold text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading Payment Collection Records...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">No payment collection records found matching criteria.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    
                    {/* Payment ID & Invoice */}
                    <td className="p-4 space-y-0.5">
                      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">{p.paymentId}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{p.invoiceNumber || 'INV-GENERAL'}</div>
                    </td>

                    {/* Customer & Service */}
                    <td className="p-4 space-y-0.5">
                      <div className="font-extrabold text-slate-900 dark:text-white">{p.clientName}</div>
                      <div className="text-[10px] text-slate-400">{p.clientPhone} • {p.serviceCategory || 'Cleaning'}</div>
                    </td>

                    {/* Company */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider ${
                        p.company === 'SofaShine'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {p.company}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider flex items-center space-x-1 w-fit ${
                        p.paymentMethod === 'upi_online'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {p.paymentMethod === 'upi_online' ? <QrCode className="h-3 w-3 inline mr-1" /> : <DollarSign className="h-3 w-3 inline mr-1" />}
                        <span>{p.paymentMethod === 'upi_online' ? 'UPI / Online' : 'Cash Received'}</span>
                      </span>
                    </td>

                    {/* QR Tracking / Cash Details */}
                    <td className="p-4 space-y-0.5">
                      {p.paymentMethod === 'upi_online' ? (
                        <div>
                          <div className="text-xs font-black text-purple-600 dark:text-purple-400">
                            ✅ {p.qrName || 'Corporate QR'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 font-bold">
                            {p.upiId || 'UPI Direct'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                            💵 Cash Handover
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            Physical Collection
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-black text-base text-slate-900 dark:text-white">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Date & Time */}
                    <td className="p-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                      <div>{p.paymentDate}</div>
                      <div className="text-[10px] text-slate-400">{p.paymentTime}</div>
                    </td>

                    {/* Collected By */}
                    <td className="p-4 space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.workerName}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{p.collectedBy}</div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                        p.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : p.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>

            <span>Page {page} of {totalPages}</span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default AdminPaymentCollection;

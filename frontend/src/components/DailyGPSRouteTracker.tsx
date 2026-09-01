import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  MapPin,
  Calendar,
  DollarSign,
  Download,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Sparkles,
  Check,
  Building2,
  Navigation
} from 'lucide-react';

interface DailyGPSRouteTrackerProps {
  companyFilter?: 'All' | 'SofaShine' | 'CleanCruisers';
}

const getTodayString = () => new Date().toISOString().split('T')[0];
const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const DailyGPSRouteTracker: React.FC<DailyGPSRouteTrackerProps> = ({ companyFilter = 'All' }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedWorkers, setExpandedWorkers] = useState<Record<string, boolean>>({});
  const [approvingWorkerId, setApprovingWorkerId] = useState<string | null>(null);

  const fetchDailySummary = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/travel/daily-summary?date=${dateStr}`);
      setSummaryData(res.data);
      // Auto-expand workers that have activity by default
      const initialExpanded: Record<string, boolean> = {};
      (res.data.workers || []).forEach((w: any) => {
        if (w.hasActivity) {
          initialExpanded[w.workerId] = true;
        }
      });
      setExpandedWorkers(initialExpanded);
    } catch (err: any) {
      console.error('Failed to load daily travel summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySummary(selectedDate);
  }, [selectedDate]);

  const toggleExpand = (workerId: string) => {
    setExpandedWorkers((prev) => ({
      ...prev,
      [workerId]: !prev[workerId]
    }));
  };

  const handleApprove = async (worker: any) => {
    setApprovingWorkerId(worker.workerId);
    try {
      await api.post('/travel/daily-approve', {
        workerId: worker.workerId,
        date: selectedDate,
        totalKM: worker.totalKM,
        allowance: worker.fuelAllowance
      });
      alert(`Daily travel allowance of ₹${worker.fuelAllowance} approved for ${worker.workerName}!`);
      fetchDailySummary(selectedDate);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve daily travel');
    } finally {
      setApprovingWorkerId(null);
    }
  };

  const downloadReportCSV = () => {
    if (!summaryData || !summaryData.workers) return;

    let csv = '\uFEFF';
    csv += `ShineStaff Daily Worker Travel & Route Report - Date: ${selectedDate}\r\n`;
    csv += `Total Team KM: ${summaryData.totalTeamKM} KM, Total Allowance: INR ${summaryData.totalTeamAllowance}, Fuel Rate: INR ${summaryData.fuelRate}/KM\r\n\r\n`;
    csv += 'Worker Name,Phone,Company,Total Sites,Total Distance (KM),Fuel Rate (INR/KM),Fuel Allowance (INR),Status,Approved Payout (INR),Home Address,Complete Journey Timeline Breakdown\r\n';

    summaryData.workers.forEach((w: any) => {
      const routeBreakdown = (w.legs || [])
        .map(
          (leg: any) =>
            `[Leg ${leg.legNumber}: ${leg.fromName} -> ${leg.toName} (${leg.distanceKM} KM, ${leg.durationText || 'est'})]`
        )
        .join(' | ');

      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

      csv += `${escape(w.workerName)},${escape(w.workerPhone)},${escape(w.company)},${w.totalJobsCount},${w.totalKM},${w.fuelRate},${w.fuelAllowance},${w.isApproved ? 'Approved' : 'Pending Review'},${w.approvedAllowance || 0},${escape(w.homeLocation?.address || 'Not Configured')},${escape(routeBreakdown || 'No Trips')}\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shinestaff_daily_travel_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter workers by search and companyFilter
  const filteredWorkers = (summaryData?.workers || []).filter((w: any) => {
    const matchesCompany =
      companyFilter === 'All' || w.company === companyFilter || w.company === 'Both';
    const matchesSearch =
      !searchQuery ||
      w.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.workerPhone.includes(searchQuery);
    return matchesCompany && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar & Date Preset Selection */}
      <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Navigation className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-850 dark:text-white">
              Worker Daily GPS Route & Google Maps KM Tracker
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Calculates exact driving road KM from <span className="font-semibold text-blue-500">Home ➔ Site 1 ➔ Mid-day Sites ➔ Return Home</span> for daily fuel reimbursements.
          </p>
        </div>

        {/* Action Buttons & Date Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full md:w-auto">
          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => setSelectedDate(getTodayString())}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedDate === getTodayString()
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(getPastDateString(1))}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedDate === getPastDateString(1)
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Yesterday
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 p-1 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => fetchDailySummary(selectedDate)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
            title="Refresh Route Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={downloadReportCSV}
            disabled={loading || !summaryData?.workers?.length}
            className="btn-blue-gradient flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download Daily Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
            <Navigation className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Team Travel</span>
            <h3 className="text-xl font-black text-slate-850 dark:text-white">
              {summaryData?.totalTeamKM || 0} <span className="text-xs font-normal text-slate-400">KM</span>
            </h3>
            <span className="text-[10px] text-blue-500 font-semibold">Google Maps Road Distance</span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Fuel Cost</span>
            <h3 className="text-xl font-black text-slate-850 dark:text-white">
              ₹{summaryData?.totalTeamAllowance || 0}
            </h3>
            <span className="text-[10px] text-emerald-500 font-semibold">
              @ ₹{summaryData?.fuelRate || 4} / KM Rate
            </span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500 shrink-0">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Travelers</span>
            <h3 className="text-xl font-black text-slate-850 dark:text-white">
              {summaryData?.activeTravelersCount || 0}{' '}
              <span className="text-xs font-normal text-slate-400">/ {summaryData?.totalWorkersCount || 0}</span>
            </h3>
            <span className="text-[10px] text-slate-400">Staff on site duty today</span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Calculation Engine</span>
            <h3 className="text-sm font-black text-slate-850 dark:text-white truncate">
              {summaryData?.hasGoogleApiKey ? 'Google Maps API' : 'OSRM Road Matrix'}
            </h3>
            <span className={`text-[10px] font-semibold ${summaryData?.hasGoogleApiKey ? 'text-emerald-500' : 'text-amber-500'}`}>
              {summaryData?.hasGoogleApiKey ? '🟢 Live Distance Matrix' : '🟡 Road Driving Fallback'}
            </span>
          </div>
        </div>
      </div>

      {/* 2.5 Google Maps API Key Status Tip */}
      {!summaryData?.hasGoogleApiKey && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold block">100% Accurate Google Maps Driving Distance:</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Currently running in road driving fallback. To calculate 100% exact Google Maps distance (e.g. 14.6 KM), please enter your Google Maps API Key in <strong>Company Settings</strong>.
              </span>
            </div>
          </div>
          <a
            href="/admin/settings"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors"
          >
            Configure Key ↗
          </a>
        </div>
      )}

      {/* 3. Search Filter */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search worker by name or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 outline-none focus:border-secondary shadow-sm"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold">
          Showing {filteredWorkers.length} workers
        </span>
      </div>

      {/* 4. Worker Daily Route Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 h-36 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Workers Found</h4>
          <p className="text-xs text-slate-400">No workers match the selected company or search filters for {selectedDate}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorkers.map((worker: any) => {
            const isExpanded = !!expandedWorkers[worker.workerId];

            return (
              <div
                key={worker.workerId}
                className="glass-card rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800 transition-all hover:shadow-md"
              >
                {/* Worker Card Header */}
                <div className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={
                        worker.workerPhoto ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${worker.workerName}`
                      }
                      alt={worker.workerName}
                      className="h-12 w-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
                          {worker.workerName}
                        </h3>
                        <span className="rounded-md bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold text-slate-600 dark:text-slate-300 uppercase">
                          {worker.company}
                        </span>
                        {worker.isApproved ? (
                          <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-extrabold flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approved (₹{worker.approvedAllowance})</span>
                          </span>
                        ) : worker.hasActivity ? (
                          <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[9px] font-extrabold flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Pending Review</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span>📞 {worker.workerPhone}</span>
                        <span>•</span>
                        {worker.hasHomeConfigured ? (
                          <span className="text-blue-500 font-semibold truncate max-w-xs" title={worker.homeLocation?.address}>
                            🏠 {worker.homeLocation?.address || 'Home GPS Set'}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-semibold flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Home GPS Not Configured</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges & Action Buttons */}
                  <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Day KM</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                          {worker.totalKM} KM
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
                      <div className="text-right">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Fuel Payout</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ₹{worker.fuelAllowance}
                        </span>
                      </div>
                    </div>

                    {/* Approve Button */}
                    {worker.hasActivity && !worker.isApproved && (
                      <button
                        onClick={() => handleApprove(worker)}
                        disabled={approvingWorkerId === worker.workerId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {approvingWorkerId === worker.workerId ? (
                          <span>Approving...</span>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve ₹{worker.fuelAllowance}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Expand/Collapse Toggle */}
                    <button
                      onClick={() => toggleExpand(worker.workerId)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title={isExpanded ? 'Collapse Route' : 'Expand Route Details'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Route Timeline */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 space-y-6 animate-fade-in">
                    {!worker.hasActivity ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No service visits or job tasks logged for {worker.workerName} on {selectedDate}.
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                            <span>🗺️</span>
                            <span>Step-by-Step Driving Route Timeline ({worker.legs.length} Legs)</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {worker.completedJobsCount} of {worker.totalJobsCount} Jobs Completed
                          </span>
                        </div>

                        {/* Step-by-Step Visual Chain */}
                        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-500/30 dark:before:bg-blue-500/20">
                          {worker.legs.map((leg: any, idx: number) => {
                            const isFirst = idx === 0;
                            const isLast = idx === worker.legs.length - 1;

                            return (
                              <div key={idx} className="relative space-y-3">
                                {/* Stop Node Marker */}
                                <div className="absolute -left-[30px] top-1.5 flex items-center justify-center h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-sm z-10 text-[10px] font-black text-blue-600">
                                  {isFirst ? '🏠' : isLast ? '🏠' : idx + 1}
                                </div>

                                {/* Stop Details Box */}
                                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      {isFirst ? 'Start Point (Home Departure)' : `Stop #${idx}: ${leg.fromName}`}
                                    </span>
                                    {leg.time && (
                                      <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                                        🕒 {leg.time}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {leg.fromName}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 leading-relaxed truncate">
                                    {leg.fromAddress}
                                  </p>
                                </div>

                                {/* Driving Leg Distance Connector */}
                                <div className="ml-4 pl-4 border-l-2 border-dashed border-blue-400/40 dark:border-blue-500/30 py-2 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                                      🚗 +{leg.distanceKM} KM
                                    </span>
                                    {leg.durationText && (
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        (~{leg.durationText})
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                      leg.source === 'google_maps'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {leg.source === 'google_maps' ? '🟢 Google Maps' : '🟡 Road Estimate'}
                                    </span>
                                  </div>

                                  <a
                                    href={leg.googleMapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1 hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Open Leg on Google Maps</span>
                                  </a>
                                </div>

                                {/* If this is the last leg, render the final Home Return Destination node */}
                                {isLast && (
                                  <div className="relative mt-3">
                                    <div className="absolute -left-[30px] top-1.5 flex items-center justify-center h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-sm z-10 text-[10px] font-black text-emerald-600">
                                      🏠
                                    </div>
                                    <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
                                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
                                        End Point (Return to Home)
                                      </span>
                                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {leg.toName}
                                      </h5>
                                      <p className="text-[11px] text-slate-400 leading-relaxed truncate">
                                        {leg.toAddress}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default DailyGPSRouteTracker;

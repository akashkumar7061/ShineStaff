import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Activity, Calendar, Clock, Sparkles, X, Star, MapPin, User, Compass, Phone } from 'lucide-react';

interface AdminOperationsHUDProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const LiveActiveJobBanner: React.FC<{ job: any; onClick: () => void }> = ({ job, onClick }) => {
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
    <div 
      onClick={onClick}
      className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-slate-900/60 p-5 space-y-4 shadow-md relative overflow-hidden text-slate-800 dark:text-white text-xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:border-emerald-500/50"
    >
      <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-white animate-pulse shadow-sm text-sm shrink-0">
            🟢
          </div>
          <div className="text-left min-w-0">
            <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block">
              ⚡ LIVE CLEAN IN PROGRESS
            </span>
            <span className="font-extrabold text-slate-800 dark:text-white block text-sm break-words">
              {job.title}
            </span>
          </div>
        </div>

        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl px-2.5 py-1 font-black text-[9px] uppercase tracking-wider shrink-0 animate-pulse">
          Work In Progress
        </div>
      </div>

      {/* Separate section for live elapsed time taken */}
      <div className="bg-slate-950 text-white p-3.5 rounded-xl border border-slate-800 flex justify-between items-center shadow-inner mt-2">
        <div className="space-y-0.5 text-left">
          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            ⏱️ WORK TIMELINE COUNTER
          </span>
          <span className="text-[9.5px] text-slate-400 font-medium">Time elapsed since start:</span>
        </div>
        <span className="text-base font-mono font-black text-emerald-400 tracking-wider animate-pulse-slow shrink-0">
          {format(seconds)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-left text-[11px] text-slate-655 dark:text-slate-350">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0 text-[10px]">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <span className="font-bold text-slate-850 dark:text-slate-150 break-words">
            {job.workerId?.name || 'Unassigned'}
          </span>
        </div>

        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Client Customer</span>
          <span className="font-bold text-slate-855 dark:text-slate-150 block break-words">
            👤 {job.clientName || 'N/A'}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-655 dark:text-slate-350 space-y-1.5 pt-1 text-left">
        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest text-left">Service Address</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-left break-words leading-normal">📍 {job.address || 'N/A'}</span>
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

      <div className="flex items-center justify-between text-[9px] bg-slate-50/50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
        <span className="text-slate-455">Slot: <strong className="text-slate-750 dark:text-slate-205">{job.timeSlot || 'N/A'}</strong></span>
        <span className="text-emerald-500 font-extrabold">Started At: {startTimeStr}</span>
      </div>
    </div>
  );
};

const AcceptedJobBanner: React.FC<{ job: any; onClick: () => void }> = ({ job, onClick }) => {
  const acceptTimeStr = job.acceptedAt 
    ? new Date(job.acceptedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  return (
    <div 
      onClick={onClick}
      className="rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-900/60 p-5 space-y-4 shadow-md relative overflow-hidden text-slate-800 dark:text-white text-xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:border-amber-500/50"
    >
      <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white animate-pulse shadow-sm text-sm shrink-0">
            🟡
          </div>
          <div className="text-left min-w-0">
            <span className="text-[8px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest block">
              ⚡ WORKER ACCEPTED
            </span>
            <span className="font-extrabold text-slate-855 dark:text-white block text-sm break-words">
              {job.title} ({job.company})
            </span>
          </div>
        </div>
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl px-2.5 py-1 font-black text-[9px] uppercase tracking-wider shrink-0 animate-pulse">
          Accepted
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left text-[11px] text-slate-655 dark:text-slate-350">
        <div className="flex items-center space-x-2.5 text-left min-w-0">
          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0 text-[10px]">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <div className="min-w-0 text-left">
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Assigned Worker</span>
            <span className="font-bold text-slate-855 dark:text-slate-155 block break-words">
              {job.workerId?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Client Customer</span>
          <span className="font-bold text-slate-855 dark:text-slate-150 block break-words">
            👤 {job.clientName || 'N/A'}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-655 dark:text-slate-350 text-left">
        <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Service Address</span>
        <span className="font-bold text-slate-800 dark:text-slate-200 block break-words leading-normal">📍 {job.address || 'N/A'}</span>
      </div>

      <div className="flex items-center justify-between text-[9px] bg-slate-50/50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-1">
        <span className="text-slate-450">Scheduled Slot: <strong className="text-slate-750 dark:text-slate-205">{job.timeSlot || 'N/A'}</strong></span>
        <span className="text-amber-500 font-extrabold">Accepted At: {acceptTimeStr}</span>
      </div>
    </div>
  );
};

const RecentlyCompletedJobBanner: React.FC<{ job: any; onClick: () => void }> = ({ job, onClick }) => {
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
    <div 
      onClick={onClick}
      className="rounded-2xl border border-emerald-500/25 bg-white dark:bg-slate-900/60 p-5 space-y-4 shadow-sm relative overflow-hidden text-slate-800 dark:text-white text-xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:border-emerald-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-sm text-sm shrink-0">
            ✓
          </div>
          <div className="text-left min-w-0">
            <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block">
              ✅ CLEANUP COMPLETED
            </span>
            <span className="font-extrabold text-slate-800 dark:text-white block text-sm break-words">
              {job.title}
            </span>
          </div>
        </div>
        <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl px-2.5 py-1 font-black text-[9px] uppercase tracking-wider shrink-0">
          Completed
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left text-[11px] text-slate-655 dark:text-slate-350">
        <div className="flex items-center space-x-2.5 text-left min-w-0">
          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0 text-[10px]">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <div className="min-w-0 text-left">
            <span className="block text-[8px] text-slate-405 uppercase tracking-widest">Worker</span>
            <span className="font-bold text-slate-855 dark:text-slate-150 block break-words">
              {job.workerId?.name || 'Worker'}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-black">Total Time Taken</span>
          <span className="font-bold text-emerald-500 dark:text-emerald-455 block mt-0.5">
            ⏱️ {formatDuration()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 text-[9px] bg-slate-50/50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
        <span className="text-slate-450 font-medium">Completed At: <strong className="text-slate-750 dark:text-slate-200">{completeTimeStr}</strong></span>
        <span className="text-slate-450 font-medium">Client: <strong className="text-slate-750 dark:text-slate-200">{job.clientName}</strong></span>
      </div>
    </div>
  );
};

const JobDetailModal: React.FC<{ job: any; onClose: () => void }> = ({ job, onClose }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (job.status !== 'started' || !job.startedAt) return;
    const startTime = new Date(job.startedAt).getTime();
    
    const update = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [job.startedAt, job.status]);

  const format = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const statusColors = {
    started: 'bg-emerald-500 text-white',
    accepted: 'bg-amber-500 text-white',
    completed: 'bg-emerald-600 text-white',
    pending: 'bg-slate-500 text-white',
    cancelled: 'bg-rose-500 text-white'
  };

  const accentColor = job.company === 'CleanCruisers' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay with blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto text-left text-xs font-bold space-y-5">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Block */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColors[job.status as keyof typeof statusColors] || 'bg-slate-500 text-white'}`}>
              {job.status === 'started' ? 'Started (In Progress)' : job.status}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${accentColor}`}>
              {job.company}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white break-words leading-tight">
            {job.title}
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">Job ID: #{job.visitId || job._id}</p>
        </div>

        {/* Active Timer for Started Clean */}
        {job.status === 'started' && job.startedAt && (
          <div className="bg-slate-950 text-white p-3.5 rounded-xl border border-slate-800 flex justify-between items-center shadow-inner">
            <div className="space-y-0.5">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">⏱️ ACTIVE CLEAN TIMER</span>
              <span className="text-[9.5px] text-slate-400 font-medium">Running elapsed time taken:</span>
            </div>
            <span className="text-lg font-mono font-black text-emerald-400 tracking-wider shrink-0 animate-pulse">
              {format(seconds)}
            </span>
          </div>
        )}

        {/* Grid Stats Block */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-[11px] text-slate-655 dark:text-slate-350">
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">Scheduled Slot</span>
            <span className="text-slate-800 dark:text-slate-200 flex items-center space-x-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{job.timeSlot || 'N/A'}</span>
            </span>
          </div>
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">Job Date</span>
            <span className="text-slate-800 dark:text-slate-200 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{job.date || 'N/A'}</span>
            </span>
          </div>
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">Service Price</span>
            <span className="text-slate-800 dark:text-slate-205 font-extrabold text-xs">
              ₹{(job.price || 0).toLocaleString('en-IN')}
            </span>
          </div>
          {job.rating !== undefined && (
            <div>
              <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">Rating</span>
              <div className="flex items-center space-x-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-3.5 w-3.5 ${star <= (job.rating || 0) ? 'text-amber-555 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Description, Address, Contact details */}
        <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-1">Service Address</span>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60 flex items-start justify-between gap-3">
              <span className="text-slate-800 dark:text-slate-200 break-words leading-normal">📍 {job.address || 'N/A'}</span>
              {job.location?.lat && job.location?.lng && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${job.location.lat},${job.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/30 rounded text-[9px] uppercase tracking-wider whitespace-nowrap shrink-0 flex items-center space-x-0.5"
                >
                  <Compass className="h-3 w-3" />
                  <span>Maps</span>
                </a>
              )}
            </div>
          </div>

          {job.description && (
            <div>
              <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-1">Service Description</span>
              <p className="text-slate-655 dark:text-slate-300 font-semibold break-words leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
                {job.description}
              </p>
            </div>
          )}

          {/* Client contact */}
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-1">Customer Details</span>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between gap-3">
              <div>
                <span className="block text-slate-800 dark:text-white font-extrabold text-[12px]">{job.clientName || 'N/A'}</span>
                <span className="text-[10px] text-slate-400 font-medium">{job.clientPhone || 'No Contact'}</span>
              </div>
              {job.clientPhone && (
                <a
                  href={`tel:${job.clientPhone}`}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 rounded-xl cursor-pointer shadow-sm transition-all shrink-0"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Worker details */}
          <div>
            <span className="block text-[8px] text-slate-400 uppercase tracking-widest mb-1">Assigned Worker</span>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60 flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-750 dark:text-white uppercase overflow-hidden shadow-inner shrink-0">
                {job.workerId?.avatar ? (
                  <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
                )}
              </div>
              <div className="min-w-0 text-left">
                <span className="block text-slate-800 dark:text-white font-extrabold text-[12px] break-words">{job.workerId?.name || 'Unassigned Worker'}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-0.5 font-semibold">{job.workerId?.company || 'N/A'} Worker</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60 space-y-1.5 text-[10px] text-slate-455">
          {job.acceptedAt && (
            <div className="flex justify-between">
              <span>Accepted At:</span>
              <span className="font-extrabold text-slate-750 dark:text-slate-300">{new Date(job.acceptedAt).toLocaleString('en-IN')}</span>
            </div>
          )}
          {job.startedAt && (
            <div className="flex justify-between">
              <span>Started At:</span>
              <span className="font-extrabold text-slate-750 dark:text-slate-300">{new Date(job.startedAt).toLocaleString('en-IN')}</span>
            </div>
          )}
          {job.completedAt && (
            <div className="flex justify-between">
              <span>Completed At:</span>
              <span className="font-extrabold text-slate-750 dark:text-slate-300">{new Date(job.completedAt).toLocaleString('en-IN')}</span>
            </div>
          )}
          {job.status === 'completed' && job.startedAt && job.completedAt && (
            <div className="flex justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40 font-bold text-slate-800 dark:text-white">
              <span>Total Clean Duration:</span>
              <span>{formatDuration()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminOperationsHUD: React.FC<AdminOperationsHUDProps> = ({ companyFilter }) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(getTodayString());
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/jobs?company=${companyFilter}`);
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch operations HUD jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Listen to real-time events triggered via socket in App.tsx
    const handleRealtimeUpdate = () => {
      fetchJobs();
    };

    window.addEventListener('socket-update', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('socket-update', handleRealtimeUpdate);
    };
  }, [companyFilter]);

  const activeJobs = jobs.filter((j: any) => j.status === 'started' && (!filterDate || j.date === filterDate));
  const acceptedJobs = jobs.filter((j: any) => j.status === 'accepted' && (!filterDate || j.date === filterDate));
  const completedJobs = jobs
    .filter((j: any) => j.status === 'completed' && j.completedAt && (!filterDate || j.date === filterDate))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6 text-left max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <Activity className="h-5.5 w-5.5 text-secondary animate-pulse" />
            <span>Real-Time Operations HUD</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Live work stopwatch counters, worker acceptance logs, and compliance trackers</p>
        </div>

        {/* Date Selector Filter */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <span className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Operations Date:</span>
          </span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-855 bg-white/70 dark:bg-slate-950/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-xs text-danger font-semibold hover:underline px-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-shimmer h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : activeJobs.length === 0 && acceptedJobs.length === 0 && completedJobs.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-3 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">No active operations</h3>
            <p className="text-xs text-slate-400 mt-1">Worker progress stopwatches will automatically stream here when they check-in.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Live Active Stopwatches */}
          {activeJobs.length > 0 && (
            <div className="space-y-3">
              <span className="block text-xs font-black text-emerald-500 uppercase tracking-widest">
                🟢 Live Cleans In Progress ({activeJobs.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeJobs.map((j) => (
                  <LiveActiveJobBanner key={j._id} job={j} onClick={() => setSelectedJob(j)} />
                ))}
              </div>
            </div>
          )}

          {/* 2. Accepted Awaiting Start */}
          {acceptedJobs.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-150 dark:border-slate-800/80">
              <span className="block text-xs font-black text-amber-500 uppercase tracking-widest">
                🟡 Worker Accepted & Awaiting Start ({acceptedJobs.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {acceptedJobs.map((j) => (
                  <AcceptedJobBanner key={j._id} job={j} onClick={() => setSelectedJob(j)} />
                ))}
              </div>
            </div>
          )}

          {/* 3. Recently Completed Cleans */}
          {completedJobs.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-150 dark:border-slate-800/80">
              <span className="block text-xs font-black text-slate-505 uppercase tracking-widest">
                ✅ Recently Completed Cleans (Last 4)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedJobs.map((j) => (
                  <RecentlyCompletedJobBanner key={j._id} job={j} onClick={() => setSelectedJob(j)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified Job Detail Modal Popup */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
};

export default AdminOperationsHUD;

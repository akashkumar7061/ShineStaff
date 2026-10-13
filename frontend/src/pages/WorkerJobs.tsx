import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import GPSAddress from '../components/GPSAddress';
import {
  Camera,
  CheckCircle,
  Clock,
  MapPin,
  Play,
  Navigation,
  Info,
  ShieldAlert,
  ClipboardList,
  Edit,
  Save,
  CheckCircle2,
  X,
  Search,
  Calendar,
  Phone,
  QrCode,
  Copy,
  ChevronRight
} from 'lucide-react';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPaymentBadge = (paymentStatus?: string, paymentMode?: string) => {
  const status = paymentStatus || 'pending';
  let bgClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
  let text = 'Pending';
  
  if (status === 'received') {
    bgClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    text = 'Paid';
  } else if (status === 'outstanding') {
    bgClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    text = 'Outstanding';
  }
  
  let modeSuffix = '';
  if (paymentMode === 'cash') {
    modeSuffix = ' 💵 Cash';
  } else if (paymentMode === 'upi_online') {
    modeSuffix = ' 📱 UPI';
  }
  
  return (
    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ml-1 ${bgClass}`}>
      {text}{modeSuffix}
    </span>
  );
};

const WorkerJobs: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'accepted' | 'started' | 'completed'>('all');

  // Interactive cleanup sheet modal state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Shutter control
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraType, setCameraType] = useState<'before' | 'after'>('before');

  // Temporary snaps inside form
  const [tempBeforePhoto, setTempBeforePhoto] = useState<string | null>(null);
  const [tempAfterPhotos, setTempAfterPhotos] = useState<string[]>(['', '', '', '', '']);
  const [tempAfterPhotosGPS, setTempAfterPhotosGPS] = useState<({ lat: number; lng: number } | null)[]>([null, null, null, null, null]);
  const [activeAfterPhotoIndex, setActiveAfterPhotoIndex] = useState<number | null>(null);
  const [tempKms, setTempKms] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [tempPaymentMode, setTempPaymentMode] = useState<'cash' | 'upi_online' | 'not_selected'>('not_selected');
  const [mappedQR, setMappedQR] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [filterDate, setFilterDate] = useState(getTodayString());
  const [searchQuery, setSearchQuery] = useState('');

  // Cancellation / Rejection modal state for Worker
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetJob, setCancelTargetJob] = useState<any | null>(null);
  const [cancelActionType, setCancelActionType] = useState<'reject' | 'cancel'>('reject');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const handleConfirmWorkerCancel = async () => {
    if (!cancelRemarks.trim()) {
      setCancelError('Cancellation remarks / reason is mandatory. Please enter a reason.');
      return;
    }
    if (!cancelTargetJob?._id) return;

    setIsSubmittingCancel(true);
    setCancelError('');
    try {
      if (cancelActionType === 'reject') {
        await api.put(`/jobs/${cancelTargetJob._id}/reject`, {
          reason: cancelRemarks.trim()
        });
        window.dispatchEvent(new CustomEvent('socket-update', { detail: { type: 'JOB_REJECTED', jobId: cancelTargetJob._id } }));
        alert('Job rejected.');
      } else {
        await api.put(`/jobs/${cancelTargetJob._id}/cancel`, {
          reason: cancelRemarks.trim()
        });
        window.dispatchEvent(new CustomEvent('socket-update', { detail: { type: 'JOB_CANCELLED', jobId: cancelTargetJob._id } }));
        alert('Job cancelled successfully.');
      }

      setCancelModalOpen(false);
      setCancelTargetJob(null);
      setCancelRemarks('');
      setSelectedJob(null);
      fetchJobs();
    } catch (err: any) {
      setCancelError(err.response?.data?.message || 'Failed to process cancellation. Please try again.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Auto-fetch mapped company QR code whenever UPI/Online is selected
  useEffect(() => {
    if (tempPaymentMode === 'upi_online' && selectedJob?.company) {
      setLoadingQR(true);
      api.get(`/qr/company/${selectedJob.company}`)
        .then(res => setMappedQR(res.data))
        .catch(err => console.error('Failed to fetch company QR:', err))
        .finally(() => setLoadingQR(false));
    } else {
      setMappedQR(null);
    }
  }, [tempPaymentMode, selectedJob]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch worker jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      if (
        type === 'NEW_JOB' ||
        type === 'JOB_STARTED' ||
        type === 'JOB_COMPLETED' ||
        type === 'JOB_CANCELLED' ||
        type === 'JOB_DELETED'
      ) {
        fetchJobs();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, []);

  useEffect(() => {
    if (loading || jobs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const startJobId = params.get('startJobId');
    const autoCamera = params.get('autoCamera');
    if (startJobId) {
      const targetJob = jobs.find(j => j._id === startJobId);
      if (targetJob) {
        openWorkSheet(targetJob);
        if (autoCamera === 'true' && targetJob.status === 'pending') {
          setCameraType('before');
          setCameraActive(true);
        }
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [jobs, loading]);

  const openWorkSheet = (job: any) => {
    setSelectedJob(job);
    setTempBeforePhoto(job.beforePhoto || null);
    if (job.afterPhotos && job.afterPhotos.length > 0) {
      setTempAfterPhotos(job.afterPhotos);
    } else if (job.afterPhoto) {
      setTempAfterPhotos([job.afterPhoto, '', '', '', '']);
    } else {
      setTempAfterPhotos(['', '', '', '', '']);
    }

    if (job.afterPhotoGPS) {
      setTempAfterPhotosGPS([job.afterPhotoGPS, null, null, null, null]);
    } else {
      setTempAfterPhotosGPS([null, null, null, null, null]);
    }
    setTempKms(job.fuelKmsTravelled?.toString() || '');
    setTempNotes(job.workerNotes || '');
    setTempPaymentMode(job.paymentMode || 'not_selected');
  };

  const handleCameraCapture = (dataUrl: string, coords: { lat: number; lng: number }) => {
    setCameraActive(false);
    if (!selectedJob) return;

    if (cameraType === 'before') {
      setTempBeforePhoto(dataUrl);
      // Automatically send "Start Job" PUT if they just snapped the before photo
      api.put(`/jobs/${selectedJob._id}/start`, {
        beforePhotoDataUrl: dataUrl,
        location: coords
      }).then(() => {
        alert('Before Photo uploaded! Job started.');
        // Refresh local details
        setSelectedJob({
          ...selectedJob,
          status: 'started',
          beforePhoto: dataUrl,
          beforePhotoGPS: coords
        });
        fetchJobs();
      }).catch((err) => {
        alert(err.response?.data?.message || 'Failed to start job');
        setTempBeforePhoto(null);
      });
    } else {
      if (activeAfterPhotoIndex !== null) {
        const newPhotos = [...tempAfterPhotos];
        newPhotos[activeAfterPhotoIndex] = dataUrl;
        setTempAfterPhotos(newPhotos);

        const newGPS = [...tempAfterPhotosGPS];
        newGPS[activeAfterPhotoIndex] = coords;
        setTempAfterPhotosGPS(newGPS);

        setActiveAfterPhotoIndex(null);
      }
    }
  };

  const triggerAfterPhotoIndexCapture = (idx: number) => {
    setActiveAfterPhotoIndex(idx);
    setCameraType('after');
    setCameraActive(true);
  };

  const handleCompleteWorkSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!tempBeforePhoto) {
      alert('Before photo is mandatory');
      return;
    }
    const validPhotos = tempAfterPhotos.filter(photo => !!photo && photo.trim().length > 50);
    if (validPhotos.length === 0) {
      alert('Please snap at least 1 After Cleaning Photo to complete the job.');
      return;
    }
    if (tempPaymentMode === 'not_selected') {
      alert('Please select a payment method before submitting.');
      return;
    }

    setSubmittingReport(true);
    const targetJob = selectedJob;
    const targetJobId = targetJob._id;

    try {
      const submitJobCompletion = async (coords?: { lat: number; lng: number }) => {
        const reqs: Promise<any>[] = [
          api.put(`/jobs/${targetJobId}/complete`, {
            afterPhotoDataUrls: validPhotos,
            location: coords,
            manualFuelKms: Number(tempKms),
            workerNotes: tempNotes,
            paymentMode: tempPaymentMode
          })
        ];

        if ((tempPaymentMode as string) !== 'not_selected') {
          reqs.push(
            api.post('/payments/record', {
              jobId: targetJobId,
              invoiceNumber: targetJob.visitId || `INV-${targetJobId.slice(-6)}`,
              workerId: targetJob.workerId?._id || targetJob.workerId,
              workerName: user?.name || 'Worker',
              clientName: targetJob.clientName,
              clientPhone: targetJob.clientPhone,
              company: targetJob.company,
              amount: targetJob.price || 0,
              paymentMethod: tempPaymentMode === 'cash' ? 'cash' : 'upi_online',
              qrId: mappedQR?._id,
              qrName: mappedQR?.name,
              upiId: mappedQR?.upiId,
              collectedBy: 'Worker'
            }).catch(e => console.error('Worker payment record error:', e))
          );
        }

        await Promise.all(reqs);

        // Instant UI update
        setJobs(prevJobs => prevJobs.map(j => j._id === targetJobId ? { ...j, status: 'completed' } : j));
        setSelectedJob(null);
        alert('Cleanup sheet submitted successfully! Job marked as completed.');
        fetchJobs();
      };

      const firstValidGPS = tempAfterPhotosGPS.find(g => g !== null);
      if (firstValidGPS) {
        await submitJobCompletion(firstValidGPS);
      } else if ('geolocation' in navigator) {
        // Fast 2s geolocation with immediate fallback
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            await submitJobCompletion(coords);
          },
          async (error) => {
            console.warn('Geolocation unavailable. Completing job with site address fallback.', error);
            await submitJobCompletion(undefined);
          },
          { timeout: 2000, maximumAge: 60000 }
        );
      } else {
        await submitJobCompletion(undefined);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification complete update failed');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleUpdateCompletedFuelKms = async () => {
    if (!selectedJob) return;
    try {
      const res = await api.put(`/jobs/${selectedJob._id}/fuel`, {
        fuelKmsTravelled: Number(tempKms)
      });
      alert('Fuel KMs updated successfully!');
      setSelectedJob(res.data.job);
      fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update fuel KMs');
    }
  };

  const triggerBeforeCapture = () => {
    setCameraType('before');
    setCameraActive(true);
  };

  const triggerAfterCapture = () => {
    setCameraType('after');
    setCameraActive(true);
  };

  const filteredJobs = jobs.filter((job) => {
    // 1. Status Filter
    if (activeFilter !== 'all' && job.status !== activeFilter) {
      return false;
    }

    // 2. Date Filter (Only today, or tomorrow if after 8 PM)
    const todayStr = getTodayString();
    const tomorrowStr = getTomorrowString();
    const currentHour = new Date().getHours();
    const showTomorrow = currentHour >= 20; // 8 PM local time

    if (showTomorrow) {
      if (job.date !== todayStr && job.date !== tomorrowStr) {
        return false;
      }
    } else {
      if (job.date !== todayStr) {
        return false;
      }
    }
    
    if (filterDate && job.date && job.date !== filterDate) {
      return false;
    }

    // 3. Search Query Filter (Job Title or Client Name)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title?.toLowerCase().includes(q);
      const matchClient = job.clientName?.toLowerCase().includes(q);
      if (!matchTitle && !matchClient) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    const parseTimeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const cleanStr = timeStr.trim().toUpperCase();
      const match = cleanStr.match(/^(\d+):(\d+)\s*(AM|PM)$/);
      if (!match) return 0;
      
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3];
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };

    const getJobStartTimeMinutes = (timeSlot: string): number => {
      if (!timeSlot) return 9999;
      const parts = timeSlot.split('-');
      if (parts.length === 0) return 9999;
      return parseTimeToMinutes(parts[0]);
    };

    return getJobStartTimeMinutes(a.timeSlot) - getJobStartTimeMinutes(b.timeSlot);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden relative">
      
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-amber-400/10 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/10 blur-[80px]" />
      </div>

      {/* Main Grid Container */}
      <main className="px-3 sm:px-6 lg:px-8 py-5 pt-20 sm:pt-24 max-w-7xl mx-auto space-y-4 sm:space-y-6 z-10 relative">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Columns: Tabs and jobs list */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Filter Tabs & Search Bar */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex space-x-1.5 rounded-xl bg-slate-200/50 dark:bg-slate-900/50 p-1 border border-slate-200/20 overflow-x-auto no-scrollbar">
                {['all', 'pending', 'accepted', 'started', 'completed'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as any)}
                    className={`flex-1 min-w-[70px] whitespace-nowrap rounded-lg py-2 px-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      activeFilter === filter
                        ? 'bg-gradient-to-r from-secondary to-blue-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                    }`}
                  >
                    {filter === 'started' ? 'In Progress' : filter}
                  </button>
                ))}
              </div>

              {/* Search and Date Filters bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm text-xs">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  {/* Job/Client Search */}
                  <div className="relative w-full sm:min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search jobs, clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 pl-9 pr-3 py-2 outline-none focus:border-secondary w-full text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Single Date Selector */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Clean Date:</span>
                  </span>
                  <input
                    type="date"
                    min={getTodayString()}
                    max={new Date().getHours() >= 20 ? getTomorrowString() : getTodayString()}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-805 bg-white/70 dark:bg-slate-950/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="text-xs text-danger font-semibold hover:underline px-2 cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Jobs Dashboard Container */}
            <div className="glass-card p-3 sm:p-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-shimmer h-36 md:h-12 w-full rounded-2xl md:rounded-lg" />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
                  No cleaning jobs found under this status.
                </div>
              ) : (
                <>
                  {/* MOBILE PHONE VIEW (< md): Modern, Touch-Friendly Job Cards */}
                  <div className="block md:hidden space-y-3.5">
                    {filteredJobs.map((job) => {
                      const isCompleted = job.status === 'completed';
                      const isStarted = job.status === 'started';
                      const isCancelled = job.status === 'cancelled' || job.status === 'rejected';
                      const isPending = job.status === 'pending';

                      return (
                        <div
                          key={job._id}
                          onClick={() => openWorkSheet(job)}
                          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer space-y-3 relative overflow-hidden"
                        >
                          {/* Accent status indicator bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            isCompleted ? 'bg-emerald-500' :
                            isStarted ? 'bg-secondary animate-pulse' :
                            isCancelled ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`} />

                          {/* Top Row: Company Pill & Status Badge */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="inline-block text-[10px] font-black bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                              {job.company}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                              isCompleted ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                              isStarted ? 'bg-secondary/15 text-secondary' :
                              isCancelled ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                              'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                isCompleted ? 'bg-emerald-500' :
                                isStarted ? 'bg-secondary animate-ping' :
                                isCancelled ? 'bg-rose-500' :
                                'bg-amber-500'
                              }`} />
                              <span>{isStarted ? 'In Progress' : job.status}</span>
                            </span>
                          </div>

                          {/* Job Title */}
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-850 dark:text-white leading-snug">
                              {job.title}
                            </h4>
                          </div>

                          {/* Schedule & Price Box */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                            {/* Date & Time */}
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-200">
                                <Calendar className="h-3.5 w-3.5 text-secondary shrink-0" />
                                <span className="font-bold text-xs">{job.date || 'Today'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 text-slate-400">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{job.timeSlot || 'Anytime'}</span>
                              </div>
                            </div>

                            {/* Amount & Payment */}
                            <div className="text-right flex flex-col justify-center items-end">
                              <div className="font-extrabold text-emerald-500 dark:text-emerald-450 text-sm sm:text-base">
                                {job.price !== undefined ? `₹${job.price}` : '—'}
                              </div>
                              <div className="mt-0.5">
                                {getPaymentBadge(job.paymentStatus, job.paymentMode)}
                              </div>
                            </div>
                          </div>

                          {/* Client Row with 1-Tap Direct Call */}
                          <div className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                            <div className="min-w-0 pr-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Client</span>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate block">
                                {job.clientName || 'Valued Client'}
                              </span>
                            </div>
                            {job.clientPhone ? (
                              <a
                                href={`tel:${job.clientPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-all active:scale-95"
                              >
                                <Phone className="h-3 w-3" />
                                <span>Call</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">No Phone</span>
                            )}
                          </div>

                          {/* Address & GPS */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-start gap-1.5 text-slate-650 dark:text-slate-300">
                              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <p className="line-clamp-2 text-xs font-medium leading-relaxed">
                                {job.address}
                              </p>
                            </div>
                            {job.locationName && (
                              <div className="pl-5 text-[10px] font-bold text-violet-500 dark:text-violet-400 truncate">
                                {job.locationName.startsWith('http') ? (
                                  <a
                                    href={job.locationName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline flex items-center gap-1"
                                  >
                                    <span>GPS Link</span>
                                    <Navigation className="h-2.5 w-2.5 inline" />
                                  </a>
                                ) : (
                                  <span>GPS / Landmark: {job.locationName}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Touch-Friendly Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                            >
                              <Navigation className="h-3.5 w-3.5 text-secondary" />
                              <span>Maps</span>
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWorkSheet(job);
                              }}
                              className="flex-[2] py-2.5 px-3 rounded-xl bg-gradient-to-r from-secondary to-blue-600 hover:from-secondary/90 hover:to-blue-600/90 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-md shadow-secondary/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              <span>
                                {isPending ? 'Review & Accept' :
                                 isStarted ? 'Continue Clean' :
                                 isCompleted ? 'View Work Sheet' :
                                 'Work Sheet'}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP VIEW (>= md): Classic Clean Table */}
                  <div className="hidden md:block overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Job Details</th>
                          <th className="px-6 py-4">Client Info</th>
                          <th className="px-6 py-4">Clean Date & Time</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Address / Location</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                        {filteredJobs.map((job) => (
                          <tr
                            key={job._id}
                            onClick={() => openWorkSheet(job)}
                            className="hover:bg-slate-55/30 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                          >
                            {/* Job Details */}
                            <td className="px-6 py-5">
                              <div className="space-y-2">
                                <span className="block font-bold text-slate-850 dark:text-white text-sm">{job.title}</span>
                                
                                <div className="flex flex-col gap-1.5 items-start">
                                  <span className="inline-block text-[9px] font-extrabold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded uppercase tracking-wider">
                                    {job.company}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <div className="space-y-1">
                                <span className="block font-semibold text-slate-750 dark:text-slate-205">{job.clientName}</span>
                                {job.clientPhone ? (
                                  <a
                                    href={`tel:${job.clientPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="block text-[10px] text-secondary hover:underline font-bold mt-0.5 inline-flex items-center space-x-0.5"
                                  >
                                    <Phone className="h-2.5 w-2.5 inline" />
                                    <span>{job.clientPhone}</span>
                                  </a>
                                ) : (
                                  <span className="block text-[10px] text-slate-400 mt-0.5">—</span>
                                )}
                              </div>
                            </td>

                            {/* Clean Date & Time */}
                            <td className="px-6 py-5 font-medium whitespace-nowrap">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-200">
                                  <Calendar className="h-3.5 w-3.5 text-secondary" />
                                  <span className="font-bold text-xs">{job.date || 'N/A'}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 text-slate-400">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{job.timeSlot || 'N/A'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Amount & Payment Status */}
                            <td className="px-6 py-5 whitespace-nowrap text-left">
                              <div className="font-extrabold text-emerald-500 dark:text-emerald-450 text-sm">
                                {job.price !== undefined ? `₹${job.price}` : '—'}
                              </div>
                              <div className="mt-1">
                                {getPaymentBadge(job.paymentStatus, job.paymentMode)}
                              </div>
                            </td>

                            {/* Address / Location */}
                            <td className="px-6 py-5 max-w-[200px]">
                              <div className="space-y-1">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block text-slate-650 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary hover:underline truncate font-medium"
                                  title="Click to view on Google Maps"
                                >
                                  📍 {job.address}
                                </a>
                                {job.locationName && (
                                  job.locationName.startsWith('http://') || job.locationName.startsWith('https://') ? (
                                    <a
                                      href={job.locationName}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="block text-[10px] font-bold text-violet-500 hover:text-violet-750 dark:hover:text-violet-400 hover:underline truncate"
                                      title="Click to open link"
                                    >
                                      GPS Link: {job.locationName}
                                    </a>
                                  ) : (
                                    <span className="block text-[10px] font-bold text-violet-500 truncate" title={job.locationName}>
                                      GPS: {job.locationName}
                                    </span>
                                  )
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-5 text-center">
                              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                job.status === 'completed' ? 'bg-success/15 text-success' :
                                job.status === 'started' ? 'bg-secondary/15 text-secondary' :
                                job.status === 'cancelled' ? 'bg-danger/15 text-danger' :
                                'bg-warning/15 text-warning'
                              }`}>
                                {job.status}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="px-6 py-5 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWorkSheet(job);
                                }}
                                className="rounded-lg bg-secondary text-white font-bold text-[10px] px-3 py-1.5 uppercase hover:bg-secondary/90 transition-colors shadow-sm"
                              >
                                Work Sheet
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Instructions Sidebar */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center space-x-2 text-secondary">
                <ClipboardList className="h-5 w-5" />
                <h3 className="font-bold text-xs uppercase tracking-wider">How to Log Cleanup Work</h3>
              </div>
              <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 leading-relaxed">
                <li>Click on any Cleanup card to open its detailed **Work Sheet**.</li>
                <li>Tap the **Before Photo** box to capture the client site condition before cleaning.</li>
                <li>When the clean is complete, tap the **After Photo** box to snap the final verified clean condition.</li>
                <li>Enter the travel mileage and cleaning notes, and click **Submit Work Sheet**.</li>
              </ul>
            </div>
          </div>

        </div>

      </main>

      {/* FULL-WIDTH INTERACTIVE CLEANUP WORK SHEET DRAWER MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-850 flex flex-col max-h-[94vh] sm:max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Job Work Sheet</span>
                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                    selectedJob.status === 'completed' ? 'bg-success/15 text-success' :
                    selectedJob.status === 'started' ? 'bg-secondary/15 text-secondary' :
                    'bg-warning/15 text-warning'
                  }`}>
                    {selectedJob.status}
                  </span>
                  {getPaymentBadge(
                    (tempPaymentMode === 'cash' || tempPaymentMode === 'upi_online' || selectedJob.paymentStatus === 'received') ? 'received' : (selectedJob.paymentStatus || 'pending'),
                    tempPaymentMode !== 'not_selected' ? tempPaymentMode : selectedJob.paymentMode
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{selectedJob.title}</h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-650 rounded-full p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCompleteWorkSheetSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs">
              
              {selectedJob.adminCompleted && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold rounded-2xl p-3.5 text-center text-[10px]">
                  ⚠️ This job has already been completed by Admin.
                </div>
              )}
              
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-955 p-4 border border-slate-150/40 dark:border-slate-850/40 space-y-2 text-left">
                {selectedJob.price !== undefined && (
                  <div className="pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collect from Client:</span>
                    <span className="font-black text-emerald-500 dark:text-emerald-450 text-sm bg-emerald-500/10 px-2 py-0.5 rounded">₹{selectedJob.price}</span>
                  </div>
                )}
                <div className="pb-1 border-b border-slate-200 dark:border-slate-800 flex flex-col pt-1.5 space-y-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">📍 Address:</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-secondary hover:underline text-xs block leading-snug"
                      title="Click to view on Google Maps"
                    >
                      {selectedJob.address}
                    </a>
                  </div>
                  {selectedJob.locationName && (
                    <div className="text-[10px] font-bold text-violet-500">
                      GPS/Landmark: {
                        selectedJob.locationName.startsWith('http://') || selectedJob.locationName.startsWith('https://') ? (
                          <a
                            href={selectedJob.locationName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary hover:underline break-all font-semibold"
                          >
                            {selectedJob.locationName}
                          </a>
                        ) : (
                          selectedJob.locationName
                        )
                      }
                    </div>
                  )}
                </div>
                <div>
                  👤 Client: <span className="font-semibold text-slate-700 dark:text-slate-250">{selectedJob.clientName}</span>{' '}
                  {selectedJob.clientPhone && (
                    <a
                      href={`tel:${selectedJob.clientPhone}`}
                      className="text-secondary hover:underline font-bold inline-flex items-center space-x-0.5 ml-1"
                    >
                      <Phone className="h-3 w-3 inline" />
                      <span>({selectedJob.clientPhone})</span>
                    </a>
                  )}
                </div>
                {selectedJob.description && <div>📝 Client Instructions: <span className="text-slate-455">{selectedJob.description}</span></div>}
                {/* Before Photo Box */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Before Cleaning Photo</span>
                {selectedJob.status === 'pending' ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3.5 text-center max-w-sm mx-auto shadow-inner">
                    <span className="block text-xs font-bold text-amber-600 dark:text-amber-400">🧹 Pending Assignment Alert</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Please Accept or Reject this cleanup task to unlock the work worksheet checklist.</p>
                    <div className="flex gap-2.5 justify-center">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.put(`/jobs/${selectedJob._id}/accept`);
                            setSelectedJob({ ...selectedJob, status: 'accepted' });
                            // Trigger local socket update event
                            window.dispatchEvent(new CustomEvent('socket-update', { detail: { type: 'JOB_ACCEPTED', jobId: selectedJob._id } }));
                            alert('Job accepted! You can now snap the arrival photo to start work.');
                          } catch (err) {
                            console.error('Accept job error:', err);
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold shadow transition-all active:scale-95"
                      >
                        ✓ Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCancelTargetJob(selectedJob);
                          setCancelActionType('reject');
                          setCancelRemarks('');
                          setCancelError('');
                          setSelectedJob(null);
                          setCancelModalOpen(true);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-extrabold shadow transition-all active:scale-95 cursor-pointer"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ) : tempBeforePhoto ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow max-w-sm mx-auto">
                    <img src={tempBeforePhoto} alt="Before snap" className="w-full h-full object-cover" />
                    {selectedJob.beforePhotoGPS?.lat && (
                      <div className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur-sm rounded-lg px-2 py-0.5 border border-slate-700/50 flex items-center">
                        <GPSAddress lat={selectedJob.beforePhotoGPS.lat} lng={selectedJob.beforePhotoGPS.lng} className="text-white/90 max-w-[110px]" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={triggerBeforeCapture}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-950 flex flex-col items-center justify-center space-y-1 max-w-sm mx-auto"
                  >
                    <Camera className="h-5 w-5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Snap Arrival Photo</span>
                  </button>
                )}
              </div>

              {/* After Photos (5 Distinct Slots) */}
              <div className="space-y-3 pt-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">After Cleaning Photos (5 Required)</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const photoUrl = tempAfterPhotos[idx];
                    const gps = tempAfterPhotosGPS[idx];
                    return (
                      <div key={idx} className="flex flex-col items-center space-y-1.5">
                        {photoUrl ? (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow bg-slate-50">
                            <img src={photoUrl} alt={`After ${idx+1}`} className="w-full h-full object-cover" />
                            {gps?.lat && (
                              <div className="absolute bottom-1 left-1 bg-slate-900/85 backdrop-blur-sm rounded px-1.5 py-0.5 border border-slate-700/50">
                                <span className="text-[7px] text-white/80">📍 Logged</span>
                              </div>
                            )}
                            {selectedJob.status === 'started' && (
                              <button
                                type="button"
                                onClick={() => triggerAfterPhotoIndexCapture(idx)}
                                className="absolute bottom-1.5 right-1.5 rounded-full bg-violet-600 text-white p-1 shadow hover:bg-violet-700 transition-colors"
                              >
                                <Camera className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!tempBeforePhoto || selectedJob.status === 'completed'}
                            onClick={() => triggerAfterPhotoIndexCapture(idx)}
                            className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-205 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-950 flex flex-col items-center justify-center space-y-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Camera className="h-4 w-4 text-slate-400" />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Photo {idx + 1}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>              </div>

              {/* Form Input fields (Visible only when in started/pending state for modifications) */}
              {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' ? (
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  

                  {/* Payment Details Section (Same as Admin) */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-left">
                    <div className="flex justify-between items-center">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Method (माध्यम) *</span>
                      {getPaymentBadge(
                        (tempPaymentMode === 'cash' || tempPaymentMode === 'upi_online') ? 'received' : 'pending',
                        tempPaymentMode
                      )}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl">
                      <label className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Select Payment Method</label>
                      <select
                        value={tempPaymentMode}
                        onChange={(e) => setTempPaymentMode(e.target.value as any)}
                        disabled={!tempBeforePhoto}
                        className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none focus:border-secondary text-slate-800 dark:text-white shadow-sm cursor-pointer disabled:opacity-40"
                      >
                        <option value="not_selected">Select Payment Method / Not Selected...</option>
                        <option value="cash">💵 Cash Payment</option>
                        <option value="upi_online">📱 UPI / Online Payment (Scan QR)</option>
                      </select>
                    </div>
                  </div>

                  {/* AUTOMATIC DISPLAY OF MAPPED QR CODE WHEN UPI / ONLINE IS SELECTED */}
                  {tempPaymentMode === 'upi_online' && (
                    <div className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl border-2 border-emerald-500/50 shadow-2xl text-center space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center space-x-1">
                          <QrCode className="h-3.5 w-3.5 inline mr-1" />
                          <span>{selectedJob.company} Payment QR Code</span>
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold rounded-full uppercase">
                          Official Corporate QR
                        </span>
                      </div>

                      {loadingQR ? (
                        <div className="p-6 text-xs text-slate-400 font-bold">Loading company payment QR code...</div>
                      ) : mappedQR && mappedQR.qrImage ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded-2xl inline-block border-4 border-emerald-500/30 shadow-inner">
                            <img
                              src={mappedQR.qrImage}
                              alt={mappedQR.name}
                              className="h-44 w-44 sm:h-56 sm:w-56 object-contain mx-auto"
                            />
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="text-slate-300 font-medium">Account Holder: <span className="font-extrabold text-white">{mappedQR.accountHolder}</span></div>
                            <div className="flex items-center justify-center space-x-2 bg-slate-800/80 py-1.5 px-3 rounded-xl max-w-xs mx-auto border border-slate-700">
                              <span className="font-mono text-emerald-400 font-extrabold text-xs">{mappedQR.upiId}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(mappedQR.upiId);
                                  alert('UPI ID copied to clipboard!');
                                }}
                                className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-600 cursor-pointer inline-flex items-center space-x-1"
                              >
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">{mappedQR.bankName}</div>
                          </div>

                          {selectedJob.price !== undefined && (
                            <div className="bg-emerald-500/20 border border-emerald-500/40 p-2.5 rounded-xl text-center shadow-inner">
                              <span className="block text-[9px] uppercase font-extrabold text-emerald-400 tracking-wider">Amount to Pay</span>
                              <span className="text-xl font-black text-white">₹{selectedJob.price}</span>
                            </div>
                          )}

                          <p className="text-[10px] text-slate-300 font-semibold leading-tight pt-1 bg-slate-800/50 p-2 rounded-xl border border-slate-800">
                            📲 Ask customer to scan this QR code with Google Pay, PhonePe, or Paytm app to pay ₹{selectedJob.price}.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 text-xs text-rose-400 font-bold">No active QR code configured for {selectedJob.company}. Contact Admin.</div>
                      )}
                    </div>
                  )}

                  {/* Remarks input */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Cleanup Notes / Remarks</label>
                    <textarea
                      rows={2}
                      value={tempNotes}
                      disabled={!tempBeforePhoto}
                      onChange={(e) => setEditNotesState(e.target.value)}
                      placeholder="Describe what you cleaned..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 p-3 outline-none focus:border-secondary resize-none disabled:opacity-40"
                    />
                  </div>

                  {/* Submission */}
                  <button
                    type="submit"
                    disabled={!tempBeforePhoto || tempAfterPhotos.some(p => !p) || submittingReport}
                    className="w-full bg-gradient-to-r from-success to-emerald-600 text-white rounded-custom py-3.5 text-xs font-bold shadow transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submittingReport ? 'Submitting Work...' : 'Submit Completed Cleanup'}
                  </button>

                  {/* Worker Option to Cancel Job with Mandatory Reason */}
                  <button
                    type="button"
                    onClick={() => {
                      setCancelTargetJob(selectedJob);
                      setCancelActionType('cancel');
                      setCancelRemarks('');
                      setCancelError('');
                      setSelectedJob(null);
                      setCancelModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>✕</span>
                    <span>Cancel Clean Booking</span>
                  </button>

                </div>
              ) : (
                // View Mode for completed/cancelled jobs
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-850 pt-4 text-left">

                  {(selectedJob.status === 'cancelled' || selectedJob.status === 'rejected') && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                        <span>🚫 Job {selectedJob.status === 'rejected' ? 'Rejected' : 'Cancelled'}</span>
                      </span>
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        Reason / Remarks: {selectedJob.cancelReason || 'No reason specified'}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450">Cleanup Notes:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 max-w-[250px] text-right">{selectedJob.workerNotes || 'No notes logged'}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450 font-bold">Payment Method:</span>
                    <div>
                      {getPaymentBadge(
                        selectedJob.paymentStatus || (selectedJob.paymentMode !== 'not_selected' ? 'received' : 'pending'),
                        selectedJob.paymentMode
                      )}
                    </div>
                  </div>



                  <div className="flex justify-between">
                    <span className="text-slate-450">Completed Time:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{new Date(selectedJob.completedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

      {/* Camera Capture Module */}
      {cameraActive && (
        <CameraCapture
          facingMode="environment"
          onCapture={handleCameraCapture}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* Cancellation / Rejection Remarks Modal */}
      {cancelModalOpen && cancelTargetJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/40 p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center font-bold text-sm">
                  ✕
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {cancelActionType === 'reject' ? 'Reject Clean Booking' : 'Cancel Clean Booking'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Please provide a reason for cancelling this booking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingCancel) {
                    setCancelModalOpen(false);
                    if (cancelTargetJob) {
                      setSelectedJob(cancelTargetJob);
                    }
                    setCancelTargetJob(null);
                    setCancelRemarks('');
                    setCancelError('');
                  }
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mandatory Remarks Textarea */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
                <span>Reason / Remarks *</span>
                <span className="text-[9px] font-bold text-rose-500 uppercase">Mandatory</span>
              </label>
              <textarea
                rows={4}
                value={cancelRemarks}
                onChange={(e) => {
                  setCancelRemarks(e.target.value);
                  if (cancelError) setCancelError('');
                }}
                placeholder="Enter reason why this booking is being cancelled (e.g. Customer cancelled, Address unreachable, Customer not answering phone, Emergency)..."
                className="w-full text-xs font-medium p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                autoFocus
              />
              {cancelError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  ⚠️ {cancelError}
                </p>
              )}
              <p className="text-[10px] text-slate-400">
                This remark will be sent to admins and permanently saved in system records.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => {
                  setCancelModalOpen(false);
                  if (cancelTargetJob) {
                    setSelectedJob(cancelTargetJob);
                  }
                  setCancelTargetJob(null);
                  setCancelRemarks('');
                  setCancelError('');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel || !cancelRemarks.trim()}
                onClick={handleConfirmWorkerCancel}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{isSubmittingCancel ? 'Submitting...' : 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // Helper helper to set edit notes without declaring state if we want to save space
  function setEditNotesState(val: string) {
    setTempNotes(val);
  }
};

export default WorkerJobs;

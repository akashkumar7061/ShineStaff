import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import MapView from '../components/MapView';
import GPSAddress from '../components/GPSAddress';
import {
  Plus,
  Briefcase,
  User,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Trash2,
  X,
  Compass,
  CheckCircle,
  FileCheck2,
  Clock,
  DollarSign,
  Search,
  Camera,
  Download,
  Edit,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  MessageSquare,
  Sparkles
} from 'lucide-react';

const formatTimeTo12Hour = (timeStr: string) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  const paddedHour = String(hour).padStart(2, '0');
  return `${paddedHour}:${min} ${ampm}`;
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface AdminJobsProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminJobs: React.FC<AdminJobsProps> = ({ companyFilter }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date and grid navigation states (Matching user screenshots)
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  
  // Drawer state for job details (right-hand sidebar drawer)
  const [selectedJobForDrawer, setSelectedJobForDrawer] = useState<any>(null);

  // Send schedules modal popup
  const [sendSchedulesOpen, setSendSchedulesOpen] = useState(false);

  // Form modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedJobPhotos, setSelectedJobPhotos] = useState<any>(null);

  // Form inputs state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState<'SofaShine' | 'CleanCruisers'>('SofaShine');
  const [workerId, setWorkerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('08:00 AM - 02:00 PM');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('14:00');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculationReason, setCalculationReason] = useState('');
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvingGPS, setResolvingGPS] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const pickerMapRef = useRef<any>(null);

  // Load Leaflet dynamically for maps
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  const fetchJobsAndWorkers = async () => {
    setLoading(true);
    try {
      const [jobsRes, workersRes] = await Promise.all([
        api.get(`/jobs?company=${companyFilter}`),
        api.get(`/workers?company=${companyFilter}`)
      ]);
      setJobs(jobsRes.data);
      setWorkers(workersRes.data);
    } catch (err) {
      console.error('Failed to load jobs/workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndWorkers();
    
    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      if (['JOB_COMPLETED', 'JOB_STARTED', 'JOB_CREATED', 'JOB_CANCELLED', 'JOB_DELETED'].includes(type)) {
        fetchJobsAndWorkers();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [companyFilter]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedJobForDrawer(null);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedJobForDrawer(null);
  };

  const handleGoToToday = () => {
    setSelectedDate(getTodayString());
    setSelectedJobForDrawer(null);
  };

  const getFormattedDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return dateObj.toLocaleDateString('en-IN', options);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        company,
        workerId,
        clientName,
        clientPhone,
        address,
        locationName,
        price: Number(price) || 0,
        date,
        timeSlot: `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`,
        location: latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : undefined,
        fuelKmsTravelled: calculatedDistance || 0
      };

      if (isEditMode && editingJobId) {
        await api.put(`/jobs/${editingJobId}`, payload);
        alert('Cleanup job updated successfully!');
      } else {
        await api.post('/jobs', payload);
        alert('Cleanup job created and worker notified!');
      }

      setCreateModalOpen(false);
      resetForm();
      fetchJobsAndWorkers();
      setSelectedJobForDrawer(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save job');
    }
  };

  const handleOpenEditModal = (job: any) => {
    setIsEditMode(true);
    setEditingJobId(job._id);
    setTitle(job.title || '');
    setDescription(job.description || '');
    setCompany(job.company || 'SofaShine');
    setWorkerId(job.workerId?._id || job.workerId || '');
    setClientName(job.clientName || '');
    setClientPhone(job.clientPhone || '');
    setAddress(job.address || '');
    setLocationName(job.locationName || '');
    setPrice(job.price ? String(job.price) : '');
    setDate(job.date || '');
    
    if (job.timeSlot) {
      const parts = job.timeSlot.split(' - ');
      if (parts.length === 2) {
        const convertTo24Hour = (time12: string) => {
          const [time, modifier] = time12.split(' ');
          let [hours, minutes] = time.split(':');
          if (hours === '12') hours = '00';
          if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        };
        try {
          setStartTime(convertTo24Hour(parts[0]));
          setEndTime(convertTo24Hour(parts[1]));
        } catch (e) {
          // fallback
        }
      }
    }
    
    if (job.location) {
      setLatitude(job.location.lat ? String(job.location.lat) : '');
      setLongitude(job.location.lng ? String(job.location.lng) : '');
    } else {
      setLatitude('');
      setLongitude('');
    }
    
    setCalculatedDistance(job.fuelKmsTravelled || null);
    setCreateModalOpen(true);
  };

  const handleUpdateStatus = async (jobId: string, status: string) => {
    try {
      const res = await api.put(`/jobs/${jobId}`, { status });
      // Update drawer visual status
      if (selectedJobForDrawer && selectedJobForDrawer._id === jobId) {
        setSelectedJobForDrawer(res.data);
      }
      fetchJobsAndWorkers();
    } catch (err) {
      alert('Failed to update job status');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCompany('SofaShine');
    setWorkerId('');
    setClientName('');
    setClientPhone('');
    setAddress('');
    setLocationName('');
    setPrice('');
    setDate(selectedDate);
    setTimeSlot('08:00 AM - 02:00 PM');
    setStartTime('08:00');
    setEndTime('14:00');
    setLatitude('');
    setLongitude('');
    setCalculatedDistance(null);
    setCalculationReason('');
    setIsEditMode(false);
    setEditingJobId(null);
  };

  const handleOpenPhotoComparison = (job: any) => {
    setSelectedJobPhotos(job);
    setPhotoModalOpen(true);
  };

  // Grid calculation: filter jobs strictly matching the selected date
  const dayJobs = jobs.filter((j) => j.date === selectedDate);
  const totalBookings = dayJobs.length;
  const confirmedBookings = dayJobs.filter((j) => ['completed', 'started', 'pending'].includes(j.status)).length;

  // Gather unique time slots from current day's jobs or fall back to default schedule blocks
  const timeSlots = Array.from(
    new Set([
      '08:00 AM - 02:00 PM',
      '11:00 AM - 01:00 PM',
      ...dayJobs.map((j) => j.timeSlot).filter(Boolean)
    ])
  ).sort();

  // Helper to trigger Whatsapp link pre-filled
  const getWhatsAppWorkerScheduleUrl = (worker: any) => {
    const workerJobs = dayJobs.filter(j => j.workerId?._id === worker._id);
    let text = `Hello ${worker.name},\nHere is your cleaning job schedule for today (${selectedDate}):\n\n`;
    if (workerJobs.length === 0) {
      text += `No cleanings assigned today. Relax & stay active!`;
    } else {
      workerJobs.forEach((j, index) => {
        text += `${index + 1}. ${j.title}\n`;
        text += `⏰ Slot: ${j.timeSlot}\n`;
        text += `👤 Client: ${j.clientName} (${j.clientPhone})\n`;
        text += `📍 Address: ${j.address}\n`;
        text += `💵 Amount: ₹${j.price}\n\n`;
      });
    }
    return `https://wa.me/91${worker.phone || ''}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-4 px-1.5 md:px-2.5 text-left h-[calc(100vh-140px)] flex flex-col overflow-hidden pb-2 w-full max-w-full">
      
      {/* Page Title & View Site Header */}
      <div className="flex justify-between items-center py-2 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Schedule</h1>
        <div className="flex items-center space-x-3 text-xs font-bold text-slate-500">
          <a href="/" className="text-[#2563eb] hover:underline">View Site</a>
          <div className="h-7 w-7 rounded-full bg-[#dbeafe] text-[#1e40af] flex items-center justify-center font-bold">A</div>
        </div>
      </div>

      {/* 1. Header Date Selection Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        
        {/* Date Navigation Group */}
        <div className="flex items-center space-x-2.5">
          <button onClick={handlePrevDay} className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-slate-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 px-1.5 min-w-[160px] text-center">
            {getFormattedDateString(selectedDate)}
          </span>
          <button onClick={handleNextDay} className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleGoToToday} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
            Today
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedJobForDrawer(null);
            }}
            className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 outline-none focus:border-blue-500 shadow-sm cursor-pointer dark:color-scheme-dark"
          />

          <button onClick={fetchJobsAndWorkers} className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-slate-600" title="Refresh Calendar Grid">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setSendSchedulesOpen(true)}
            className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-[#22c55e] hover:bg-emerald-50 text-[#22c55e] font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-[#22c55e]" />
            <span>Send All Schedules ↗</span>
          </button>

          <button
            onClick={() => { resetForm(); setCreateModalOpen(true); }}
            className="flex items-center space-x-1.5 bg-[#2563eb] hover:bg-blue-750 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ New Booking</span>
          </button>
        </div>
      </div>

      {/* 2. Count Badges */}
      <div className="flex space-x-2 text-[11px] font-bold mt-1.5 shrink-0">
        <span className="bg-[#e2e8f0] text-[#475569] px-3.5 py-1 rounded-full">
          {totalBookings} bookings
        </span>
        <span className="bg-[#dbeafe] text-[#1e40af] px-3.5 py-1 rounded-full">
          {confirmedBookings} confirmed
        </span>
      </div>

      {/* 3. Main Split Panel Container: Grid + Drawer Drawer */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 overflow-hidden min-h-0 w-full">
        
        {/* Left Side: Dynamic Horizontal Scrollable Grid */}
        <div className={`h-full overflow-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${
          selectedJobForDrawer ? 'xl:col-span-3' : 'xl:col-span-4'
        }`}>
          <table className="w-full text-left text-xs table-fixed min-w-0 border-collapse">
            <thead className="text-[10px] font-bold text-white uppercase tracking-widest sticky top-0 z-10">
              <tr className="bg-[#1e293b]">
                <th className="px-3 py-3 w-[100px] bg-[#1e293b] text-white">
                  <div className="flex items-center space-x-1 justify-center">
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                    <span>Time Slot</span>
                  </div>
                </th>
                {workers.map((w: any) => (
                  <th key={w._id} className="px-3 py-3 border-l border-slate-700 bg-[#1e293b] text-white text-left">
                    <div className="space-y-1">
                      <span className="block text-white font-bold text-xs normal-case">{w.name}</span>
                      <span className="block text-[10px] text-slate-350 font-normal font-sans leading-none">{w.phone}</span>
                      <div className="flex items-center space-x-1.5 pt-2 text-[9px] font-bold uppercase tracking-wider">
                        <button
                          onClick={() => window.open(getWhatsAppWorkerScheduleUrl(w), '_blank')}
                          className="bg-[#22c55e] text-white px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center space-x-1 hover:bg-[#16a34a] transition-colors cursor-pointer"
                        >
                          <Calendar className="h-2.5 w-2.5" />
                          <span>Schedule</span>
                        </button>
                        <button
                          onClick={() => window.open(`https://wa.me/91${w.phone || ''}`, '_blank')}
                          className="bg-[#2563eb] text-white px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center space-x-1 hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-2.5 w-2.5" />
                          <span>Ping</span>
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 border-l border-slate-700 bg-[#1e293b] text-slate-300 italic text-left">
                  <span>Unassigned</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {timeSlots.map((slot) => (
                <tr key={slot} className="hover:bg-slate-55/20 dark:hover:bg-slate-900/10">
                  
                  {/* Row Time Slot Cell */}
                  <td className="px-3 py-4 font-bold text-slate-800 text-[11px] leading-snug text-center">
                    <div className="flex flex-col text-slate-700 font-bold gap-0.5">
                      {slot.includes(' - ') ? (
                        <>
                          <span>{slot.split(' - ')[0]}</span>
                          <span>{slot.split(' - ')[1]}</span>
                        </>
                      ) : (
                        <span>{slot}</span>
                      )}
                    </div>
                  </td>

                  {/* Worker Cells */}
                  {workers.map((w: any) => {
                    const cellJobs = dayJobs.filter(j => j.workerId?._id === w._id && j.timeSlot === slot);
                    return (
                      <td key={w._id} className="px-2 py-2.5 border-l border-slate-200 dark:border-slate-800 align-top">
                        {cellJobs.length > 0 ? (
                          <div className="space-y-2">
                            {cellJobs.map((j) => (
                              <div
                                key={j._id}
                                onClick={() => setSelectedJobForDrawer(j)}
                                className={`relative text-left p-2.5 rounded-lg border cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group ${
                                  selectedJobForDrawer?._id === j._id
                                    ? 'bg-[#dbeafe] border-[#bfdbfe] shadow-sm'
                                    : 'bg-[#eff6ff] hover:bg-[#dbeafe] border-[#bfdbfe] dark:bg-slate-800/20 dark:border-slate-700'
                                }`}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditModal(j); }}
                                  className="absolute top-1.5 right-1.5 text-slate-405 hover:text-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white dark:bg-slate-900 rounded shadow-sm"
                                  title="Edit details"
                                >
                                  <Edit className="h-2.5 w-2.5" />
                                </button>

                                <div className="space-y-1 pr-1.5">
                                  <span className="block font-bold text-[#1e3a8a] dark:text-blue-350 text-[11.5px] leading-tight truncate">{j.clientName || 'N/A'}</span>
                                  <span className="block text-[10.5px] text-[#334155] dark:text-slate-300 leading-snug font-normal">{j.title}</span>
                                  
                                  <div className="flex items-center justify-between pt-1.5 border-t border-[#bfdbfe]/40 text-[9.5px] font-bold mt-1.5">
                                    <a
                                      href={`tel:${j.clientPhone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center space-x-0.5 text-[#2563eb] hover:underline"
                                    >
                                      <span>📞 Call</span>
                                    </a>
                                    <span className="text-[#1e3a8a] dark:text-blue-200 font-extrabold">₹{j.price}</span>
                                  </div>
                                  {j.workerId?.phone && (
                                    <div className="pt-0.5">
                                      <a
                                        href={`tel:${j.workerId.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center space-x-0.5 text-[#2563eb] hover:underline text-[9.5px]"
                                      >
                                        <span>📞 Call</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              resetForm();
                              setWorkerId(w._id);
                              setTimeSlot(slot);
                              const parts = slot.split(' - ');
                              if (parts.length === 2) {
                                const convertTo24Hour = (time12: string) => {
                                  const [time, modifier] = time12.split(' ');
                                  let [hours, minutes] = time.split(':');
                                  if (hours === '12') hours = '00';
                                  if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
                                  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
                                };
                                setStartTime(convertTo24Hour(parts[0]));
                                setEndTime(convertTo24Hour(parts[1]));
                              }
                              setCreateModalOpen(true);
                            }}
                            className="h-14 border border-dashed border-[#cbd5e1] hover:border-blue-500 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-[#94a3b8] hover:text-blue-500 cursor-pointer transition-colors text-base"
                          >
                            +
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Unassigned Cell */}
                  <td className="px-2 py-2.5 border-l border-slate-200 dark:border-slate-800 align-top">
                    {dayJobs.filter(j => !j.workerId && j.timeSlot === slot).length > 0 ? (
                      <div className="space-y-2">
                        {dayJobs.filter(j => !j.workerId && j.timeSlot === slot).map((j) => (
                          <div
                            key={j._id}
                            onClick={() => setSelectedJobForDrawer(j)}
                            className={`relative text-left p-2.5 rounded-lg border cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group ${
                              selectedJobForDrawer?._id === j._id
                                ? 'bg-[#dbeafe] border-[#bfdbfe] shadow-sm'
                                : 'bg-[#eff6ff] hover:bg-[#dbeafe] border-[#bfdbfe] dark:bg-slate-800/20 dark:border-slate-700'
                            }`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(j); }}
                              className="absolute top-1.5 right-1.5 text-slate-405 hover:text-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white dark:bg-slate-900 rounded shadow-sm"
                            >
                              <Edit className="h-2.5 w-2.5" />
                            </button>

                            <div className="space-y-1 pr-1.5">
                              <span className="block font-bold text-[#1e3a8a] dark:text-blue-350 text-[11.5px] leading-tight truncate">{j.clientName || 'N/A'}</span>
                              <span className="block text-[10.5px] text-[#334155] dark:text-slate-350 leading-snug font-normal">{j.title}</span>
                              
                              <div className="flex items-center justify-between pt-1.5 border-t border-[#bfdbfe]/40 text-[9.5px] font-bold mt-1.5">
                                <a
                                  href={`tel:${j.clientPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 text-[#2563eb] hover:underline"
                                >
                                  <span>📞 Call</span>
                                </a>
                                <span className="text-[#1e3a8a] dark:text-blue-200 font-extrabold">₹{j.price}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          resetForm();
                          setWorkerId('');
                          setTimeSlot(slot);
                          setCreateModalOpen(true);
                        }}
                        className="h-14 border border-dashed border-[#cbd5e1] hover:border-blue-500 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-[#94a3b8] hover:text-blue-500 cursor-pointer transition-colors text-base"
                      >
                        +
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Side: Interactive Slide-in Details/Status Drawer */}
        {selectedJobForDrawer && (
          <div className="xl:col-span-1 h-full overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 flex flex-col justify-between text-xs animate-slide-in select-none">
            
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="block font-black tracking-tight text-slate-850 dark:text-white text-sm">
                    {selectedJobForDrawer._id?.slice(-12).toUpperCase() || 'CLEANUP DETAILS'}
                  </span>
                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 mt-1.5 rounded-full ${
                    selectedJobForDrawer.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {selectedJobForDrawer.status || 'confirmed'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedJobForDrawer(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-black p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Quick Actions & Contact Details */}
              <div className="space-y-3 font-bold">
                <a
                  href={`tel:${selectedJobForDrawer.clientPhone}`}
                  className="flex items-center justify-center space-x-1.5 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 font-extrabold py-2.5 rounded-xl border border-blue-500/20 cursor-pointer w-full text-center"
                >
                  <span>📞 Call</span>
                </a>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-655 dark:text-slate-350">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{selectedJobForDrawer.clientName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{selectedJobForDrawer.clientPhone || 'N/A'}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{selectedJobForDrawer.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Service & Price */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-left">
                <h4 className="font-black text-slate-850 dark:text-white text-xs tracking-tight leading-snug">
                  {selectedJobForDrawer.title}
                </h4>
                <div className="text-base font-black text-secondary">
                  ₹{selectedJobForDrawer.price || 0}
                </div>
                <div className="flex items-center space-x-1 text-slate-400 font-bold mt-1 text-[10px]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{selectedJobForDrawer.timeSlot}</span>
                </div>
              </div>

              {/* Edit Button link */}
              <button
                onClick={() => handleOpenEditModal(selectedJobForDrawer)}
                className="flex items-center justify-between w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center space-x-2 font-black text-slate-700 dark:text-slate-205">
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Details</span>
                </div>
                <span className="text-[8px] text-slate-400 font-normal">Edit booking details</span>
              </button>

              {/* Job timing box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/30 space-y-2.5">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Job Timing</span>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Scheduled start</span>
                    <span className="text-[10px] font-extrabold text-slate-750 dark:text-slate-200">
                      {selectedJobForDrawer.timeSlot ? selectedJobForDrawer.timeSlot.split(' - ')[0] : '08:00 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Scheduled end</span>
                    <span className="text-[10px] font-extrabold text-slate-750 dark:text-slate-200">
                      {selectedJobForDrawer.timeSlot ? selectedJobForDrawer.timeSlot.split(' - ')[1] : '02:00 PM'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateStatus(selectedJobForDrawer._id, selectedJobForDrawer.status === 'started' ? 'completed' : 'started')}
                  className="w-full bg-violet-600 hover:bg-violet-750 text-white font-extrabold py-2.5 rounded-xl shadow cursor-pointer text-center text-xs flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{selectedJobForDrawer.status === 'started' ? 'Complete Cleanup' : 'Worker Started'}</span>
                </button>
              </div>

              {/* Assigned Worker Contact */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/10 space-y-2.5 text-left">
                <span className="block text-[8px] font-black text-indigo-550 dark:text-indigo-400 uppercase tracking-widest leading-none">Assigned Worker</span>
                {selectedJobForDrawer.workerId ? (
                  <div className="space-y-2.5 font-bold text-slate-700 dark:text-slate-200">
                    <div>
                      <span className="block font-black text-slate-805 dark:text-white leading-tight">{selectedJobForDrawer.workerId.name}</span>
                      <span className="block text-[9.5px] text-slate-400 mt-0.5 leading-none">{selectedJobForDrawer.workerId.phone}</span>
                    </div>

                    <button
                      onClick={() => window.open(`https://wa.me/91${selectedJobForDrawer.workerId.phone || ''}`, '_blank')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-xl text-center flex items-center justify-center space-x-1 text-xs cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Message</span>
                    </button>

                    <button
                      onClick={() => {
                        const text = `Hello ${selectedJobForDrawer.workerId.name},\nNew cleaning job details:\nClient: ${selectedJobForDrawer.clientName}\nPhone: ${selectedJobForDrawer.clientPhone}\nAddress: ${selectedJobForDrawer.address}\nSlot: ${selectedJobForDrawer.timeSlot}\nPrice: ₹${selectedJobForDrawer.price}`;
                        window.open(`https://wa.me/91${selectedJobForDrawer.workerId.phone || ''}?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-xl text-center flex items-center justify-center space-x-1.5 text-xs shadow-sm cursor-pointer"
                    >
                      <span>Open WhatsApp with Job Details ↗</span>
                    </button>
                  </div>
                ) : (
                  <span className="block text-slate-450 italic font-medium py-1">Unassigned</span>
                )}
              </div>

              {/* Update Status Buttons Grid */}
              <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Update Status</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  {[
                    { id: 'pending', label: 'confirmed', bg: 'bg-indigo-50 border-indigo-400 text-indigo-650' },
                    { id: 'started', label: 'in progress', bg: 'bg-amber-50 border-amber-400 text-amber-650' },
                    { id: 'completed', label: 'completed', bg: 'bg-emerald-50 border-emerald-400 text-emerald-650' },
                    { id: 'cancelled', label: 'cancelled', bg: 'bg-rose-50 border-rose-400 text-rose-650' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleUpdateStatus(selectedJobForDrawer._id, s.id)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-colors ${
                        selectedJobForDrawer.status === s.id
                          ? s.bg
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  if (window.confirm('Delete this clean booking permanently?')) {
                    api.delete(`/jobs/${selectedJobForDrawer._id}`).then(() => {
                      alert('Job deleted successfully');
                      setSelectedJobForDrawer(null);
                      fetchJobsAndWorkers();
                    });
                  }
                }}
                className="w-full text-danger border border-danger/25 hover:bg-danger/5 font-black py-2 rounded-xl text-center cursor-pointer"
              >
                Delete Job
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 4. Center Dialog: Send Schedules Modal (Matching Screenshot) */}
      {sendSchedulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs text-left animate-scale-up">
            
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white leading-none">Send Schedules</h3>
                <span className="block text-[10px] text-slate-450 mt-1">Open WhatsApp for each worker</span>
              </div>
              <button
                onClick={() => setSendSchedulesOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-black p-1"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-4 max-h-[300px] overflow-y-auto">
              {workers.map((w: any) => {
                const count = dayJobs.filter(j => j.workerId?._id === w._id).length;
                return (
                  <div key={w._id} className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200/40">
                    <div>
                      <span className="block font-black text-slate-800 dark:text-white leading-tight">{w.name}</span>
                      <span className="block text-[9.5px] text-slate-400 mt-0.5 leading-none">{count} job{count !== 1 ? 's' : ''} today</span>
                    </div>
                    <button
                      onClick={() => window.open(getWhatsAppWorkerScheduleUrl(w), '_blank')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-2 rounded-xl text-center flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Open WhatsApp ↗</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <span className="block text-[9px] text-slate-400 text-center font-normal font-sans border-t border-slate-100 dark:border-slate-800 pt-3">
              Each button opens WhatsApp with that worker's schedule pre-filled — just tap Send.
            </span>
          </div>
        </div>
      )}

      {/* 5. Existing Modal forms and images comparators completely unchanged to preserve all features */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-850 overflow-hidden text-xs text-slate-655 dark:text-slate-350">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-sm">
                {isEditMode ? 'Modify Cleanup Job Settings' : 'Assign New Cleanup Schedule'}
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-650 text-xs font-black">✕</button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-bold text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Job Title</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sofa Foam Scrubbing" className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Company Branch</label>
                  <select value={company} onChange={(e) => setCompany(e.target.value as any)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary">
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Assign Crew Worker</label>
                  <select required value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary">
                    <option value="">-- Choose Worker --</option>
                    {workers.map((w) => (
                      <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-405 mb-1.5">Price (₹)</label>
                  <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter job price" className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Client Name</label>
                  <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-405 mb-1.5">Client Phone</label>
                  <input type="text" required value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary dark:color-scheme-dark" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Start Time</label>
                    <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">End Time</label>
                    <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Service Description Details</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter details..." className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 h-16 outline-none focus:border-secondary resize-none" />
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1">Geocoding & GPS Location Data</span>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-450 mb-1">Clean Site Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter full physical address"
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-450 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 28.6139"
                      className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-455 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 77.2090"
                      className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-455 mb-1">GPS Location Link / Landmark</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Landmark or Google Map URL link"
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-secondary hover:bg-secondary-dark text-white font-extrabold p-3 rounded-xl transition-all cursor-pointer shadow-md">
                {isEditMode ? 'Apply Modified Settings' : 'Create & Assign Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Comparison photos modal */}
      {photoModalOpen && selectedJobPhotos && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase">Photos Comparison Compliance Audit</h4>
                <p className="text-[10px] text-slate-400">Clean: {selectedJobPhotos.title}</p>
              </div>
              <button onClick={() => setPhotoModalOpen(false)} className="text-slate-400 hover:text-slate-650 font-black">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 overflow-y-auto">
              {/* Before snapshot */}
              <div className="space-y-3 flex flex-col items-center">
                <span className="bg-amber-500/10 text-amber-500 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">Before Cleanup</span>
                {selectedJobPhotos.beforePhoto ? (
                  <img src={selectedJobPhotos.beforePhoto} alt="Before" className="rounded-xl object-contain max-h-80 border shadow-md w-full" />
                ) : (
                  <div className="h-64 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-bold w-full bg-slate-50 dark:bg-slate-950/20">No Before Photo Uploaded</div>
                )}
              </div>
              {/* After snapshot */}
              <div className="space-y-3 flex flex-col items-center">
                <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">After Cleanup Completed</span>
                {selectedJobPhotos.afterPhoto ? (
                  <img src={selectedJobPhotos.afterPhoto} alt="After" className="rounded-xl object-contain max-h-80 border shadow-md w-full" />
                ) : (
                  <div className="h-64 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-bold w-full bg-slate-50 dark:bg-slate-950/20">No After Photo Uploaded</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminJobs;

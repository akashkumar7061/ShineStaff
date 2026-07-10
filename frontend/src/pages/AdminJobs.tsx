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
  Edit
} from 'lucide-react';

interface AdminJobsProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const formatTimeTo12Hour = (timeStr: string) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${min} ${ampm}`;
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LiveActiveJobBanner: React.FC<{ job: any }> = ({ job }) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!job.startedAt) return;
    const startTime = new Date(job.startedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setSecondsElapsed(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [job.startedAt]);

  const formatDuration = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimeStr = job.startedAt 
    ? new Date(job.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'N/A';

  return (
    <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/15 backdrop-blur-md p-5 space-y-4 shadow-lg border-dashed relative overflow-hidden text-slate-800 dark:text-white">
      <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-500 text-white animate-bounce shadow-md text-base">
            🟢
          </div>
          <div className="text-left">
            <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block animate-pulse">
              ⚡ LIVE JOB IN PROGRESS
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-white leading-tight">
              {job.title} ({job.company})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-md flex flex-col items-center border border-slate-800">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Live Elapsed Timer</span>
          <span className="text-xl font-mono font-black text-emerald-400 tracking-widest mt-0.5 animate-pulse-slow">
            ⏱️ {formatDuration(secondsElapsed)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-left text-xs text-slate-650 dark:text-slate-350">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 flex items-center justify-center font-bold text-slate-700 dark:text-white uppercase overflow-hidden shadow-inner shrink-0">
            {job.workerId?.avatar ? (
              <img src={job.workerId.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{job.workerId?.name?.slice(0, 2) || 'WK'}</span>
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Assigned Worker</span>
            <span className="font-bold text-slate-800 dark:text-slate-150 truncate block">{job.workerId?.name || 'Unassigned'}</span>
          </div>
        </div>

        <div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Client Customer</span>
          <span className="font-bold text-slate-800 dark:text-slate-150 block">{job.clientName || 'N/A'}</span>
        </div>

        <div className="md:col-span-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Service Address</span>
          <span className="font-bold text-slate-800 dark:text-slate-150 truncate block leading-snug" title={job.address}>
            📍 {job.address || 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
        <span className="text-slate-450 font-medium">Commence Time Slot: <strong className="text-slate-700 dark:text-slate-200">{job.timeSlot || 'N/A'}</strong></span>
        <span className="text-emerald-500 font-extrabold">Start Time: {startTimeStr}</span>
      </div>
    </div>
  );
};

const AdminJobs: React.FC<AdminJobsProps> = ({ companyFilter }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'started' | 'completed' | 'cancelled'>('all');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [searchWorkerName, setSearchWorkerName] = useState('');

  // Modals visibility
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedJobPhotos, setSelectedJobPhotos] = useState<any>(null);

  // Form states
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
  const [timeSlot, setTimeSlot] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  // Dynamic Leaflet Loader for AdminJobs
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
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  const handleResolveGPS = async () => {
    const query = locationName || address;
    if (!query) {
      return;
    }

    setResolvingGPS(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLatitude(Number(lat).toFixed(6));
        setLongitude(Number(lon).toFixed(6));
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    } finally {
      setResolvingGPS(false);
    }
  };

  // Initialize Picker Map in modal
  useEffect(() => {
    if (!createModalOpen || !leafletLoaded) {
      if (pickerMapRef.current) {
        pickerMapRef.current.remove();
        pickerMapRef.current = null;
        startMarkerRef.current = null;
        endMarkerRef.current = null;
        polylineRef.current = null;
      }
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    const timer = setTimeout(() => {
      const container = document.getElementById('picker-map');
      if (!container || pickerMapRef.current) return;

      const defaultCenter = [19.0760, 72.8777]; // Mumbai
      pickerMapRef.current = L.map(container, {
        zoomControl: true
      }).setView(defaultCenter, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(pickerMapRef.current);

      pickerMapRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [createModalOpen, leafletLoaded]);

  // Update Map overlays when coordinates change
  useEffect(() => {
    if (!pickerMapRef.current || !leafletLoaded) return;
    const L = (window as any).L;
    if (!L) return;

    // 1. Update Start Marker
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }

    if (startCoords && startCoords.lat && startCoords.lng) {
      const workerSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563EB" width="28px" height="28px">
          <circle cx="12" cy="8" r="4" />
          <path d="M12 14c-6.1 0-11 4.9-11 11h22c0-6.1-4.9-11-11-11z"/>
        </svg>
      `;
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: workerSvg,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      startMarkerRef.current = L.marker([startCoords.lat, startCoords.lng], { icon: startIcon })
        .bindPopup("Worker Starting Point")
        .addTo(pickerMapRef.current);
    }

    // 2. Update End Marker
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }

    if (latitude && longitude) {
      const latVal = Number(latitude);
      const lngVal = Number(longitude);
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        const jobSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" width="32px" height="32px">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `;
        const endIcon = L.divIcon({
          className: 'custom-end-marker',
          html: jobSvg,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });

        endMarkerRef.current = L.marker([latVal, lngVal], { icon: endIcon })
          .bindPopup("New Cleanup Site")
          .addTo(pickerMapRef.current);
      }
    }

    // 3. Draw Polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (startCoords && startCoords.lat && startCoords.lng && latitude && longitude) {
      const latVal = Number(latitude);
      const lngVal = Number(longitude);
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        polylineRef.current = L.polyline(
          [[startCoords.lat, startCoords.lng], [latVal, lngVal]],
          { color: '#8B5CF6', weight: 4, dashArray: '5, 10' }
        ).addTo(pickerMapRef.current);

        const bounds = L.latLngBounds([[startCoords.lat, startCoords.lng], [latVal, lngVal]]);
        pickerMapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    } else if (startCoords && startCoords.lat && startCoords.lng) {
      pickerMapRef.current.setView([startCoords.lat, startCoords.lng], 12);
    } else if (latitude && longitude) {
      const latVal = Number(latitude);
      const lngVal = Number(longitude);
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        pickerMapRef.current.setView([latVal, lngVal], 12);
      }
    }
  }, [startCoords, latitude, longitude, leafletLoaded]);

  useEffect(() => {
    if (startTime && endTime) {
      setTimeSlot(`${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`);
    } else if (startTime) {
      setTimeSlot(formatTimeTo12Hour(startTime));
    }
  }, [startTime, endTime]);

  useEffect(() => {
    const calculateDistance = async () => {
      if (!workerId || !latitude || !longitude || !date) {
        setCalculatedDistance(null);
        setCalculationReason('');
        setStartCoords(null);
        return;
      }

      setCalculatingDistance(true);
      try {
        // Fetch worker details (contains current location and jobs)
        const res = await api.get(`/workers/${workerId}`);
        const workerData = res.data.worker;
        const workerJobs = res.data.jobs || [];

        // Find worker's last worked job location for the selected date
        // workerJobs are sorted by createdAt: -1, so let's find the latest completed/assigned job today
        const prevJob = workerJobs.find((j: any) => {
          return j.date === date && j.location && j.location.lat && j.location.lng;
        });

        let startLat = 0;
        let startLng = 0;
        let reason = '';

        if (prevJob) {
          startLat = prevJob.location.lat;
          startLng = prevJob.location.lng;
          reason = `Calculated from worker's previous job today: "${prevJob.title}" at ${prevJob.locationName || 'site'}`;
        } else if (workerData.currentLocation && workerData.currentLocation.lat && workerData.currentLocation.lng) {
          startLat = workerData.currentLocation.lat;
          startLng = workerData.currentLocation.lng;
          reason = `Calculated from worker's live GPS location`;
        }

        if (startLat && startLng) {
          setStartCoords({ lat: startLat, lng: startLng });
          const lat1 = startLat;
          const lon1 = startLng;
          const lat2 = Number(latitude);
          const lon2 = Number(longitude);

          const R = 6371; // km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          const d = R * c; // distance in km
          
          setCalculatedDistance(Number(d.toFixed(2)));
          setCalculationReason(reason);
        } else {
          setStartCoords(null);
          setCalculatedDistance(null);
          setCalculationReason('No previous job today or live GPS coordinates found for this worker.');
        }
      } catch (err) {
        console.error('Failed to calculate distance:', err);
        setStartCoords(null);
        setCalculatedDistance(null);
        setCalculationReason('Error fetching worker location data.');
      } finally {
        setCalculatingDistance(false);
      }
    };

    calculateDistance();
  }, [workerId, latitude, longitude, date]);

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
      if (
        type === 'JOB_COMPLETED' ||
        type === 'JOB_STARTED' ||
        type === 'JOB_CREATED' ||
        type === 'JOB_CANCELLED' ||
        type === 'JOB_DELETED'
      ) {
        fetchJobsAndWorkers();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [companyFilter]);

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
        timeSlot,
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
    setTimeSlot(job.timeSlot || '');
    
    if (job.timeSlot) {
      const parts = job.timeSlot.split(' - ');
      if (parts.length === 2) {
        const convertTo24Hour = (time12: string) => {
          const [time, modifier] = time12.split(' ');
          let [hours, minutes] = time.split(':');
          if (hours === '12') {
            hours = '00';
          }
          if (modifier === 'PM') {
            hours = String(parseInt(hours, 10) + 12);
          }
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        };
        try {
          setStartTime(convertTo24Hour(parts[0]));
          setEndTime(convertTo24Hour(parts[1]));
        } catch (e) {
          // ignore parsing error
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

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      alert('Job deleted successfully');
      fetchJobsAndWorkers();
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const handleCancelJob = async (id: string) => {
    const reason = prompt('Please enter the reason for cancelling this job:');
    if (reason === null) return; // User pressed Cancel
    if (!reason.trim()) {
      alert('Cancellation reason is required.');
      return;
    }
    try {
      await api.put(`/jobs/${id}/cancel`, { reason: reason.trim() });
      alert('Job cancelled successfully');
      fetchJobsAndWorkers();
    } catch (err) {
      alert('Failed to cancel job');
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
    setDate(getTodayString());
    setTimeSlot('');
    setStartTime('');
    setEndTime('');
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

  const filteredJobs = jobs.filter((job) => {
    // 1. Status Filter
    if (activeTab !== 'all' && job.status !== activeTab) {
      return false;
    }

    // 2. Date Range Filter
    if (startDate && job.date && job.date < startDate) {
      return false;
    }
    if (endDate && job.date && job.date > endDate) {
      return false;
    }

    // 3. Worker Name Search
    if (searchWorkerName) {
      const workerName = job.workerId?.name || 'Unassigned';
      if (!workerName.toLowerCase().includes(searchWorkerName.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Job Scheduling Board</h2>
          <p className="text-xs text-slate-400 mt-0.5">Assign tasks, track status timelines, and review photo compliance logs</p>
        </div>

        <button
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="btn-blue-gradient flex items-center space-x-2 rounded-custom px-4 py-3.5 text-xs font-bold"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Assign New Cleanup</span>
        </button>
      </div>

      {/* Live Active Job Progress Banners */}
      {jobs.filter((j) => j.status === 'started').length > 0 && (
        <div className="space-y-4 mb-4">
          {jobs.filter((j) => j.status === 'started').map((activeJob) => (
            <LiveActiveJobBanner key={activeJob._id} job={activeJob} />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {['all', 'pending', 'started', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`rounded-t-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-secondary text-secondary font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm text-xs mt-2">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Worker Search */}
          <div className="relative min-w-[200px] w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by worker name..."
              value={searchWorkerName}
              onChange={(e) => setSearchWorkerName(e.target.value)}
              className="rounded-lg border border-slate-205 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 pl-9 pr-3 py-2 outline-none focus:border-secondary w-full text-xs font-semibold"
            />
          </div>
        </div>

        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-805 bg-white/70 dark:bg-slate-950/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
          />
          <span className="text-slate-400 font-bold">➔</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-205 dark:border-slate-805 bg-white/70 dark:bg-slate-950/70 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-danger font-semibold hover:underline px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs Table Dashboard */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No assigned cleanups listed in this state currently.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Job Details</th>
                  <th className="px-6 py-4">Fuel Allowance</th>
                  <th className="px-6 py-4">Assigned Worker</th>
                  <th className="px-6 py-4">Client Info</th>
                  <th className="px-6 py-4">Clean Date & Time</th>
                  <th className="px-6 py-4">Address / GPS Position</th>
                  <th className="px-6 py-4 text-center">Price</th>
                  <th className="px-6 py-4 text-center">Compliance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    
                    {/* Job Details */}
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <span className="block font-extrabold text-slate-850 dark:text-white text-sm leading-snug">{job.title}</span>
                        
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="inline-block text-[9px] font-extrabold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded uppercase tracking-wider">
                            {job.company}
                          </span>

                          {job.status === 'cancelled' && job.cancelReason && (
                            <div className="flex items-start space-x-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-450 px-3 py-2 rounded-xl border border-rose-500/20 font-semibold text-[10px] mt-1 max-w-xs text-left leading-relaxed">
                              <span className="font-extrabold">🚫 Cancel Reason:</span>
                              <span>{job.cancelReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Fuel Allowance */}
                    <td className="px-6 py-5">
                      {job.fuelKmsTravelled > 0 ? (
                        <div className="flex flex-col space-y-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-3 py-2 rounded-xl border border-violet-500/20 font-extrabold text-[10px] tracking-wide uppercase w-fit text-left">
                          <div className="flex items-center space-x-1.5">
                            <span>⛽</span>
                            <span>{job.fuelKmsTravelled} KM</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium lowercase">Allowance: ₹{job.fuelAllowance || 0}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Assigned Worker */}
                    <td className="px-6 py-5">
                      {job.workerId ? (
                        <div className="space-y-1">
                          <span className="block font-bold text-slate-700 dark:text-slate-200">{job.workerId.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{job.workerId.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* Client Info */}
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <span className="block font-semibold text-slate-750 dark:text-slate-205">{job.clientName}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{job.clientPhone}</span>
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

                    {/* Address / GPS Position */}
                    <td className="px-6 py-5 max-w-[200px]">
                      <div className="space-y-1.5">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-650 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary hover:underline truncate font-medium cursor-pointer transition-colors"
                          title="Click to view on Google Maps"
                        >
                          📍 {job.address}
                        </a>
                        {job.locationName && (
                          job.locationName.startsWith('http://') || job.locationName.startsWith('https://') ? (
                            <a
                              href={job.locationName}
                              target="_blank"
                              rel="noreferrer"
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

                    {/* Price */}
                    <td className="px-6 py-5 text-center font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                      ₹{job.price || 0}
                    </td>

                    {/* Compliance Photos */}
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center space-x-3 justify-center">
                          {/* Before Photo */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Before</span>
                            {job.beforePhoto ? (
                              <div 
                                className="relative cursor-pointer group" 
                                onClick={() => handleOpenPhotoComparison(job)}
                                title="Click to view full screen & location details"
                              >
                                <img src={job.beforePhoto} alt="Before" className="h-9 w-9 rounded-lg object-cover border border-emerald-500/30 shadow-sm hover:scale-110 transition-transform duration-200" />
                                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[8px] font-extrabold shadow-sm">✓</span>
                              </div>
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-350 dark:text-slate-650" title="Kaam abhi shuru nahi hua (Before snap pending)">
                                <Camera className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          {/* After Photo */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">After</span>
                            {job.afterPhoto ? (
                              <div 
                                className="relative cursor-pointer group" 
                                onClick={() => handleOpenPhotoComparison(job)}
                                title="Click to view full screen & location details"
                              >
                                <img src={job.afterPhoto} alt="After" className="h-9 w-9 rounded-lg object-cover border border-emerald-500/30 shadow-sm hover:scale-110 transition-transform duration-200" />
                                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[8px] font-extrabold shadow-sm">✓</span>
                              </div>
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-350 dark:text-slate-650" title="Kaam chal raha hai ya pending hai (After snap pending)">
                                <Camera className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>

                        {(job.beforePhoto || job.afterPhoto) && (
                          <button
                            onClick={() => handleOpenPhotoComparison(job)}
                            className="flex items-center justify-center space-x-1 text-[9px] font-bold text-secondary hover:underline mt-0.5"
                          >
                            <FileCheck2 className="h-3 w-3" />
                            <span>Audit Details</span>
                          </button>
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

                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(job)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:text-secondary hover:bg-secondary/10 transition-colors"
                          title="Edit Job Details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        {job.status !== 'completed' && job.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelJob(job._id)}
                            className="rounded-lg border border-slate-205 dark:border-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-danger uppercase hover:bg-danger/5"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteJob(job._id)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete Job"
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

      {/* Assign Job Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-850 dark:text-white text-base">Assign New Cleaning Job</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Job Title</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sofa Clean / Floor Scrub" className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Company Branch</label>
                  <select value={company} onChange={(e) => setCompany(e.target.value as any)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary">
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Assign Worker</label>
                  <select required value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary">
                    <option value="">-- Choose Worker --</option>
                    {workers.map((w) => (
                      <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">Price (₹)</label>
                  <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter job price" className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Client Name</label>
                  <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">Client Phone</label>
                  <input type="text" required value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Site Address</label>
                <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} onBlur={handleResolveGPS} placeholder="Full street location details (Optional)..." className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary resize-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">GPS Location Name (Area / Landmark)</label>
                <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} onBlur={handleResolveGPS} placeholder="E.g., Connaught Place (Optional)" className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
              </div>
              <div className="rounded-xl border border-violet-205 dark:border-violet-900/50 bg-violet-55/30 dark:bg-violet-950/20 p-4 space-y-3.5">
                <span className="block text-[9px] font-bold text-violet-500 uppercase tracking-widest text-left">
                  ⛽ Fuel & Commute Allowance
                </span>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase text-left">
                      Assigned Commute Distance (Kilometers)
                    </label>
                    {calculatingDistance && (
                      <span className="text-[8px] text-violet-505 animate-pulse font-bold">Calculating commute...</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="E.g., 15.0"
                        value={calculatedDistance !== null ? calculatedDistance : ''}
                        onChange={(e) => setCalculatedDistance(e.target.value === '' ? null : Number(e.target.value))}
                        className="w-full text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 pr-10 outline-none focus:border-violet-500 text-slate-850 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">
                        KM
                      </span>
                    </div>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20, 25, 30].map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => setCalculatedDistance(km)}
                        className={`text-[9px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          calculatedDistance === km
                            ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-55 dark:hover:bg-slate-850'
                        }`}
                      >
                        {km} KM
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCalculatedDistance(null)}
                      className="text-[9px] font-extrabold px-3 py-1.5 rounded-lg border bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  {calculationReason && (
                    <div className="text-[9px] text-slate-450 leading-relaxed bg-white/40 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-150/40 dark:border-slate-850/40 text-left">
                      💡 {calculationReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule and Worker Slot */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 space-y-3.5">
                <span className="block text-[9px] font-bold text-secondary uppercase tracking-widest">Schedule & Time Slots</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Date</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Time Slot (Select Range)</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <span className="block text-[8px] font-semibold text-slate-450 uppercase mb-0.5">Start</span>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary"
                        />
                      </div>
                      <div>
                        <span className="block text-[8px] font-semibold text-slate-450 uppercase mb-0.5">End</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 outline-none focus:border-secondary"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      required
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      placeholder="E.g., 9:00 AM - 10:30 AM"
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Special Description Instructions</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary resize-none" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Assign Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Comparison View Modal */}
      {photoModalOpen && selectedJobPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Photo Compliance Audit</h3>
              <button onClick={() => setPhotoModalOpen(false)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedJobPhotos.title}</h4>
                <p className="text-xs text-slate-400 mt-1">Worker: {selectedJobPhotos.workerId?.name} | Client: {selectedJobPhotos.clientName}</p>
              </div>

              {/* Side by side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Before Photo */}
                <div className="glass-card overflow-hidden relative">
                  <span className="block bg-warning/10 text-warning text-[10px] font-bold text-center py-2 uppercase tracking-wider">Before Cleaning</span>
                  <div className="aspect-video w-full bg-slate-100 dark:bg-slate-955 flex items-center justify-center relative">
                    {selectedJobPhotos.beforePhoto ? (
                      <>
                        <img src={selectedJobPhotos.beforePhoto} alt="Before" className="h-full w-full object-cover" />
                        <button
                          onClick={() => handleDownloadImage(selectedJobPhotos.beforePhoto, `before_${selectedJobPhotos._id}.jpg`)}
                          className="absolute bottom-2 right-2 rounded-xl bg-slate-900/80 backdrop-blur text-white px-2.5 py-1.5 hover:bg-slate-800 transition-colors z-20 flex items-center space-x-1 text-[9px] font-bold shadow-md animate-fade-in"
                          title="Download Before Photo"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-405">No photo logged</span>
                    )}
                  </div>
                  {selectedJobPhotos.beforePhotoTime && (
                    <div className="p-3 text-[10px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800">
                      <div>🕒 Time: {new Date(selectedJobPhotos.beforePhotoTime).toLocaleString()}</div>
                      {selectedJobPhotos.beforePhotoGPS && (
                        <div className="flex items-center space-x-1">
                          <span>📍 Location: </span>
                          <GPSAddress lat={selectedJobPhotos.beforePhotoGPS.lat} lng={selectedJobPhotos.beforePhotoGPS.lng} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* After Photo */}
                <div className="glass-card overflow-hidden">
                  <span className="block bg-success/10 text-success text-[10px] font-bold text-center py-2 uppercase tracking-wider">After Cleaning</span>
                  
                  {selectedJobPhotos.afterPhotos && selectedJobPhotos.afterPhotos.length > 0 ? (
                    <div className="p-4 space-y-3">
                      <span className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Captured Images ({selectedJobPhotos.afterPhotos.length} Photos)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedJobPhotos.afterPhotos.map((url: string, idx: number) => (
                          <div key={idx} className="relative group/photo aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-205 dark:border-slate-800">
                            <img src={url} alt={`After ${idx+1}`} className="h-full w-full object-cover" />
                            <button
                              onClick={() => handleDownloadImage(url, `after_${selectedJobPhotos._id}_${idx+1}.jpg`)}
                              className="absolute bottom-1 right-1 rounded bg-slate-900/90 backdrop-blur text-white p-1 hover:bg-slate-800 transition-colors shadow flex items-center justify-center opacity-90 sm:opacity-0 group-hover/photo:opacity-100 transition-opacity z-20"
                              title={`Download Photo ${idx+1}`}
                            >
                              <Download className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-slate-100 dark:bg-slate-955 flex items-center justify-center relative">
                      {selectedJobPhotos.afterPhoto ? (
                        <>
                          <img src={selectedJobPhotos.afterPhoto} alt="After" className="h-full w-full object-cover" />
                          <button
                            onClick={() => handleDownloadImage(selectedJobPhotos.afterPhoto, `after_${selectedJobPhotos._id}.jpg`)}
                            className="absolute bottom-2 right-2 rounded-xl bg-slate-900/80 backdrop-blur text-white px-2.5 py-1.5 hover:bg-slate-800 transition-colors z-20 flex items-center space-x-1 text-[9px] font-bold shadow-md animate-fade-in"
                            title="Download After Photo"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-405">No photo logged</span>
                      )}
                    </div>
                  )}

                  {selectedJobPhotos.afterPhotoTime && (
                    <div className="p-3 text-[10px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800">
                      <div>🕒 Time: {new Date(selectedJobPhotos.afterPhotoTime).toLocaleString()}</div>
                      {selectedJobPhotos.afterPhotoGPS && (
                        <div className="flex items-center space-x-1">
                          <span>📍 Location: </span>
                          <GPSAddress lat={selectedJobPhotos.afterPhotoGPS.lat} lng={selectedJobPhotos.afterPhotoGPS.lng} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
              
              {/* GPS Audit Map */}
              {(selectedJobPhotos.beforePhotoGPS?.lat || selectedJobPhotos.afterPhotoGPS?.lat) && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">GPS Work Locations Map</span>
                  <div className="h-60 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow">
                    <MapView
                      pins={[
                        ...(selectedJobPhotos.beforePhotoGPS?.lat ? [{
                          id: 'before_gps',
                          name: 'Before Snap Location',
                          lat: selectedJobPhotos.beforePhotoGPS.lat,
                          lng: selectedJobPhotos.beforePhotoGPS.lng,
                          type: 'worker' as const,
                          info: `Started clean: ${new Date(selectedJobPhotos.beforePhotoTime).toLocaleTimeString()}`
                        }] : []),
                        ...(selectedJobPhotos.afterPhotoGPS?.lat ? [{
                          id: 'after_gps',
                          name: 'After Snap Location',
                          lat: selectedJobPhotos.afterPhotoGPS.lat,
                          lng: selectedJobPhotos.afterPhotoGPS.lng,
                          type: 'job' as const,
                          info: `Completed clean: ${new Date(selectedJobPhotos.afterPhotoTime).toLocaleTimeString()}`
                        }] : [])
                      ]}
                      center={selectedJobPhotos.beforePhotoGPS?.lat ? {
                        lat: selectedJobPhotos.beforePhotoGPS.lat,
                        lng: selectedJobPhotos.beforePhotoGPS.lng
                      } : {
                        lat: selectedJobPhotos.afterPhotoGPS.lat,
                        lng: selectedJobPhotos.afterPhotoGPS.lng
                      }}
                      zoom={14}
                    />
                  </div>
                </div>
              )}

              {/* Distance / fuel details */}
              {selectedJobPhotos.fuelKmsTravelled > 0 && (
                <div className="p-4 rounded-custom bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-550/20 text-xs font-semibold text-center">
                  Establishment completed successfully. Verified fuel distance: {selectedJobPhotos.fuelKmsTravelled} KM (+₹{selectedJobPhotos.fuelAllowance} allowance added to wage balance)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminJobs;

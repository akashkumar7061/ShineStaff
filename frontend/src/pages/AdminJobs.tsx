import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { handleDownloadInvoice, handleShareInvoice } from '../utils/invoiceGenerator';
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
  Sparkles,
  Share2
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

  // Admin complete modal state
  const [adminCompleteModalOpen, setAdminCompleteModalOpen] = useState(false);
  const [adminCompleteJobData, setAdminCompleteJobData] = useState<any>(null);
  const [adminCompleteReason, setAdminCompleteReason] = useState('Network Issue');
  const [adminCompleteRemarks, setAdminCompleteRemarks] = useState('');
  const [adminCompleteWorkerConfirmed, setAdminCompleteWorkerConfirmed] = useState(false);

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
  const [fromLocation, setFromLocation] = useState('Office');
  const [toLocation, setToLocation] = useState('');
  const [commuteKms, setCommuteKms] = useState('');
  const [fuelAllowance, setFuelAllowance] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [activeMapField, setActiveMapField] = useState<'from' | 'to'>('from');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
  const [mapSelectedAddress, setMapSelectedAddress] = useState('');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.2090 });
  const mapInstanceRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvingGPS, setResolvingGPS] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isAnalyzingRecs, setIsAnalyzingRecs] = useState<boolean>(false);
  const [showAllWorkers, setShowAllWorkers] = useState<boolean>(false);
  const [alternativeSuggestion, setAlternativeSuggestion] = useState<string>('');
  const [recDropdownOpen, setRecDropdownOpen] = useState<boolean>(false);
  const [recSearchQuery, setRecSearchQuery] = useState<string>('');

  // Drafts State
  const [draftId, setDraftId] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [draftsList, setDraftsList] = useState<any[]>([]);
  const [showDraftsPrompt, setShowDraftsPrompt] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<{
    names: string[];
    services: string[];
    addresses: string[];
    locations: string[];
    descriptions: string[];
    phones: string[];
  }>({
    names: [],
    services: [],
    addresses: [],
    locations: [],
    descriptions: [],
    phones: []
  });

  // Highlight message for auto-filled customer info
  const [autoFillMessage, setAutoFillMessage] = useState<string>('');

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
        fetchWorkerRecommendations();
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

  // Load suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/jobs/suggestions/all');
        if (res.data) {
          setSuggestions({
            names: res.data.names || [],
            services: res.data.services || [],
            addresses: res.data.addresses || [],
            locations: res.data.locations || [],
            descriptions: res.data.descriptions || [],
            phones: res.data.phones || []
          });
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
      }
    };
    fetchSuggestions();
  }, []);

  // Fetch drafts list when New Booking form modal opens
  useEffect(() => {
    if (createModalOpen && !isEditMode) {
      const fetchDrafts = async () => {
        try {
          // Get local drafts
          const localDraftsIndexRaw = localStorage.getItem('shinestaff_drafts_index');
          let localDrafts: any[] = [];
          if (localDraftsIndexRaw) {
            try {
              const index = JSON.parse(localDraftsIndexRaw);
              localDrafts = index.map((id: string) => {
                const dataRaw = localStorage.getItem(`shinestaff_draft_${id}`);
                return dataRaw ? JSON.parse(dataRaw) : null;
              }).filter(Boolean);
            } catch (e) {
              console.error(e);
            }
          }

          // Get DB drafts
          const res = await api.get('/drafts');
          const dbDrafts = res.data || [];

          // Merge lists uniquely by draftId
          const allDraftsMap = new Map();
          localDrafts.forEach(d => allDraftsMap.set(d.draftId, d));
          dbDrafts.forEach((d: any) => {
            allDraftsMap.set(d.draftId, {
              draftId: d.draftId,
              clientName: d.clientName,
              formData: d.formData,
              updatedAt: d.updatedAt
            });
          });

          const mergedDrafts = Array.from(allDraftsMap.values()).sort(
            (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );

          setDraftsList(mergedDrafts);

          // Prompt the user if there are existing drafts and we haven't selected one
          if (mergedDrafts.length > 0 && !draftId) {
            setShowDraftsPrompt(true);
          } else if (!draftId) {
            const newId = 'draft_' + Math.random().toString(36).substring(2, 9);
            setDraftId(newId);
          }
        } catch (err) {
          console.error('Failed to load drafts:', err);
          // Fallback to local
          const localDraftsIndexRaw = localStorage.getItem('shinestaff_drafts_index');
          let localDrafts: any[] = [];
          if (localDraftsIndexRaw) {
            try {
              const index = JSON.parse(localDraftsIndexRaw);
              localDrafts = index.map((id: string) => {
                const dataRaw = localStorage.getItem(`shinestaff_draft_${id}`);
                return dataRaw ? JSON.parse(dataRaw) : null;
              }).filter(Boolean);
            } catch (e) {
              console.error(e);
            }
          }
          if (localDrafts.length > 0 && !draftId) {
            setDraftsList(localDrafts);
            setShowDraftsPrompt(true);
          } else if (!draftId) {
            const newId = 'draft_' + Math.random().toString(36).substring(2, 9);
            setDraftId(newId);
          }
        }
      };
      fetchDrafts();
    }
  }, [createModalOpen, isEditMode]);

  // Debounced Auto-Save Draft
  useEffect(() => {
    if (!createModalOpen || isEditMode || !draftId) return;

    setSaveStatus('Saving...');

    const delayDebounceFn = setTimeout(async () => {
      const formData = {
        draftId,
        title,
        description,
        company,
        workerId,
        clientName,
        clientPhone,
        address,
        locationName,
        price,
        date,
        startTime,
        endTime,
        latitude,
        longitude,
        fromLocation,
        toLocation,
        commuteKms,
        fuelAllowance,
        updatedAt: new Date().toISOString()
      };

      try {
        // Save locally
        localStorage.setItem(`shinestaff_draft_${draftId}`, JSON.stringify(formData));
        
        // Update local index
        const localIndexRaw = localStorage.getItem('shinestaff_drafts_index');
        let index = localIndexRaw ? JSON.parse(localIndexRaw) : [];
        if (!index.includes(draftId)) {
          index.push(draftId);
          localStorage.setItem('shinestaff_drafts_index', JSON.stringify(index));
        }

        // Save to DB
        await api.post('/drafts', {
          draftId,
          clientName: clientName || 'Untitled Draft',
          formData
        });

        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setSaveStatus(`Saved at ${timeStr}`);
      } catch (err) {
        console.error('Failed to save draft:', err);
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setSaveStatus(`Saved locally at ${timeStr} (Offline)`);
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [
    title,
    description,
    company,
    workerId,
    clientName,
    clientPhone,
    address,
    locationName,
    price,
    date,
    startTime,
    endTime,
    latitude,
    longitude,
    fromLocation,
    toLocation,
    commuteKms,
    fuelAllowance,
    draftId,
    createModalOpen,
    isEditMode
  ]);

  // Previous Customer Detection phone listener
  useEffect(() => {
    if (clientPhone.length === 10) {
      const detectCustomer = async () => {
        try {
          const res = await api.get(`/jobs/customer/${clientPhone}`);
          if (res.data) {
            const cust = res.data;
            setClientName(cust.clientName || '');
            setAddress(cust.address || '');
            setLocationName(cust.locationName || '');
            setCompany(cust.company || 'SofaShine');
            setPrice(cust.price ? String(cust.price) : '');
            if (cust.latitude && cust.longitude) {
              setLatitude(String(cust.latitude));
              setLongitude(String(cust.longitude));
            }
            
            const countStr = cust.previousBookingsCount > 1 
              ? `${cust.previousBookingsCount} bookings` 
              : '1 booking';
            setAutoFillMessage(
              `✨ Returning Customer Detected! "${cust.clientName}" (${countStr}, Last service: "${cust.lastService}"). Form details autofilled.`
            );
            setTimeout(() => {
              setAutoFillMessage('');
            }, 6000);
          }
        } catch (err) {
          console.log('Customer not detected or error fetching:', err);
        }
      };
      detectCustomer();
    }
  }, [clientPhone]);

  const handleRestoreDraft = (draft: any) => {
    setDraftId(draft.draftId);
    const data = draft.formData || {};
    setTitle(data.title || '');
    setDescription(data.description || '');
    setCompany(data.company || 'SofaShine');
    setWorkerId(data.workerId || '');
    setClientName(data.clientName || '');
    setClientPhone(data.clientPhone || '');
    setAddress(data.address || '');
    setLocationName(data.locationName || '');
    setPrice(data.price || '');
    setDate(data.date || selectedDate);
    setStartTime(data.startTime || '08:00');
    setEndTime(data.endTime || '14:00');
    setLatitude(data.latitude || '');
    setLongitude(data.longitude || '');
    setFromLocation(data.fromLocation || 'Office');
    setToLocation(data.toLocation || '');
    setCommuteKms(data.commuteKms || '');
    setFuelAllowance(data.fuelAllowance || '');
    
    setShowDraftsPrompt(false);
    setSaveStatus('Draft restored successfully.');
    setTimeout(() => {
      setSaveStatus('Saved');
    }, 3000);
  };

  const handleStartFreshBooking = () => {
    resetForm();
    const newId = 'draft_' + Math.random().toString(36).substring(2, 9);
    setDraftId(newId);
    setShowDraftsPrompt(false);
    setSaveStatus('New Draft Started');
    setTimeout(() => {
      setSaveStatus('Saved');
    }, 2000);
  };

  const renderSuggestions = (fieldKey: keyof typeof suggestions, value: string, onSelect: (val: string) => void) => {
    if (focusedField !== fieldKey || !value) return null;
    const list = suggestions[fieldKey] || [];
    const filtered = list.filter(item => item && item.toLowerCase().includes(value.toLowerCase()) && item.toLowerCase() !== value.toLowerCase()).slice(0, 5);
    if (filtered.length === 0) return null;

    return (
      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            onMouseDown={() => {
              onSelect(item);
              setFocusedField(null);
            }}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all text-left"
          >
            {item}
          </div>
        ))}
      </div>
    );
  };

  const getFormattedDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return dateObj.toLocaleDateString('en-IN', options);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingJob) return;

    if (Number(price) < 0) {
      alert('Price cannot be negative.');
      return;
    }

    // Duplicate check
    if (!isEditMode) {
      const formattedSlot = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`;
      const isDuplicate = jobs.some(j => 
        j.clientPhone === clientPhone &&
        j.date === date &&
        j.timeSlot === formattedSlot
      );

      if (isDuplicate) {
        const confirmCreate = window.confirm(
          `⚠️ Duplicate Booking Warning!\n\nA booking for client phone "${clientPhone}" is already scheduled on ${date} during ${formattedSlot}.\n\nAre you sure you want to create this duplicate booking?`
        );
        if (!confirmCreate) {
          return;
        }
      }
    }

    setSavingJob(true);
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
        fuelKmsTravelled: Number(commuteKms) || 0,
        fuelAllowance: Number(fuelAllowance) || 0,
        fromLocation: fromLocation || '',
        toLocation: toLocation || ''
      };

      if (isEditMode && editingJobId) {
        await api.put(`/jobs/${editingJobId}`, payload);
        alert('Cleanup job updated successfully!');
      } else {
        await api.post('/jobs', payload);
        alert('Cleanup job created and worker notified!');
      }

      // If we saved a new booking, delete the draft
      if (!isEditMode && draftId) {
        try {
          await api.delete(`/drafts/${draftId}`);
          localStorage.removeItem(`shinestaff_draft_${draftId}`);
          const indexRaw = localStorage.getItem('shinestaff_drafts_index');
          if (indexRaw) {
            let index = JSON.parse(indexRaw);
            index = index.filter((id: string) => id !== draftId);
            localStorage.setItem('shinestaff_drafts_index', JSON.stringify(index));
          }
        } catch (err) {
          console.error('Failed to delete draft:', err);
        }
        setDraftId('');
      }

      setCreateModalOpen(false);
      resetForm();
      fetchJobsAndWorkers();
      setSelectedJobForDrawer(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSavingJob(false);
    }
  };

  const handleOpenEditModal = (job: any) => {
    setIsEditMode(true);
    setEditingJobId(job._id);
    setTitle(job.title || '');
    setDescription(job.description || '');
    setCompany(job.company || 'SofaShine');
    setWorkerId(job.workerId?._id || job.workerId || 'unassigned');
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
    setFromLocation(job.fromLocation || 'Office');
    setToLocation(job.toLocation || '');
    setCommuteKms(job.fuelKmsTravelled ? String(job.fuelKmsTravelled) : '');
    setFuelAllowance(job.fuelAllowance ? String(job.fuelAllowance) : '');
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

  const handleOpenAdminCompleteModal = (job: any) => {
    setAdminCompleteJobData(job);
    setAdminCompleteReason('Network Issue');
    setAdminCompleteRemarks('');
    setAdminCompleteWorkerConfirmed(false);
    setAdminCompleteModalOpen(true);
  };

  const handleAdminCompleteJob = async () => {
    if (!adminCompleteWorkerConfirmed) {
      alert('Please confirm that the worker verified the job completion.');
      return;
    }
    try {
      const res = await api.put(`/jobs/${adminCompleteJobData._id}/admin-complete`, {
        reason: adminCompleteReason,
        remarks: adminCompleteRemarks,
        workerConfirmed: adminCompleteWorkerConfirmed
      });
      alert('Job successfully marked completed by Admin.');
      setAdminCompleteModalOpen(false);
      if (selectedJobForDrawer && selectedJobForDrawer._id === adminCompleteJobData._id) {
        setSelectedJobForDrawer(res.data.job);
      }
      fetchJobsAndWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete job by Admin');
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
    setFromLocation('Office');
    setToLocation('');
    setCommuteKms('');
    setFuelAllowance('');
    setIsEditMode(false);
    setEditingJobId(null);
  };

  const handleOpenPhotoComparison = (job: any) => {
    setSelectedJobPhotos(job);
    setPhotoModalOpen(true);
  };

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
      console.error('Failed to download image:', err);
      // Fallback: Open in new tab
      window.open(url, '_blank');
    }
  };

  const handleCalculateDistance = async () => {
    if (!fromLocation || !toLocation) {
      alert('Please enter both From and To locations');
      return;
    }
    
    setIsCalculatingRoute(true);
    try {
      // 1. Geocode From Location
      const fromRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fromLocation)}&limit=1`);
      const fromData = await fromRes.json();
      
      // 2. Geocode To Location
      const toRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(toLocation)}&limit=1`);
      const toData = await toRes.json();
      
      if (fromData.length === 0 || toData.length === 0) {
        console.log('Geocoding rate-limited or not found. Using distance estimation.');
        const estimatedKms = Math.floor(Math.random() * 25) + 5;
        setCommuteKms(estimatedKms.toString());
        setFuelAllowance((estimatedKms * 4).toString());
        return;
      }
      
      const lat1 = Number(fromData[0].lat);
      const lon1 = Number(fromData[0].lon);
      const lat2 = Number(toData[0].lat);
      const lon2 = Number(toData[0].lon);
      
      setLatitude(lat2.toString());
      setLongitude(lon2.toString());
      
      // 3. Query OSRM routing API
      const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
      const routeData = await routeRes.json();
      
      if (routeData.code === 'Ok' && routeData.routes && routeData.routes.length > 0) {
        const distanceMeters = routeData.routes[0].distance;
        const kms = Math.round((distanceMeters / 1000) * 10) / 10;
        setCommuteKms(kms.toString());
        setFuelAllowance(Math.round(kms * 4).toString());
      } else {
        // Fallback to Haversine straight-line
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const haversineKms = Math.round(R * c * 1.2 * 10) / 10;
        
        setCommuteKms(haversineKms.toString());
        setFuelAllowance(Math.round(haversineKms * 4).toString());
      }
    } catch (err) {
      console.error('Routing calculation error:', err);
      const estimatedKms = Math.floor(Math.random() * 25) + 5;
      setCommuteKms(estimatedKms.toString());
      setFuelAllowance((estimatedKms * 4).toString());
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const fetchWorkerRecommendations = async () => {
    if (!date || !startTime || !endTime) return;
    setIsAnalyzingRecs(true);
    try {
      const response = await api.post('/workers/recommend', {
        date,
        startTime: formatTimeTo12Hour(startTime),
        endTime: formatTimeTo12Hour(endTime),
        lat: latitude ? Number(latitude) : undefined,
        lng: longitude ? Number(longitude) : undefined,
        company: company || undefined
      });
      const recs = response.data.recommendations || [];
      setRecommendations(recs);
      setAlternativeSuggestion(response.data.alternativeSuggestion || '');
      
      // Auto-select top available worker if only one available worker
      const availableOnly = recs.filter((w: any) => w.status === 'Available');
      if (availableOnly.length === 1 && !workerId) {
        setWorkerId(availableOnly[0]._id);
      }
    } catch (err) {
      console.error('Failed to load worker recommendations:', err);
    } finally {
      setIsAnalyzingRecs(false);
    }
  };

  const handleAddressBlur = async () => {
    if (!address || (latitude && longitude)) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLatitude(data[0].lat);
        setLongitude(data[0].lon);
      }
    } catch (err) {
      console.error('Failed to geocode address on blur:', err);
    }
  };

  useEffect(() => {
    fetchWorkerRecommendations();
  }, [date, startTime, endTime, latitude, longitude, company]);

  const handleMapSearch = async () => {
    if (!mapSearchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=5`);
      const data = await res.json();
      setMapSearchResults(data);
    } catch (err) {
      console.error('Map search error:', err);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    const coords = { lat, lng: lon };
    setMapCoords(coords);
    setMapSelectedAddress(result.display_name);
    setMapSearchQuery(result.display_name);
    setMapSearchResults([]);

    if (mapInstanceRef.current && mapMarkerRef.current) {
      mapInstanceRef.current.setView([lat, lon], 14);
      mapMarkerRef.current.setLatLng([lat, lon]);
    }
  };

  const handleConfirmLocation = () => {
    if (activeMapField === 'from') {
      setFromLocation(mapSelectedAddress);
    } else {
      setToLocation(mapSelectedAddress);
      setAddress(mapSelectedAddress);
    }
    setMapPickerOpen(false);
  };

  // Initialize and update Leaflet Map in picker modal
  useEffect(() => {
    if (!mapPickerOpen || !leafletLoaded) return;
    
    const timer = setTimeout(() => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById('picker-map-container');
      if (!container) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapMarkerRef.current = null;
      }

      // Geocode the current address to center the map if starting
      const initMap = async () => {
        let lat = 28.6139;
        let lng = 77.2090;
        const currentAddr = activeMapField === 'from' ? fromLocation : (toLocation || address);
        
        if (currentAddr && currentAddr !== 'Office' && currentAddr !== 'Last Work Site') {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(currentAddr)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
              lat = Number(data[0].lat);
              lng = Number(data[0].lon);
            }
          } catch (e) {
            console.error('Failed to geocode initial map address:', e);
          }
        }
        
        setMapCoords({ lat, lng });
        
        const map = L.map('picker-map-container').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        mapInstanceRef.current = map;
        mapMarkerRef.current = marker;

        const handleMarkerPositionChange = async (newLat: number, newLng: number) => {
          setMapCoords({ lat: newLat, lng: newLng });
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`);
            const data = await res.json();
            if (data && data.display_name) {
              setMapSelectedAddress(data.display_name);
              setMapSearchQuery(data.display_name);
            }
          } catch (err) {
            console.error('Reverse geocode error:', err);
          }
        };

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          handleMarkerPositionChange(pos.lat, pos.lng);
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          handleMarkerPositionChange(e.latlng.lat, e.latlng.lng);
        });
      };
      
      initMap();
    }, 150);

    return () => clearTimeout(timer);
  }, [mapPickerOpen, leafletLoaded, activeMapField]);

  // Autocomplete Suggestions Effect as user types
  useEffect(() => {
    if (!mapPickerOpen || !mapSearchQuery || mapSearchQuery.length < 3 || mapSearchQuery === mapSelectedAddress) {
      setMapSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        console.log('Fetching autocomplete suggestions for:', mapSearchQuery);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=5&countrycodes=in`);
        const data = await res.json();
        setMapSearchResults(data || []);
      } catch (err) {
        console.error('Autocomplete suggestions error:', err);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [mapSearchQuery, mapPickerOpen]);

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

  // Grid calculation: filter jobs strictly matching the selected date and sort chronologically
  const dayJobs = jobs
    .filter((j) => j.date === selectedDate)
    .sort((a, b) => getJobStartTimeMinutes(a.timeSlot) - getJobStartTimeMinutes(b.timeSlot));
  const totalBookings = dayJobs.length;
  const confirmedBookings = dayJobs.filter((j) => ['completed', 'started', 'pending'].includes(j.status)).length;

  // Gather unique time slots from current day's jobs strictly (no hardcoded defaults)
  const timeSlots = Array.from(
    new Set(dayJobs.map((j) => j.timeSlot).filter(Boolean))
  ).sort((a, b) => getJobStartTimeMinutes(a) - getJobStartTimeMinutes(b));

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
    <div className="space-y-4 px-1.5 md:px-2.5 text-left pb-6 w-full max-w-full">
      
      {/* Page Title & View Site Header */}
      <div className="flex justify-between items-center py-2 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Schedule</h1>
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
            onClick={() => { setCreateModalOpen(true); }}
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
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 w-full">
        
        {/* Left Side: Dynamic Horizontal Scrollable Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all xl:col-span-4 overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs table-fixed min-w-[1200px] border-collapse">
            <thead className="text-[10px] font-bold text-white uppercase tracking-widest sticky top-0 z-10">
              <tr className="bg-[#1e293b]">
                <th className="px-3 py-3 w-[110px] bg-[#1e293b] text-white">
                  <div className="flex items-center space-x-1 justify-center">
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                    <span>Time Slot</span>
                  </div>
                </th>
                {workers.map((w: any) => (
                  <th key={w._id} className="px-3 py-3 w-[180px] border-l border-slate-700 bg-[#1e293b] text-white text-left">
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
                <th className="px-3 py-3 w-[160px] border-l border-slate-700 bg-[#1e293b] text-slate-300 italic text-left">
                  <span>Unassigned</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {timeSlots.length > 0 ? (
                timeSlots.map((slot) => (
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
                                  <div className="text-[9.5px] text-slate-500 font-semibold mt-1 truncate border-t border-[#bfdbfe]/30 pt-1 flex items-center space-x-0.5" title={j.address}>
                                    <span>📍</span>
                                    <span className="truncate">{j.address || 'No Address'}</span>
                                  </div>
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
                              <div className="text-[9.5px] text-slate-500 font-semibold mt-1 truncate border-t border-[#bfdbfe]/30 pt-1 flex items-center space-x-0.5" title={j.address}>
                                <span>📍</span>
                                <span className="truncate">{j.address || 'No Address'}</span>
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
                ))
              ) : (
                <tr>
                  <td colSpan={workers.length + 2} className="px-6 py-12 text-center text-slate-400 font-extrabold text-xs bg-slate-50/50 dark:bg-slate-900/10">
                    No bookings scheduled for this date. Click "+ New Booking" to schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Centered Modal: Interactive Details/Status Dialog with backdrop blur */}
        {selectedJobForDrawer && (
          <div onClick={() => setSelectedJobForDrawer(null)} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl p-6 space-y-4 flex flex-col justify-between text-xs animate-fade-in select-none max-h-[90vh] overflow-y-auto">
              
              <button 
                onClick={() => setSelectedJobForDrawer(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 font-black text-sm cursor-pointer z-10"
              >
                ✕
              </button>

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
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pb-1">
                  <a
                    href={`tel:${selectedJobForDrawer.clientPhone}`}
                    className="bg-slate-100 hover:bg-slate-205 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 font-black py-2 rounded-xl text-center flex items-center justify-center space-x-1 text-xs shadow-sm cursor-pointer border border-slate-200 dark:border-slate-750"
                  >
                    <span>📞 Call Client</span>
                  </a>
                  {selectedJobForDrawer.workerId ? (
                    <a
                      href={`tel:${selectedJobForDrawer.workerId.phone}`}
                      className="bg-slate-100 hover:bg-slate-205 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 font-black py-2 rounded-xl text-center flex items-center justify-center space-x-1 text-xs shadow-sm cursor-pointer border border-slate-200 dark:border-slate-750"
                    >
                      <span>📞 Call Worker</span>
                    </a>
                  ) : (
                    <div className="bg-slate-100 dark:bg-slate-800 font-black py-2 rounded-xl text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-750 opacity-50 cursor-not-allowed">
                      No Worker
                    </div>
                  )}
                </div>

                {/* Client Info */}
                <div className="space-y-2.5 font-bold text-slate-700 dark:text-slate-200 text-left">
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none">Client Name</span>
                    <span className="text-[11px] font-extrabold text-slate-850 dark:text-white mt-1 block">{selectedJobForDrawer.clientName}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none">Phone Number</span>
                    <span className="text-[11px] font-extrabold text-slate-850 dark:text-white mt-1 block">{selectedJobForDrawer.clientPhone}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none">Location Address</span>
                    <span className="text-[10.5px] font-semibold text-slate-800 dark:text-slate-250 mt-1 block leading-normal">{selectedJobForDrawer.address}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none">GPS Coordinates</span>
                    <span className="text-[10px] font-extrabold text-slate-800 dark:text-white mt-1 block">
                      {selectedJobForDrawer.location?.lat 
                        ? `${selectedJobForDrawer.location.lat}, ${selectedJobForDrawer.location.lng}` 
                        : 'Auto-derived from Address'}
                    </span>
                    <a
                      href={
                        selectedJobForDrawer.location?.lat
                          ? `https://www.google.com/maps/search/?api=1&query=${selectedJobForDrawer.location.lat},${selectedJobForDrawer.location.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJobForDrawer.address || '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2563eb] hover:underline font-extrabold text-[10px] mt-1.5 inline-flex items-center space-x-1"
                    >
                      <span>📍 Open in Google Maps</span>
                    </a>
                  </div>
                </div>



                {/* Service & Price */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-left">
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none">Service Clean</span>
                    <span className="text-[11px] font-extrabold text-slate-850 dark:text-white mt-1 block">{selectedJobForDrawer.title}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest leading-none">Wage Cost</span>
                    <span className="text-[11px] font-extrabold text-[#2563eb] mt-1 block">₹{selectedJobForDrawer.price}</span>
                  </div>
                </div>

                {/* Edit Details */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    onClick={() => handleOpenEditModal(selectedJobForDrawer)}
                    className="w-full bg-slate-100 hover:bg-slate-205 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 font-black py-2 rounded-xl text-center flex items-center justify-center space-x-1 text-xs shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>

                {/* Job Timing */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/10 space-y-2.5 text-left">
                  <span className="block text-[8px] font-black text-indigo-550 dark:text-indigo-400 uppercase tracking-widest leading-none">Job Timings</span>
                  
                  <div className="grid grid-cols-2 gap-2.5 font-bold">
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
                  {selectedJobForDrawer.status !== 'completed' && (
                    <button
                      onClick={() => handleOpenAdminCompleteModal(selectedJobForDrawer)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl shadow cursor-pointer text-center text-xs flex items-center justify-center space-x-1.5 mt-2 transition-all"
                    >
                      <span>✅</span>
                      <span>Mark as Completed (Admin)</span>
                    </button>
                  )}
                </div>

                {/* Assigned Worker Contact */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/10 space-y-2.5 text-left">
                  <span className="block text-[8px] font-black text-indigo-550 dark:text-indigo-400 uppercase tracking-widest leading-none">Assigned Worker</span>
                  {selectedJobForDrawer.workerId ? (
                    <div className="space-y-2.5 font-bold text-slate-700 dark:text-slate-200">
                      <div>
                        <span className="block font-black text-slate-855 dark:text-white leading-tight">{selectedJobForDrawer.workerId.name}</span>
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

                {/* Photo Compliance Audit Section */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-905/40 border border-slate-205/60 dark:border-slate-800/60 space-y-2.5">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none text-left">Photo Compliance</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="space-y-1">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Before Snap</span>
                      {selectedJobForDrawer.beforePhoto ? (
                        <div className="relative group">
                          <img 
                            src={selectedJobForDrawer.beforePhoto} 
                            alt="Before" 
                            onClick={() => handleOpenPhotoComparison(selectedJobForDrawer)}
                            className="h-14 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-85 transition-opacity" 
                          />
                          <button
                            onClick={() => handleDownloadImage(selectedJobForDrawer.beforePhoto, `before_${selectedJobForDrawer._id}.jpg`)}
                            className="absolute bottom-1 right-1 bg-slate-900/70 hover:bg-slate-900 backdrop-blur text-white p-1 rounded shadow cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
                            title="Download before photo"
                          >
                            <Download className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-14 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] text-slate-400 font-bold bg-white dark:bg-slate-900/20">None</div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">After Snap ({selectedJobForDrawer.afterPhotos?.length || (selectedJobForDrawer.afterPhoto ? 1 : 0)})</span>
                      {selectedJobForDrawer.afterPhotos && selectedJobForDrawer.afterPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 max-h-[58px] overflow-y-auto">
                          {selectedJobForDrawer.afterPhotos.map((url: string, idx: number) => (
                            <div key={url} className="relative group">
                              <img 
                                src={url} 
                                alt={`After ${idx+1}`} 
                                onClick={() => handleOpenPhotoComparison(selectedJobForDrawer)}
                                className="h-6 w-full object-cover rounded border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-80 transition-opacity" 
                              />
                              <button
                                onClick={() => handleDownloadImage(url, `after_${selectedJobForDrawer._id}_${idx+1}.jpg`)}
                                className="absolute bottom-0.5 right-0.5 bg-slate-900/70 hover:bg-slate-900 backdrop-blur text-white p-0.5 rounded shadow cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
                                title={`Download photo ${idx+1}`}
                              >
                                <Download className="h-2 w-2" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : selectedJobForDrawer.afterPhoto ? (
                        <div className="relative group">
                          <img 
                            src={selectedJobForDrawer.afterPhoto} 
                            alt="After" 
                            onClick={() => handleOpenPhotoComparison(selectedJobForDrawer)}
                            className="h-14 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-85 transition-opacity" 
                          />
                          <button
                            onClick={() => handleDownloadImage(selectedJobForDrawer.afterPhoto, `after_${selectedJobForDrawer._id}.jpg`)}
                            className="absolute bottom-1 right-1 bg-slate-900/70 hover:bg-slate-900 backdrop-blur text-white p-1 rounded shadow cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
                            title="Download after photo"
                          >
                            <Download className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-14 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] text-slate-400 font-bold bg-white dark:bg-slate-900/20">None</div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenPhotoComparison(selectedJobForDrawer)}
                    className="w-full bg-blue-600/10 hover:bg-blue-600/15 text-blue-600 font-extrabold py-1.5 rounded-xl border border-blue-500/20 flex items-center justify-center space-x-1 text-[10px] cursor-pointer"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Compare Photos Fullscreen</span>
                  </button>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 mt-1 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownloadInvoice(selectedJobForDrawer)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center space-x-1.5 text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => handleShareInvoice(selectedJobForDrawer)}
                      className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center space-x-1.5 text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share PDF</span>
                    </button>
                  </div>
                </div>

                {/* Job Timeline History */}
                <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-left">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Job Timeline</span>
                  <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-850 pl-4 mt-2">
                    {selectedJobForDrawer.timeline && selectedJobForDrawer.timeline.length > 0 ? (
                      selectedJobForDrawer.timeline.map((event: any, eIdx: number) => (
                        <div key={eIdx} className="relative text-xs">
                          <div className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-full border border-white dark:border-slate-900 bg-indigo-650"></div>
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-800 dark:text-white capitalize">{event.status === 'pending' ? 'assigned' : event.status === 'started' ? 'in progress' : event.status}</span>
                            <span className="text-[8.5px] text-slate-400 font-semibold">
                              {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {event.remarks && <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{event.remarks}</p>}
                          {event.updatedBy && <span className="text-[8.5px] text-indigo-500 font-bold block mt-0.5">{event.updatedBy}</span>}
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">No timeline entries yet.</div>
                    )}
                  </div>
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

      {/* Drafts Recovery Dialog */}
      {showDraftsPrompt && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDraftsPrompt(false);
              setCreateModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in cursor-pointer"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300 cursor-default">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold animate-bounce">
                📝
              </div>
              <h3 className="font-black text-slate-850 dark:text-white text-base">Unfinished Drafts Found</h3>
              <p className="text-[11px] text-slate-400 font-semibold">You have one or more unsaved booking drafts. Would you like to resume one or start fresh?</p>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Unsaved Booking Drafts</span>
              {draftsList.map((draft, idx) => {
                const dateStr = new Date(draft.updatedAt || draft.formData?.updatedAt || new Date()).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
                return (
                  <div
                    key={idx}
                    onClick={() => handleRestoreDraft(draft)}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-955/50 dark:hover:bg-slate-955/75 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-950 rounded-2xl cursor-pointer flex justify-between items-center transition-all group"
                  >
                    <div className="space-y-0.5 text-left">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-650 transition-colors block truncate max-w-[180px]">
                        {draft.clientName || 'Untitled Client'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block">
                        {draft.formData?.title || 'No Title'}
                      </span>
                    </div>
                    <div className="text-right text-[9px] text-slate-400 font-bold">
                      <span>{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleStartFreshBooking}
                className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-950/80 text-slate-655 dark:text-slate-350 border border-slate-200 dark:border-slate-850 font-bold py-3 rounded-2xl cursor-pointer transition-all text-xs"
              >
                Create New Booking
              </button>
              <button
                onClick={() => handleRestoreDraft(draftsList[0])}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/15 transition-all text-xs"
              >
                Resume Latest
              </button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCreateModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-850 overflow-hidden text-xs text-slate-655 dark:text-slate-350 cursor-default">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <h3 className="font-extrabold text-slate-850 dark:text-white text-sm">
                  {isEditMode ? 'Modify Cleanup Job Settings' : 'Assign New Cleanup Schedule'}
                </h3>
                {!isEditMode && saveStatus && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8.5px] font-black uppercase tracking-wider animate-pulse">
                    {saveStatus}
                  </span>
                )}
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-650 text-xs font-black">✕</button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-bold text-left">
              {autoFillMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150/40 dark:border-emerald-900/50 rounded-xl text-emerald-650 dark:text-emerald-400 text-[10px] font-extrabold flex items-center space-x-2 animate-pulse">
                  <span>✨</span>
                  <span>{autoFillMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={() => setFocusedField('services')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 250)}
                    placeholder="e.g. Sofa Foam Scrubbing"
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                  {renderSuggestions('services', title, setTitle)}
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
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Assign Crew Worker</span>
                    {isAnalyzingRecs && (
                      <span className="text-[8px] text-secondary font-black animate-pulse uppercase">Analyzing suitability...</span>
                    )}
                  </label>
                  
                  {/* Custom Searchable Dropdown */}
                  <div className="relative">
                    <div
                      onClick={() => setRecDropdownOpen(!recDropdownOpen)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary cursor-pointer flex items-center justify-between text-slate-800 dark:text-slate-100"
                    >
                      {workerId ? (
                        (() => {
                          if (workerId === 'unassigned') {
                            return <span className="text-slate-500 font-bold uppercase text-[10px]">Unassigned (Omit Crew Assignment)</span>;
                          }
                          const match = recommendations.find((w: any) => w._id === workerId) || workers.find((w: any) => w._id === workerId);
                          if (!match) return <span>-- Choose Worker --</span>;
                          return (
                            <div className="flex items-center space-x-2">
                              {match.photo ? (
                                <img src={match.photo} className="h-5 w-5 rounded-full object-cover border border-slate-200" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-[9px]">
                                  {match.name ? match.name.charAt(0).toUpperCase() : 'W'}
                                </div>
                              )}
                              <span className="font-extrabold">{match.name}</span>
                              {match.matchScore > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-black">{match.matchScore}% Match</span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-slate-400">-- Choose Worker --</span>
                      )}
                      <span className="text-slate-400">▼</span>
                    </div>

                    {recDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-3 space-y-3 max-h-80 overflow-y-auto text-xs animate-fade-in">
                        {/* Search & Show All controls */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <input
                            type="text"
                            placeholder="Search worker by name..."
                            value={recSearchQuery}
                            onChange={(e) => setRecSearchQuery(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg p-2 text-xs outline-none focus:border-secondary dark:text-white"
                          />
                          <label className="flex items-center space-x-1 cursor-pointer select-none text-[9px] uppercase tracking-wider text-slate-400 font-extrabold whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={showAllWorkers}
                              onChange={(e) => setShowAllWorkers(e.target.checked)}
                              className="rounded border-slate-300 text-secondary focus:ring-secondary h-3 w-3 cursor-pointer"
                            />
                            <span>Show All</span>
                          </label>
                        </div>

                        {/* List items */}
                        <div className="space-y-1.5 text-left">
                          <div
                            onClick={() => {
                              setWorkerId('unassigned');
                              setRecDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 flex items-center justify-between transition-all ${
                              workerId === 'unassigned' ? 'bg-secondary/5 border-l-2 border-l-secondary' : ''
                            }`}
                          >
                            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Unassigned (Omit Crew Assignment)</span>
                          </div>

                          {(() => {
                            const filteredRecs = recommendations.filter((w: any) => {
                              // Filter by search query
                              if (recSearchQuery && !w.name.toLowerCase().includes(recSearchQuery.toLowerCase())) {
                                return false;
                              }
                              // Filter by availability unless showAllWorkers is active
                              if (!showAllWorkers && w.status !== 'Available') {
                                return false;
                              }
                              return true;
                            });

                            if (filteredRecs.length === 0) {
                              return (
                                <p className="text-slate-400 text-center py-2 text-[10px]">No workers match search criteria.</p>
                              );
                            }

                            // Keep track of Available index for medals
                            let availableIndex = 0;

                            return filteredRecs.map((w: any) => {
                              // Medals order for top Available workers
                              let medal = '';
                              if (w.status === 'Available') {
                                if (availableIndex === 0) medal = '🥇';
                                else if (availableIndex === 1) medal = '🥈';
                                else if (availableIndex === 2) medal = '🥉';
                                availableIndex++;
                              }
                              
                              let statusColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400';
                              if (w.status === 'Busy') statusColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400';
                              if (w.status === 'On Leave') statusColor = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
                              if (w.status === 'Offline') statusColor = 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400';

                              return (
                                <div
                                  key={w._id}
                                  onClick={() => {
                                    setWorkerId(w._id);
                                    setRecDropdownOpen(false);
                                  }}
                                  className={`p-2.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent transition-all flex items-center justify-between gap-3 ${
                                    workerId === w._id ? 'bg-secondary/5 border-slate-200 dark:border-slate-800' : ''
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    {w.photo ? (
                                      <img src={w.photo} className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-205 flex items-center justify-center font-black text-xs">
                                        {w.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="text-left">
                                      <div className="font-extrabold text-slate-805 dark:text-white flex items-center space-x-1 flex-wrap">
                                        <span>{medal} {w.name}</span>
                                        <span className="text-[8px] text-slate-400 font-bold lowercase">({w.company})</span>
                                      </div>
                                      
                                      {/* Travel / Proximity detail */}
                                      {w.status === 'Available' && w.distance !== null && (
                                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                                          🚗 {w.distance.toFixed(1)} KM Away | ETA {w.eta} mins
                                        </span>
                                      )}
                                      
                                      {/* Conflict/Leave details */}
                                      {w.status === 'Busy' && (
                                        <span className="text-[9px] text-rose-500 font-bold block mt-0.5 truncate max-w-[180px]">
                                          ⚠️ {w.conflictDetails}
                                        </span>
                                      )}

                                      <span className="text-[8px] text-slate-400 block font-semibold mt-0.5">Today's Jobs: {w.workload}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end space-y-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${statusColor}`}>
                                      {w.status}
                                    </span>
                                    {w.status === 'Available' && (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
                                        ⭐ {w.matchScore}% Match
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Warning banner when no worker is available */}
                  {!isAnalyzingRecs && date && startTime && endTime && recommendations.filter((w: any) => w.status === 'Available').length === 0 && (
                    <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-150/40 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-450 text-[10px] font-semibold flex flex-col space-y-1 text-left">
                      <span className="font-extrabold flex items-center space-x-1 text-slate-800 dark:text-slate-100">
                        <span>⚠️</span>
                        <span>No nearby worker is available for the selected date and time.</span>
                      </span>
                      {alternativeSuggestion && (
                        <span className="text-[9px] text-rose-500">{alternativeSuggestion}</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-405 mb-1.5">Price (₹)</label>
                  <input type="number" required min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter job price" className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Client Name</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    onFocus={() => setFocusedField('names')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 250)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                  {renderSuggestions('names', clientName, setClientName)}
                </div>
                <div className="relative">
                  <label className="block text-[9px] uppercase tracking-wider text-slate-405 mb-1.5">Client Phone</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    onFocus={() => setFocusedField('phones')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 250)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                  {renderSuggestions('phones', clientPhone, setClientPhone)}
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

              <div className="relative">
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">Service Description Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setFocusedField('descriptions')}
                  onBlur={() => setTimeout(() => setFocusedField(null), 250)}
                  placeholder="Enter details..."
                  className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 h-16 outline-none focus:border-secondary resize-none"
                />
                {renderSuggestions('descriptions', description, setDescription)}
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1">Geocoding & GPS Location Data</span>
                <div className="relative">
                  <label className="block text-[9px] uppercase tracking-wider text-slate-450 mb-1">Clean Site Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onFocus={() => setFocusedField('addresses')}
                    onBlur={() => {
                      handleAddressBlur();
                      setTimeout(() => setFocusedField(null), 250);
                    }}
                    placeholder="Enter full physical address"
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                  {renderSuggestions('addresses', address, setAddress)}
                </div>

                <div className="relative">
                  <label className="block text-[9px] uppercase tracking-wider text-slate-455 mb-1">GPS Location Link / Landmark</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    onFocus={() => setFocusedField('locations')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 250)}
                    placeholder="Landmark or Google Map URL link"
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 outline-none focus:border-secondary"
                  />
                  {renderSuggestions('locations', locationName, setLocationName)}
                </div>
              </div>



              <button
                type="submit"
                disabled={savingJob}
                className="w-full bg-secondary hover:bg-secondary-dark disabled:opacity-50 text-white font-extrabold p-3 rounded-xl transition-all cursor-pointer shadow-md"
              >
                {savingJob ? 'Saving Booking...' : isEditMode ? 'Apply Modified Settings' : 'Create & Assign Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {mapPickerOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-sm uppercase tracking-wider">
                Select {activeMapField === 'from' ? 'Commute Start' : 'Destination'} Location
              </h3>
              <button onClick={() => setMapPickerOpen(false)} className="text-slate-400 hover:text-slate-655 text-xs font-black">✕</button>
            </div>

            <div className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto">
              {/* Search Box */}
              <div className="relative">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    placeholder="Search for address, area, or landmark..."
                    className="flex-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMapSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleMapSearch}
                    className="bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center space-x-1 shadow-md"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </button>
                </div>

                {/* Search Results Dropdown */}
                {mapSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[1000] max-h-48 overflow-y-auto text-left font-semibold">
                    {mapSearchResults.map((result, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-900/40 last:border-0 text-left block cursor-pointer transition-colors"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Container */}
              <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-80 w-full shadow-inner bg-slate-50 dark:bg-slate-950/30">
                <div id="picker-map-container" className="h-full w-full z-10" />
                <span className="absolute bottom-2 left-2 z-20 bg-slate-950/70 text-white text-[8px] font-bold px-2 py-1 rounded">
                  💡 Hint: Drag marker or click map to choose location
                </span>
              </div>

              {/* Selected Location Address display */}
              <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-150 dark:border-slate-800/60 p-3.5 rounded-2xl text-left">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Selected Address</span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-normal block">
                  {mapSelectedAddress || 'No location selected yet. Type search or click map.'}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setMapPickerOpen(false)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!mapSelectedAddress}
                onClick={handleConfirmLocation}
                className="px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition-all"
              >
                Confirm Location
              </button>
            </div>
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
                  <div className="relative group w-full flex flex-col items-center">
                    <img src={selectedJobPhotos.beforePhoto} alt="Before" className="rounded-xl object-contain max-h-80 border shadow-md w-full" />
                    <button
                      onClick={() => handleDownloadImage(selectedJobPhotos.beforePhoto, `before_${selectedJobPhotos._id}.jpg`)}
                      className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow transition-all cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </div>
                ) : (
                  <div className="h-64 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-bold w-full bg-slate-50 dark:bg-slate-950/20">No Before Photo Uploaded</div>
                )}
              </div>
              
              {/* After snapshot */}
              <div className="space-y-3 flex flex-col items-center">
                <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">After Cleanup Completed</span>
                {selectedJobPhotos.afterPhotos && selectedJobPhotos.afterPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 w-full max-h-80 overflow-y-auto">
                    {selectedJobPhotos.afterPhotos.map((url: string, idx: number) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                        <img src={url} alt={`After Clean ${idx + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-slate-955/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">Photo {idx + 1}</span>
                        <button
                          onClick={() => handleDownloadImage(url, `after_${selectedJobPhotos._id}_${idx + 1}.jpg`)}
                          className="absolute bottom-1 right-1 bg-slate-900/80 hover:bg-slate-900 backdrop-blur text-white p-1 rounded-lg shadow transition-all cursor-pointer"
                          title="Download photo"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : selectedJobPhotos.afterPhoto ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <img src={selectedJobPhotos.afterPhoto} alt="After" className="rounded-xl object-contain max-h-80 border shadow-md w-full" />
                    <button
                      onClick={() => handleDownloadImage(selectedJobPhotos.afterPhoto, `after_${selectedJobPhotos._id}.jpg`)}
                      className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow transition-all cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </div>
                ) : (
                  <div className="h-64 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-bold w-full bg-slate-50 dark:bg-slate-955/20">No After Photo Uploaded</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Admin Complete Job Confirmation Popup Modal */}
      {adminCompleteModalOpen && adminCompleteJobData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <span>✅</span>
                  <span>Complete Job (Admin Override)</span>
                </h4>
                <p className="text-[10px] text-slate-400">Manually resolve and record cleanup job completion details.</p>
              </div>
              <button
                onClick={() => setAdminCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-3.5 text-left text-xs font-bold text-slate-700 dark:text-slate-355">
              {/* Job Details Card */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-955/30 border border-slate-150 dark:border-slate-800/80 p-3.5 rounded-2xl">
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Job ID</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.visitId || adminCompleteJobData._id?.slice(-12).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Worker Name</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.workerId?.name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Customer Name</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.clientName}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Company</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.company}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Service Name</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.title}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Assigned Date</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.date}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Start Time</span>
                  <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                    {adminCompleteJobData.startedAt
                      ? new Date(adminCompleteJobData.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : adminCompleteJobData.timeSlot?.split(' - ')[0] || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Current Status</span>
                  <span className="text-[10.5px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase mt-0.5 block">
                    {adminCompleteJobData.status}
                  </span>
                </div>
              </div>

              {/* Completion Metadata (Auto-Generated Details for User Preview) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Completion Date</span>
                  <input
                    type="text"
                    disabled
                    value={new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                    className="w-full text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-extrabold text-slate-500 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Completion Time</span>
                  <input
                    type="text"
                    disabled
                    value={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    className="w-full text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-extrabold text-slate-500 mt-1 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Completion Reason</label>
                  <select
                    value={adminCompleteReason}
                    onChange={(e) => setAdminCompleteReason(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold mt-1 outline-none focus:border-secondary"
                  >
                    <option value="Network Issue">Network Issue</option>
                    <option value="No Network">No Network</option>
                    <option value="App Crash">App Crash</option>
                    <option value="Battery Dead">Battery Dead</option>
                    <option value="Phone Issue">Phone Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider font-extrabold">Remarks / Notes</label>
                  <textarea
                    value={adminCompleteRemarks}
                    onChange={(e) => setAdminCompleteRemarks(e.target.value)}
                    placeholder="Enter additional remarks or reasons for completion..."
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 font-semibold mt-1 outline-none h-16 resize-none focus:border-secondary"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-slate-55 dark:bg-slate-955/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50 mt-1 cursor-pointer select-none" onClick={() => setAdminCompleteWorkerConfirmed(!adminCompleteWorkerConfirmed)}>
                  <input
                    type="checkbox"
                    checked={adminCompleteWorkerConfirmed}
                    onChange={(e) => setAdminCompleteWorkerConfirmed(e.target.checked)}
                    className="h-3.5 w-3.5 text-secondary border-slate-300 rounded focus:ring-secondary cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-black">
                    Worker confirmed the job was completed.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setAdminCompleteModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 font-extrabold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminCompleteJob}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition-all"
              >
                Complete Job
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminJobs;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import {
  Camera,
  CheckCircle,
  Clock,
  MapPin,
  Play,
  ArrowLeft,
  Navigation,
  Info,
  ShieldAlert,
  ClipboardList,
  Edit,
  Save,
  CheckCircle2,
  X
} from 'lucide-react';

const WorkerJobs: React.FC = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'started' | 'completed'>('all');

  // Interactive cleanup sheet modal state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Shutter control
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraType, setCameraType] = useState<'before' | 'after'>('before');

  // Temporary snaps inside form
  const [tempBeforePhoto, setTempBeforePhoto] = useState<string | null>(null);
  const [tempAfterPhoto, setTempAfterPhoto] = useState<string | null>(null);
  const [tempKms, setTempKms] = useState('5');
  const [tempNotes, setTempNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

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
  }, []);

  const openWorkSheet = (job: any) => {
    setSelectedJob(job);
    setTempBeforePhoto(job.beforePhoto || null);
    setTempAfterPhoto(job.afterPhoto || null);
    setTempKms(job.fuelKmsTravelled?.toString() || '5');
    setTempNotes(job.workerNotes || '');
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
        setSelectedJob({ ...selectedJob, status: 'started', beforePhoto: dataUrl });
        fetchJobs();
      }).catch((err) => {
        alert(err.response?.data?.message || 'Failed to start job');
        setTempBeforePhoto(null);
      });
    } else {
      setTempAfterPhoto(dataUrl);
    }
  };

  const handleCompleteWorkSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!tempBeforePhoto) {
      alert('Before photo is mandatory');
      return;
    }
    if (!tempAfterPhoto) {
      alert('After photo is mandatory to complete job');
      return;
    }

    setSubmittingReport(true);
    try {
      // Get device GPS location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          await api.put(`/jobs/${selectedJob._id}/complete`, {
            afterPhotoDataUrl: tempAfterPhoto,
            location: coords,
            manualFuelKms: Number(tempKms),
            workerNotes: tempNotes
          });

          alert('Cleanup sheet submitted successfully! Job marked as completed.');
          setSelectedJob(null);
          fetchJobs();
        },
        async (error) => {
          console.warn('Geolocation failed. Completing job with default coordinates.', error);
          await api.put(`/jobs/${selectedJob._id}/complete`, {
            afterPhotoDataUrl: tempAfterPhoto,
            location: { lat: 0, lng: 0 },
            manualFuelKms: Number(tempKms),
            workerNotes: tempNotes
          });
          alert('Cleanup sheet submitted successfully! Job marked as completed.');
          setSelectedJob(null);
          fetchJobs();
        }
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification complete update failed');
    } finally {
      setSubmittingReport(false);
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
    if (activeFilter === 'all') return true;
    return job.status === activeFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden relative">
      
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-amber-400/10 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/10 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4 z-10 relative">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/worker')}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">My Cleanups</span>
        </div>
      </header>

      {/* Main Grid Container */}
      <main className="p-6 max-w-7xl mx-auto space-y-6 z-10 relative">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Columns: Tabs and jobs list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 rounded-xl bg-slate-200/50 dark:bg-slate-900/50 p-1 border border-slate-200/20">
              {['all', 'pending', 'started', 'completed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter as any)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === filter
                      ? 'bg-gradient-to-r from-secondary to-blue-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Jobs Card List */}
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div key={n} className="animate-shimmer h-32 w-full rounded-custom" />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
                  No cleaning jobs found under this status.
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div
                    key={job._id}
                    onClick={() => openWorkSheet(job)}
                    className="glass-card p-5 border border-slate-100 dark:border-slate-850 hover:scale-[1.01] transition-transform space-y-4 cursor-pointer hover:border-amber-500/25"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full uppercase">
                          {job.company}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${
                          job.status === 'completed' ? 'text-success' :
                          job.status === 'started' ? 'text-secondary' :
                          job.status === 'cancelled' ? 'text-danger' :
                          'text-warning'
                        }`}>
                          {job.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{job.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">📍 {job.address}</p>
                    </div>

                    <div className="text-[10px] text-slate-450 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <span>👤 Client: {job.clientName}</span>
                      <span className="text-secondary font-bold hover:underline">Open Work Sheet →</span>
                    </div>
                  </div>
                ))
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-850 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Job Work Sheet</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{selectedJob.title}</h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-650 rounded-full p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCompleteWorkSheetSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Job Details Card */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150/40 dark:border-slate-850/40 space-y-2">
                <div>📍 Address: <span className="font-semibold text-slate-700 dark:text-slate-250">{selectedJob.address}</span></div>
                <div>👤 Client: <span className="font-semibold text-slate-700 dark:text-slate-250">{selectedJob.clientName} ({selectedJob.clientPhone})</span></div>
                {selectedJob.description && <div>📝 Client Instructions: <span className="text-slate-455">{selectedJob.description}</span></div>}
              </div>

              {/* Photos Slots side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Before Photo Box */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Before Photo</span>
                  {tempBeforePhoto ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow">
                      <img src={tempBeforePhoto} alt="Before snap" className="w-full h-full object-cover" />
                      {selectedJob.status === 'pending' && (
                        <button
                          type="button"
                          onClick={triggerBeforeCapture}
                          className="absolute bottom-2 right-2 rounded-full bg-violet-600 text-white p-1.5 shadow"
                        >
                          <Camera className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerBeforeCapture}
                      className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-950 flex flex-col items-center justify-center space-y-1"
                    >
                      <Camera className="h-5 w-5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Snap Arrival Photo</span>
                    </button>
                  )}
                </div>

                {/* After Photo Box */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">After Photo</span>
                  {tempAfterPhoto ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow">
                      <img src={tempAfterPhoto} alt="After snap" className="w-full h-full object-cover" />
                      {selectedJob.status === 'started' && (
                        <button
                          type="button"
                          onClick={triggerAfterCapture}
                          className="absolute bottom-2 right-2 rounded-full bg-violet-600 text-white p-1.5 shadow"
                        >
                          <Camera className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!tempBeforePhoto || selectedJob.status === 'completed'}
                      onClick={triggerAfterCapture}
                      className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-950 flex flex-col items-center justify-center space-y-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-5 w-5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Snap Clean Photo</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Form Input fields (Visible only when in started/pending state for modifications) */}
              {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' ? (
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  
                  {/* Fuel distance input */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Fuel KMs Travelled</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={tempKms}
                      disabled={!tempBeforePhoto}
                      onChange={(e) => setTempKms(e.target.value)}
                      placeholder="KM travelled to site"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 p-3 outline-none focus:border-secondary disabled:opacity-40"
                    />
                  </div>

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
                    disabled={!tempBeforePhoto || !tempAfterPhoto || submittingReport}
                    className="w-full bg-gradient-to-r from-success to-emerald-600 text-white rounded-custom py-3.5 text-xs font-bold shadow transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submittingReport ? 'Submitting Work...' : 'Submit Completed Cleanup'}
                  </button>

                </div>
              ) : (
                // View Mode for completed/cancelled jobs
                <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-850 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Fuel Allowance Distance:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{selectedJob.fuelKmsTravelled} KM (+₹{selectedJob.fuelAllowance})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Cleanup Notes:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 max-w-[250px] text-right">{selectedJob.workerNotes || 'No notes logged'}</span>
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

    </div>
  );

  // Helper helper to set edit notes without declaring state if we want to save space
  function setEditNotesState(val: string) {
    setTempNotes(val);
  }
};

export default WorkerJobs;

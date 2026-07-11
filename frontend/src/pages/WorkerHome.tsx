import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import {
  Camera,
  Compass,
  DollarSign,
  MapPin,
  Sparkles,
  Phone
} from 'lucide-react';


const ActiveJobTimer: React.FC<{ startedAt?: string | Date }> = ({ startedAt }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const startTime = new Date(startedAt).getTime();
    
    const update = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const format = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <span className="font-mono font-black text-amber-500 text-sm animate-pulse">
      ⏱️ {format(seconds)}
    </span>
  );
};

const WorkerHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [salaryToday, setSalaryToday] = useState<number>(0);
  const [jobsSummary, setJobsSummary] = useState({ pending: 0, completed: 0, active: null as any });
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraType, setCameraType] = useState<'attendance' | 'before' | 'after'>('attendance');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [attRes, salRes, jobsRes] = await Promise.all([
        api.get(`/attendance/worker/${user.id}`),
        api.get(`/salary/dashboard?workerId=${user.id}`),
        api.get('/jobs')
      ]);

      const attToday = attRes.data;
      const todayAtt = attToday.find((a: any) => a.date === todayStr);
      setAttendanceToday(todayAtt);
      setAttendanceHistory(attToday);

      setSalaryToday(salRes.data.earnings.todayEarnings);

      const jobs = jobsRes.data;
      const pendingJobs = jobs.filter((j: any) => j.status === 'pending' || j.status === 'accepted');
      const completedJobs = jobs.filter((j: any) => j.status === 'completed');
      const activeJob = jobs.find((j: any) => j.status === 'started');

      setJobsSummary({
        pending: pendingJobs.length,
        completed: completedJobs.length,
        active: activeJob || null
      });
    } catch (error) {
      console.error('Error fetching worker dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'NEW_JOB' || customEvent.detail?.type === 'TRAVEL_LOG_APPROVED') {
        fetchData();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [user]);

  const handleCameraCapture = async (dataUrl: any, coords: { lat: number; lng: number }) => {
    setCameraActive(false);
    const deviceInfo = `${navigator.userAgent} (${navigator.platform})`;

    try {
      if (cameraType === 'attendance') {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        let lateReason = '';

        if (hour > 9 || (hour === 9 && minute > 15)) {
          const reasonInput = prompt('Aap late hain. Kripya late aane ka karan (Reason) batayein:');
          if (reasonInput === null) {
            return; // Worker cancelled
          }
          if (!reasonInput.trim()) {
            alert('Late aane ka reason dena anivaryah hai.');
            return;
          }
          lateReason = reasonInput.trim();
        }

        const res = await api.post('/attendance/checkin', {
          selfieDataUrl: dataUrl,
          location: coords,
          deviceInfo,
          lateReason
        });
        setAttendanceToday(res.data.attendance);
        alert('Attendance marked successfully!');
      } else if (cameraType === 'before' && selectedJobId) {
        await api.put(`/jobs/${selectedJobId}/start`, {
          beforePhotoDataUrl: dataUrl,
          location: coords
        });
        alert('Job started successfully! Do work.');
      } else if (cameraType === 'after' && selectedJobId) {
        await api.put(`/jobs/${selectedJobId}/complete`, {
          afterPhotoDataUrls: dataUrl, // list of 5 photos
          location: coords
        });
        alert('Job completed successfully! Admin notified.');
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification capture failed');
    }
  };



  const triggerAttendanceCamera = () => {
    setCameraType('attendance');
    setSelectedJobId(null);
    setCameraActive(true);
  };

  const triggerAfterJobCamera = (jobId: string) => {
    setCameraType('after');
    setSelectedJobId(jobId);
    setCameraActive(true);
  };

  if (!user) return null;

  return (
    <div className="relative pb-20 max-w-full">
        {/* Main Container */}
        <main className="relative px-4 md:px-6 lg:px-8 py-6 pt-24 max-w-7xl mx-auto space-y-6 z-10">

        {/* Welcome Banner */}
        <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
              <span>Welcome, {user.name.split(' ')[0]}</span>
              <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">Let's check in and check off today's assigned cleans.</p>
          </div>

          <div
            onClick={() => navigate('/worker/profile')}
            className="flex items-center space-x-3 cursor-pointer group"
            title="Open Profile Settings"
          >
            <img
              src={user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
              alt={user.name}
              className="h-12 w-12 rounded-full object-cover border-2 border-violet-500 shadow-md group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block">
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-500 transition-colors">My Profile</span>
              <span className="block text-[10px] text-slate-400">Settings</span>
            </div>
          </div>
        </div>

        {/* RESPONSIVE LAYOUT COLS GRID */}
        <div className="space-y-6">
          
          {/* Row 1: Active Cleanup Tracker */}
          <div className="grid grid-cols-1 gap-6 items-stretch">
            {/* Active Cleanup with visual step mapping */}
            <div className="glass-card p-6 border-t-4 border-t-amber-500 shadow-xl flex flex-col justify-between h-full space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest">Active Cleanup Tracker</h3>
                <Link to="/worker/jobs" className="text-xs font-bold text-secondary hover:underline">
                  Browse All Jobs →
                </Link>
              </div>

              {jobsSummary.active ? (
                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  <div className="bg-slate-55 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-150/40 dark:border-slate-855/40 flex justify-between items-start gap-4 text-left">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 rounded-full uppercase mb-2">
                        {jobsSummary.active.company}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 dark:text-white truncate">{jobsSummary.active.title}</h4>
                      <p className="text-xs text-slate-405 mt-1 truncate">📍 {jobsSummary.active.address}</p>
                      <p className="text-xs text-slate-405 mt-1">
                        👤 Client: {jobsSummary.active.clientName} (
                        <a
                          href={`tel:${jobsSummary.active.clientPhone}`}
                          className="text-secondary hover:underline font-bold inline-flex items-center space-x-0.5"
                        >
                          <Phone className="h-3 w-3 inline" />
                          <span>{jobsSummary.active.clientPhone}</span>
                        </a>
                        )
                      </p>
                    </div>
                  </div>
                  {jobsSummary.active.price !== undefined && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
                        <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Collect from Client:</span>
                        <span className="font-black text-emerald-500 dark:text-emerald-450 text-sm">₹{jobsSummary.active.price}</span>
                      </div>
                  )}

                  {/* Separate section for live elapsed time taken */}
                  {jobsSummary.active.startedAt && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-150/40 dark:border-slate-855/40 text-left flex justify-between items-center mt-2.5">
                      <div className="space-y-0.5">
                        <span className="block text-[8px] font-black text-violet-500 uppercase tracking-widest">
                          ⏱️ Elapsed Work Duration
                        </span>
                        <span className="text-[10px] text-slate-450">Active clean time counter:</span>
                      </div>
                      <ActiveJobTimer startedAt={jobsSummary.active.startedAt} />
                    </div>
                  )}

                  {/* Visual Tracker map */}
                  <div className="relative flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                    <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-855" />
                    <div className="absolute left-10 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500" style={{ right: '50%' }} />

                    <div className="flex flex-col items-center z-10">
                      <div className="h-6.5 w-6.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow">✓</div>
                      <span className="text-[9px] font-semibold text-slate-450 mt-1">Before photo</span>
                    </div>
                    <div className="flex flex-col items-center z-10">
                      <div className="h-6.5 w-6.5 rounded-full bg-white dark:bg-slate-800 border-2 border-amber-500 text-amber-505 flex items-center justify-center text-[10px] font-bold shadow">2</div>
                      <span className="text-[9px] font-semibold text-slate-450 mt-1">Working</span>
                    </div>
                    <div className="flex flex-col items-center z-10">
                      <div className="h-6.5 w-6.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center text-[10px] font-bold shadow">3</div>
                      <span className="text-[9px] font-semibold text-slate-455 mt-1">After photo</span>
                    </div>
                  </div>

                  {/* Navigation & shutter buttons */}
                  <div className="flex space-x-4">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobsSummary.active.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-custom border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 py-3.5 text-xs font-bold transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                      <span>Directions</span>
                    </a>

                    <button
                      onClick={() => triggerAfterJobCamera(jobsSummary.active._id)}
                      className="flex-1 btn-blue-gradient flex items-center justify-center space-x-1.5 rounded-custom py-3.5 text-xs font-bold shadow-sm"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Complete Clean</span>
                    </button>
                  </div>
                </div>
              ) : jobsSummary.pending > 0 ? (
                <div className="text-center py-6 space-y-4 flex-1 flex flex-col justify-center">
                  <p className="text-xs text-slate-400">
                    You have {jobsSummary.pending} pending cleanups. Get started on the first clean.
                  </p>
                  <button
                    onClick={() => navigate('/worker/jobs')}
                    className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3.5 text-xs font-bold"
                  >
                    <span>Browse Pending Jobs</span>
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-455 py-8 flex-1 flex items-center justify-center">
                  🎉 No cleans scheduled currently. Enjoy your day!
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Earnings card & Navigation Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Earnings stats widget */}
            <div className="glass-card p-6 relative overflow-hidden border-t-4 border-t-teal-500 shadow-xl md:col-span-1">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 h-20 w-20 rounded-full bg-teal-500/10 blur-lg" />
              <span className="block text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-2 flex items-center space-x-1.5">
                <DollarSign className="h-4 w-4 text-teal-500" />
                <span>Earnings Today</span>
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                  ₹{salaryToday}
                </span>
                <span className="text-xs font-semibold text-slate-400">INR</span>
              </div>
              <span className="block text-[10px] text-slate-405 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                Aggregated daily wages + fuel payouts
              </span>
            </div>

            {/* Quick Action Shortcuts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:col-span-2">
              <Link to="/worker/jobs" className="glass-card p-6 flex flex-col justify-between hover:scale-[1.02] hover:border-amber-500/30 transition-all shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                    <Compass className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{jobsSummary.pending} pending</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">Cleanups</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Assigned jobs list</p>
                </div>
              </Link>

              <Link to="/worker/salary" className="glass-card p-6 flex flex-col justify-between hover:scale-[1.02] hover:border-emerald-500/30 transition-all shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Payslips</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">Salary & Advances</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Payroll records</p>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* Verification Overlay Camera */}
      {cameraActive && (
        <CameraCapture
          facingMode={cameraType === 'attendance' ? 'user' : 'environment'}
          multiCaptureCount={cameraType === 'after' ? 5 : 1}
          onCapture={handleCameraCapture}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* Floating clock-in button removed */}

    </div>
  );
};

export default WorkerHome;

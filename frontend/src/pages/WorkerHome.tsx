import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import {
  Camera,
  Calendar,
  Clock,
  Compass,
  DollarSign,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Sun,
  X,
  Sparkles,
  User as UserIcon,
  Phone,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const WorkerHome: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [salaryToday, setSalaryToday] = useState<number>(0);
  const [jobsSummary, setJobsSummary] = useState({ pending: 0, completed: 0, active: null as any });
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraType, setCameraType] = useState<'attendance' | 'before' | 'after'>('attendance');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      const pendingJobs = jobs.filter((j: any) => j.status === 'pending');
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

  const handleCameraCapture = async (dataUrl: string, coords: { lat: number; lng: number }) => {
    setCameraActive(false);
    const deviceInfo = `${navigator.userAgent} (${navigator.platform})`;

    try {
      if (cameraType === 'attendance') {
        const res = await api.post('/attendance/checkin', {
          selfieDataUrl: dataUrl,
          location: coords,
          deviceInfo
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
          afterPhotoDataUrl: dataUrl,
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
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 max-w-full">
      
      {/* Dynamic Background Mesh Color Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-violet-400/20 dark:bg-violet-600/10 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/20 dark:bg-teal-600/10 blur-[80px]" />
        <div className="absolute top-1/2 left-1/3 h-[200px] w-[200px] rounded-full bg-pink-400/15 dark:bg-pink-600/5 blur-[70px]" />
      </div>

      <header className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 box-border overflow-x-hidden transition-all duration-300 ${sidebarOpen ? 'left-64' : 'left-0'}`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-full p-1.5 text-slate-555 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight">ShineStaff</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-slate-505 hover:bg-slate-105 dark:hover:bg-slate-900 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          <button
            onClick={logout}
            className="rounded-full p-2 text-danger hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>

          <div className="rounded-full bg-gradient-to-r from-secondary to-blue-500 px-3 py-1 text-xs font-bold text-white shadow-sm uppercase tracking-wider">
            {user.company}
          </div>
        </div>
      </header>

      {/* Main Content Shift Wrapper */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'pl-64' : 'pl-0'}`}>
        {/* Main Container */}
        <main className="relative p-6 pt-24 max-w-7xl mx-auto space-y-6 z-10">
        
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
                  <div className="bg-slate-55 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-150/40 dark:border-slate-855/40">
                    <span className="inline-block text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 rounded-full uppercase mb-2">
                      {jobsSummary.active.company}
                    </span>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">{jobsSummary.active.title}</h4>
                    <p className="text-xs text-slate-405 mt-1">📍 {jobsSummary.active.address}</p>
                    <p className="text-xs text-slate-405 mt-1">👤 Client: {jobsSummary.active.clientName} ({jobsSummary.active.clientPhone})</p>
                  </div>

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
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobsSummary.active.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-custom border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 py-3.5 text-xs font-bold transition-colors"
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
      </div>

      {/* Navigation Drawer Sidebar (slide-shift style) */}
      <aside className={`fixed inset-y-0 left-0 z-[9999] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Profile Section inside Sidebar Drawer */}
        <div
          onClick={() => {
            navigate('/worker/profile');
            setSidebarOpen(false);
          }}
          className="flex items-center space-x-3 mt-8 pb-6 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl transition-colors"
          title="Click to view full profile details"
        >
          <img
            src={user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
            alt={user.name}
            className="h-12 w-12 rounded-full object-cover border-2 border-violet-500 shadow-md"
          />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1">
              <span>{user.name}</span>
              <Sparkles className="h-3 w-3 text-violet-500" />
            </h3>
            <span className="text-[10px] text-slate-405 block">ID: {user.id.substring(0, 8)}</span>
          </div>
        </div>

        <nav className="space-y-2 mt-6">
          <Link
            to="/worker"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom bg-secondary/10 dark:bg-secondary/20 px-4 py-3 text-sm font-semibold text-secondary"
          >
            <Clock className="h-5 w-5 text-secondary" />
            <span>Home Dashboard</span>
          </Link>
          <Link
            to="/worker/jobs"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-150/60 dark:hover:bg-slate-800/40 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-400"
          >
            <Compass className="h-5 w-5 text-amber-500" />
            <span>Job Assignments</span>
          </Link>
          <Link
            to="/worker/salary"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-150/60 dark:hover:bg-slate-800/40 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-400"
          >
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <span>Salary & Payouts</span>
          </Link>
          <Link
            to="/worker/attendance"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-100/60 dark:hover:bg-slate-800/30 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-400"
          >
            <Calendar className="h-5 w-5 text-emerald-500" />
            <span>My Attendance</span>
          </Link>
          <Link
            to="/worker/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-150/60 dark:hover:bg-slate-800/40 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-400"
          >
            <UserIcon className="h-5 w-5 text-violet-500" />
            <span>My Profile</span>
          </Link>
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-805 pt-6">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center space-x-3 rounded-custom bg-danger/10 text-danger px-4 py-3 text-sm font-bold hover:bg-danger/15 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[9998] bg-slate-950/40" 
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Verification Overlay Camera */}
      {cameraActive && (
        <CameraCapture
          facingMode={cameraType === 'attendance' ? 'user' : 'environment'}
          onCapture={handleCameraCapture}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* Floating clock-in button removed */}

    </div>
  );
};

export default WorkerHome;

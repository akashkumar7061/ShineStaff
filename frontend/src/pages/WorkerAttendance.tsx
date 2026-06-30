import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import {
  Menu,
  X,
  Sun,
  Moon,
  Compass,
  DollarSign,
  User as UserIcon,
  LogOut,
  Calendar,
  Clock,
  Sparkles,
  UserCheck
} from 'lucide-react';

const WorkerAttendance: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchAttendanceData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await api.get(`/attendance/worker/${user.id}`);
      setAttendanceHistory(attRes.data);

      const todayAtt = attRes.data.find((a: any) => a.date === todayStr);
      setAttendanceToday(todayAtt);
    } catch (error) {
      console.error('Error fetching worker attendance register:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="relative h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden max-w-full">
      
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-20 left-10 h-[300px] w-[300px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/5 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[250px] w-[250px] rounded-full bg-teal-400/10 dark:bg-teal-600/5 blur-[80px]" />
      </div>

      <div className={`h-screen overflow-y-auto pb-20 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 w-full max-w-full flex items-center justify-between border-b border-slate-200/80 dark:border-slate-805 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4 box-border overflow-x-hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-full p-1.5 text-slate-555 hover:bg-slate-100 dark:hover:bg-slate-855 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight">ShineStaff</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <div className="rounded-full bg-gradient-to-r from-secondary to-blue-505 px-3 py-1 text-xs font-bold text-white shadow-sm uppercase tracking-wider">
              {user.company}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-full px-6 py-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Attendance Register</h2>
            <p className="text-xs text-slate-400 mt-1">Verify your daily present and late wage logs approved by admin</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="animate-shimmer h-24 w-full rounded-2xl" />
              <div className="animate-shimmer h-48 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Daily checkin card */}
              <div className="glass-card p-6 relative overflow-hidden border-t-4 border-t-emerald-500 shadow-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl" />
                <h3 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-4 flex items-center space-x-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  <span>Today's Status</span>
                </h3>
                
                {attendanceToday ? (
                  <div className="flex items-center justify-between bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/10">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-450 block">Attendance Recorded</span>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Clocked: {new Date(attendanceToday.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    <span className="rounded-full bg-success/15 px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-success">
                      {attendanceToday.status}
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                      Attendance not marked yet. Admin will log it manually.
                    </span>
                  </div>
                )}
              </div>

              {/* Attendance Register History */}
              <div className="glass-card p-6 border-t-4 border-t-indigo-500 shadow-xl">
                <h3 className="text-xs font-extrabold text-slate-455 uppercase tracking-widest mb-4 flex items-center space-x-1.5">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Attendance Logs Sheet</span>
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {attendanceHistory.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No attendance logs saved yet.</p>
                  ) : (
                    attendanceHistory.map((att: any) => (
                      <div key={att._id} className="flex justify-between items-center text-xs p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-805">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{att.date}</span>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Clocked: {new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                          att.status === 'present' ? 'bg-success/15 text-success' :
                          att.status === 'late' ? 'bg-warning/15 text-warning' :
                          'bg-slate-200 text-slate-500'
                        }`}>
                          {att.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Sidebar Navigation (slide-shift style) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-805 p-6 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
        >
          <X className="h-6 w-6" />
        </button>

        <div
          onClick={() => {
            navigate('/worker/profile');
            setSidebarOpen(false);
          }}
          className="flex items-center space-x-3 mt-8 pb-6 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl"
        >
          <img
            src={user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
            alt={user.name}
            className="h-12 w-12 rounded-full object-cover border-2 border-violet-500 shadow-md"
          />
          <div>
            <h3 className="text-sm font-bold text-slate-855 dark:text-slate-100 flex items-center space-x-1">
              <span>{user.name}</span>
              <Sparkles className="h-3 w-3 text-violet-500" />
            </h3>
            <span className="text-[10px] text-slate-405 block">ID: {user.id.substring(0, 8)}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 mt-6 overflow-y-auto">
          <Link
            to="/worker"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-100/60 dark:hover:bg-slate-800/30 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-450"
          >
            <Clock className="h-5 w-5 text-slate-400" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/worker/jobs"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-100/60 dark:hover:bg-slate-800/30 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-450"
          >
            <Compass className="h-5 w-5 text-amber-500" />
            <span>Cleanups</span>
          </Link>
          <Link
            to="/worker/attendance"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom bg-secondary/10 dark:bg-secondary/20 px-4 py-3 text-sm font-semibold text-secondary"
          >
            <Calendar className="h-5 w-5 text-emerald-505" />
            <span>My Attendance</span>
          </Link>
          <Link
            to="/worker/salary"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-100/60 dark:hover:bg-slate-800/30 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-450"
          >
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <span>Salary & Payouts</span>
          </Link>
          <Link
            to="/worker/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center space-x-3 rounded-custom hover:bg-slate-100/60 dark:hover:bg-slate-800/30 px-4 py-3 text-sm font-semibold text-slate-550 dark:text-slate-450"
          >
            <UserIcon className="h-5 w-5 text-violet-500" />
            <span>My Profile</span>
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 rounded-custom bg-danger/10 text-danger hover:bg-danger/15 px-4 py-3.5 text-xs font-bold mt-4"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Sign Out</span>
        </button>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setSidebarOpen(false)} />
      )}

    </div>
  );
};

export default WorkerAttendance;

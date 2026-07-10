import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { io as socketIO } from 'socket.io-client';
import { Sparkles, AlertTriangle, Volume2 } from 'lucide-react';
import api from './utils/api';

// Pages
import Login from './pages/Login';
import WorkerHome from './pages/WorkerHome';
import WorkerJobs from './pages/WorkerJobs';
import WorkerAttendance from './pages/WorkerAttendance';
import WorkerSalary from './pages/WorkerSalary';
import WorkerProfile from './pages/WorkerProfile';

import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminWorkers from './pages/AdminWorkers';
import AdminJobs from './pages/AdminJobs';
import AdminSalary from './pages/AdminSalary';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';

// New sidebar standalone pages
import AdminAttendanceLogs from './pages/AdminAttendanceLogs';
import AdminMapTracking from './pages/AdminMapTracking';
import AdminProfile from './pages/AdminProfile';
import AdminOvertime from './pages/AdminOvertime';
import AdminFuel from './pages/AdminFuel';

const queryClient = new QueryClient();

// Route Guard for logged in users
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole: 'admin' | 'worker' }> = ({
  children,
  allowedRole
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-350 border-t-secondary" />
          <p className="text-xs font-semibold text-slate-500 animate-pulse">Connecting to ShineStaff...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/worker'} replace />;
  }

  return <>{children}</>;
};

// Root Router Redirector
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-350 border-t-secondary" />
          <p className="text-xs font-semibold text-slate-500 animate-pulse">Connecting to ShineStaff...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'admin' ? '/admin' : '/worker'} replace />;
};

// Wrapper to attach the Admin Layout with company filter state
const AdminRouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState<'All' | 'SofaShine' | 'CleanCruisers'>('All');

  // Clone child elements to pass selectedCompany filter prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { companyFilter: selectedCompany });
    }
    return child;
  });

  return (
    <AdminLayout selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany}>
      {childrenWithProps}
    </AdminLayout>
  );
};

const SocketListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
  const [alarmJob, setAlarmJob] = useState<{ title: string; message: string; jobId: string; company?: string; job?: any } | null>(null);
  const audioRef = React.useRef<any>(null);
  const vibrateIntervalRef = React.useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', '');
    
    console.log('Connecting to Socket.io at:', socketUrl);
    const socket = socketIO(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', socket.id);
      socket.emit('subscribe', user.id);
    });

    socket.on('notification', (data: any) => {
      console.log('Received worker notification:', data);
      setToast({ message: data.message, visible: true });
      window.dispatchEvent(new CustomEvent('socket-update', { detail: data }));

      if (data.type === 'NEW_JOB') {
        setAlarmJob({
          title: data.jobTitle || 'New Cleanup Job',
          message: data.message,
          jobId: data.jobId,
          company: data.company,
          job: data.job
        });
      }

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('ShineStaff Update', { body: data.message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('ShineStaff Update', { body: data.message });
            }
          });
        }
      }
    });

    socket.on('adminNotification', (data: any) => {
      console.log('Received admin notification:', data);
      if (user.role === 'admin') {
        setToast({ message: data.message, visible: true });
        window.dispatchEvent(new CustomEvent('socket-update', { detail: data }));
        
        // Play admin notification sound
        const audio = new Audio('/alert.wav');
        audio.play().catch((err) => console.log('Admin alert autoplay blocked:', err));
      }
    });

    socket.on('workerLocationUpdate', (data: any) => {
      if (user.role === 'admin') {
        window.dispatchEvent(new CustomEvent('worker-location-update', { detail: data }));
      }
    });

    // Background Geolocation Tracking for workers
    let locationInterval: any = null;
    let socketLocationInterval: any = null;

    if (user.role === 'worker') {
      const updateLocation = () => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              try {
                await api.put(`/workers/${user.id}/location`, {
                  lat: latitude,
                  lng: longitude
                });
                console.log(`Worker DB live location updated: ${latitude}, ${longitude}`);
              } catch (err) {
                console.error('Failed to report live GPS coordinates:', err);
              }
            },
            (err) => {
              console.error('GPS Geolocation error:', err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      };

      // Run immediately on load
      updateLocation();

      // Track location database write every 30 seconds
      locationInterval = setInterval(updateLocation, 30000);

      // Emit high-frequency live GPS location over socket every 1 second
      socketLocationInterval = setInterval(() => {
        if ('geolocation' in navigator && socket) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              socket.emit('reportLocation', {
                workerId: user.id,
                lat: latitude,
                lng: longitude
              });
            },
            (err) => {
              console.error('Socket GPS error:', err.message);
            },
            { enableHighAccuracy: true, timeout: 950, maximumAge: 0 }
          );
        }
      }, 1000);
    }

    // Register Web Push Service Worker and subscribe
    const subscribeUserToPush = async (registration: ServiceWorkerRegistration) => {
      try {
        const publicVapidKey = 'BLL0kEmxeZDDOkzWOtmNCSsZR1eW-CTSue6BcqWgNTrhkeOsOinhAVyDbBfdw3ff9cLoD5rUGlZ-Qx_7CPQOBaI';
        
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        };

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe(subscribeOptions);
        }

        await api.post('/auth/subscribe-push', { subscription });
        console.log('Registered push subscription endpoint successfully.');
      } catch (err) {
        console.error('Failed to subscribe user to Web Push:', err);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              subscribeUserToPush(registration);
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  subscribeUserToPush(registration);
                }
              });
            }
          }
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

    return () => {
      socket.disconnect();
      if (locationInterval) {
        clearInterval(locationInterval);
      }
      if (socketLocationInterval) {
        clearInterval(socketLocationInterval);
      }
    };
  }, [user]);

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        window.location.href = event.data.url;
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    if (toast?.visible) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (alarmJob) {
      // 1. Play looping unique arpeggio alert chime
      const playUniqueSound = () => {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const playNote = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.4, start + 0.05); // volume
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration);
          };
          const now = ctx.currentTime;
          // E5, G#5, B5, E6 sweet chimes arpeggio sweep
          playNote(659.25, now, 0.4);
          playNote(830.61, now + 0.12, 0.4);
          playNote(987.77, now + 0.24, 0.6);
          playNote(1318.51, now + 0.36, 0.8);
        } catch (err) {
          console.log('Web Audio failed arpeggio:', err);
        }
      };

      playUniqueSound();
      const soundInterval = setInterval(playUniqueSound, 2500);
      audioRef.current = { pause: () => clearInterval(soundInterval) };

      // 2. Loop swiggy-style vibration pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200, 400]);
        vibrateIntervalRef.current = setInterval(() => {
          navigator.vibrate([400, 200, 400, 200, 400]);
        }, 2000);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = null;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
      }
    };
  }, [alarmJob]);

  return (
    <>
      {children}
      
      {/* MOBILE PUSH NOTIFICATION ALARM OVERLAY */}
      {alarmJob && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#182232] text-[#e2e8f0] rounded-3xl shadow-2xl p-5 space-y-4 border border-slate-800 animate-scale-up text-left">
            
            {/* Header: App icon, Title info, time, dropdown and large branch icon */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {/* Red circular app icon containing quick lightning bolt symbol */}
                <div className="h-9 w-9 rounded-full bg-red-650 flex items-center justify-center text-white font-black shadow-md shrink-0 text-sm">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <span className="font-bold text-slate-300">ShineStaff</span>
                    <span>•</span>
                    <span>Just Now</span>
                  </div>
                  <h4 className="text-xs font-black text-white mt-0.5 uppercase tracking-wide">
                    {alarmJob.job?.company || alarmJob.company || 'SHINESTAFF'}
                  </h4>
                </div>
              </div>

              {/* Large logo on the right (like the T-Series box in the image) */}
              <div className="h-10 w-10 bg-white rounded-xl p-1 flex items-center justify-center shadow-md shrink-0 border border-slate-700">
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
            </div>

            {/* Notification content title and text */}
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-white leading-tight">
                {alarmJob.title}
              </h3>
              <p className="text-[11px] text-slate-350 leading-normal">
                📍 {alarmJob.job?.address || 'N/A'} <br />
                👤 Client: {alarmJob.job?.clientName || 'Valued Client'} ({alarmJob.job?.clientPhone || 'N/A'})
              </p>
            </div>

            {/* Large thumbnail image in the middle (just like the image thumbnail) */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-955 aspect-[16/9] shadow-inner">
              <img src="/cleaning_banner.png" alt="Cleaning Preview" className="h-full w-full object-cover" />
              {/* Flashing priority tag */}
              <span className="absolute top-3 right-3 bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full shadow animate-pulse">
                🔥 High Priority
              </span>
            </div>

            {/* Action buttons at the bottom (Play, Turn Off, Watch Later style links) */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-[11px] font-bold px-1">
              <button
                onClick={() => {
                  setAlarmJob(null);
                  window.location.href = `/worker/jobs?startJobId=${alarmJob.jobId}&autoCamera=true`;
                }}
                className="text-emerald-400 hover:text-emerald-350 transition-colors uppercase tracking-wider cursor-pointer py-1"
              >
                ⚡ Start Job
              </button>

              <button
                onClick={() => {
                  setAlarmJob(null);
                  window.location.href = `/worker/jobs?startJobId=${alarmJob.jobId}`;
                }}
                className="text-slate-300 hover:text-white transition-colors uppercase tracking-wider cursor-pointer py-1"
              >
                🔍 View Details
              </button>

              <button
                onClick={() => setAlarmJob(null)}
                className="text-rose-450 hover:text-rose-400 transition-colors uppercase tracking-wider cursor-pointer py-1"
              >
                Mute Alert
              </button>
            </div>
            
          </div>
        </div>
      )}

      {toast?.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-sm px-4 pointer-events-none">
          <div className="glass-panel border border-secondary/35 dark:border-secondary/20 shadow-2xl p-4 rounded-2xl flex items-center space-x-3 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md pointer-events-auto">
            <div className="rounded-xl bg-gradient-to-tr from-secondary to-blue-500 p-2 text-white shadow-md">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest block">Real-time Alert</span>
              <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 leading-snug break-words">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 p-1 text-xs font-bold pointer-events-auto"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketListener>
            <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Worker Routes (Mobile-first portal) */}
              <Route
                path="/worker"
                element={
                  <ProtectedRoute allowedRole="worker">
                    <WorkerHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/worker/jobs"
                element={
                  <ProtectedRoute allowedRole="worker">
                    <WorkerJobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/worker/attendance"
                element={
                  <ProtectedRoute allowedRole="worker">
                    <WorkerAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/worker/salary"
                element={
                  <ProtectedRoute allowedRole="worker">
                    <WorkerSalary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/worker/profile"
                element={
                  <ProtectedRoute allowedRole="worker">
                    <WorkerProfile />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes (Desktop Management Panel) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminDashboard companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/attendance-logs"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminAttendanceLogs companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/map-tracking"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminMapTracking companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/overtime"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminOvertime companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/fuel"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminFuel companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/workers"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminWorkers companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/jobs"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminJobs companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/salary"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminRouteWrapper>
                      <AdminSalary companyFilter="All" />
                    </AdminRouteWrapper>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminLayout selectedCompany="All" setSelectedCompany={() => {}}>
                      <AdminReports />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminLayout selectedCompany="All" setSelectedCompany={() => {}}>
                      <AdminSettings />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminLayout selectedCompany="All" setSelectedCompany={() => {}}>
                      <AdminProfile />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* Default catch-all redirect */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
          </SocketListener>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

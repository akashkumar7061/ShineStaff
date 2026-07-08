import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { io as socketIO } from 'socket.io-client';
import { Sparkles } from 'lucide-react';
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

  return (
    <>
      {children}
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

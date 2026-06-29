import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Login from './pages/Login';
import WorkerHome from './pages/WorkerHome';
import WorkerJobs from './pages/WorkerJobs';
import WorkerLeaves from './pages/WorkerLeaves';
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-350 border-t-secondary" />
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-350 border-t-secondary" />
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

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
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
                path="/worker/leaves"
                element={
                  <ProtectedRoute allowedRole="worker">
                    <WorkerLeaves />
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
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

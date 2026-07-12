import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  FileSpreadsheet,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  Map,
  CheckCircle2,
  Clock,
  MapPin,
  History,
  Activity,
  MessageSquare,
  Plus,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  selectedCompany: 'All' | 'SofaShine' | 'CleanCruisers';
  setSelectedCompany: (company: 'All' | 'SofaShine' | 'CleanCruisers') => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  selectedCompany,
  setSelectedCompany
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Schedule', path: '/admin/jobs', icon: Briefcase },
    { name: 'All Bookings', path: '/admin/operations-hud', icon: FileSpreadsheet },
    { name: 'Staff', path: '/admin/workers', icon: Users },
    { name: 'Services', path: '/admin/attendance-logs', icon: SettingsIcon },
    { name: 'Customers', path: '/admin/salary', icon: Users },
    { name: 'Leads', path: '/admin/overtime', icon: Map },
    { name: 'Subscriptions', path: '/admin/fuel', icon: RefreshCw },
    { name: 'WhatsApp Inbox', path: '/admin/bi-dashboard', icon: MessageSquare },
    { name: 'GPS Map Tracking', path: '/admin/map-tracking', icon: MapPin },
    { name: 'Audit History', path: '/admin/audit-log', icon: History },
    { name: 'Company Settings', path: '/admin/settings', icon: SettingsIcon }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSchedulePage = location.pathname === '/admin/jobs';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-300 relative overflow-x-hidden max-w-full">
      
      {/* Background glowing blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-20 left-10 h-[300px] w-[300px] rounded-full bg-blue-500/10 dark:bg-blue-600/5 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[250px] w-[250px] rounded-full bg-violet-400/10 dark:bg-violet-600/5 blur-[80px]" />
      </div>

      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0f172a] border-r border-slate-800 p-5 space-y-6 select-none shrink-0 z-10 fixed inset-y-0 left-0 text-white">
        
        {/* Sidebar Header branding */}
        <div className="flex items-center space-x-2.5 px-2">
          <div className="rounded-xl bg-gradient-to-tr from-[#a855f7] to-[#3b82f6] p-2.5 text-white shadow-md shadow-blue-500/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-none">
              {selectedCompany === 'All' ? 'CleanCruisers' : selectedCompany}
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Admin Panel</span>
          </div>
        </div>

        {/* Menu Navigation list */}
        <nav className="space-y-1 overflow-y-auto flex-grow pr-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <React.Fragment key={item.name}>
                {/* Render Outline New Booking link right after Dashboard */}
                {index === 1 && (
                  <Link
                    to="/admin/jobs?new=true"
                    className="flex items-center space-x-3 rounded-xl border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 px-4 py-3 text-xs font-bold transition-all mx-0 my-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <span>New Booking</span>
                  </Link>
                )}

                <Link
                  to={item.path}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all relative overflow-hidden group ${
                    active
                      ? 'bg-[#2563eb] text-white font-extrabold shadow-lg shadow-blue-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <span>{item.name}</span>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-white" />}
                </Link>
              </React.Fragment>
            );
          })}

          {/* Sign Out Button nested right after Company Settings */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-xl bg-danger/10 text-danger hover:bg-danger/15 px-4 py-2.5 text-xs font-bold transition-colors mt-3"
          >
            <LogOut className="h-4 w-4 text-danger animate-pulse" />
            <span>Sign Out</span>
          </button>

          {/* Profile / Admin Area */}
          <div className="pt-4 border-t border-slate-800 px-2 mt-4 space-y-2 select-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Admin</span>
            <div className="text-[10px] text-slate-400 font-bold truncate">
              {user?.email || 'admin@cleancruisers.com'}
            </div>
          </div>
        </nav>
      </aside>

      {/* 2. Mobile sidebar drawer (slide-shift style) */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-[9999] w-64 bg-[#0f172a] border-r border-slate-800 p-6 flex flex-col overflow-y-auto space-y-6 transition-transform duration-300 text-white ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-2">
          <div className="rounded-xl bg-gradient-to-tr from-[#a855f7] to-[#3b82f6] p-2 text-white shadow-md">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-xs tracking-tight">
              {selectedCompany === 'All' ? 'CleanCruisers' : selectedCompany}
            </h1>
            <span className="text-[8px] text-slate-450 font-bold tracking-widest uppercase block mt-0.5">Admin Panel</span>
          </div>
        </div>

        <nav className="space-y-1 overflow-y-auto flex-grow pr-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <React.Fragment key={item.name}>
                {/* Render Outline New Booking link right after Dashboard */}
                {index === 1 && (
                  <Link
                    to="/admin/jobs?new=true"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center space-x-3 rounded-xl border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 px-4 py-3 text-xs font-bold transition-all mx-0 my-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <span>New Booking</span>
                  </Link>
                )}

                <Link
                  to={item.path}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all relative overflow-hidden group ${
                    active
                      ? 'bg-[#2563eb] text-white font-extrabold shadow-md scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4.5 w-4.5 transition-transform ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <span>{item.name}</span>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-white" />}
                </Link>
              </React.Fragment>
            );
          })}

          <button
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
            }}
            className="flex w-full items-center space-x-3 rounded-xl bg-danger/10 text-danger px-4 py-2.5 text-xs font-bold mt-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[9998] bg-slate-950/40" 
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <div className="flex-grow flex flex-col min-w-0 z-30 relative max-w-full lg:ml-64">
        
        {/* Top Navbar */}
        {!isSchedulePage && (
          <header className={`fixed top-0 right-0 z-40 flex items-center justify-between border-b border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 px-6 py-4 box-border overflow-x-hidden transition-all duration-300 lg:left-64 ${sidebarOpen ? 'left-64' : 'left-0'}`}>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden rounded-full p-1.5 text-slate-550 hover:bg-slate-105 dark:hover:bg-slate-800"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              {/* Multi-company filters */}
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 rounded-xl p-1.5 border border-slate-200/40 dark:border-slate-800/40">
                {['All', 'SofaShine', 'CleanCruisers'].map((comp) => (
                  <button
                    key={comp}
                    onClick={() => setSelectedCompany(comp as any)}
                    className={`rounded-lg px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      selectedCompany === comp
                        ? 'bg-gradient-to-r from-secondary to-blue-500 text-white shadow-sm font-extrabold'
                        : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick HUD controls */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 text-slate-555 hover:bg-slate-105 dark:hover:bg-slate-900 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Logout button visible on mobile/tablet */}
              <button
                onClick={handleLogout}
                className="lg:hidden rounded-full p-2 text-danger hover:bg-red-50 dark:hover:bg-red-955/30 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>

              <div
                onClick={() => navigate('/admin/profile')}
                className="flex items-center space-x-2.5 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <img
                  src={user?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'Admin'}`}
                  alt={user?.name}
                  className="h-8 w-8 rounded-full object-cover border border-slate-205 dark:border-slate-800"
                />
                <span className="hidden md:inline-block text-xs font-bold text-slate-700 dark:text-slate-250">
                  {user?.name || 'Admin'}
                </span>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-grow overflow-y-auto bg-slate-50/50 dark:bg-slate-955/50 transition-all duration-300 ${
          isSchedulePage ? 'pt-4 px-3 md:px-4' : 'px-4 sm:px-6 md:p-8 pt-24 md:pt-28'
        }`}>
          {children}
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;

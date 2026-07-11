import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Clock,
  Compass,
  DollarSign,
  Calendar,
  ClipboardList,
  User as UserIcon,
  Sparkles
} from 'lucide-react';

interface WorkerLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { name: 'Home Dashboard', path: '/worker', icon: Clock, color: 'text-secondary' },
  { name: 'Cleanups', path: '/worker/jobs', icon: Compass, color: 'text-amber-500' },
  { name: 'Leave Tracker', path: '/worker/leaves', icon: ClipboardList, color: 'text-rose-500' },
  { name: 'Salary & Payouts', path: '/worker/salary', icon: DollarSign, color: 'text-emerald-500' },
  { name: 'My Attendance', path: '/worker/attendance', icon: Calendar, color: 'text-teal-500' },
  { name: 'My Profile', path: '/worker/profile', icon: UserIcon, color: 'text-violet-500' }
];

const WorkerLayout: React.FC<WorkerLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 max-w-full">

      {/* Dynamic Background Mesh Color Blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-violet-400/20 dark:bg-violet-600/10 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/20 dark:bg-teal-600/10 blur-[80px]" />
        <div className="absolute top-1/2 left-1/3 h-[200px] w-[200px] rounded-full bg-pink-400/15 dark:bg-pink-600/5 blur-[70px]" />
      </div>

      <header className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 lg:px-8 py-4 box-border overflow-x-hidden transition-all duration-300 ${sidebarOpen ? 'left-64' : 'left-0'}`}>
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
            onClick={handleLogout}
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

      {/* Sidebar Drawer */}
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

        <nav className="space-y-2 mt-6 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 rounded-custom px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-secondary/10 dark:bg-secondary/20 text-secondary'
                    : 'hover:bg-slate-150/60 dark:hover:bg-slate-800/40 text-slate-550 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-secondary' : item.color}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-805 pt-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-custom bg-danger/10 text-danger hover:bg-danger/15 px-4 py-3 text-sm font-bold transition-colors"
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

      {/* Main Content Shift Wrapper */}
      <div className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'pl-64' : 'pl-0'}`}>
        {children}
      </div>
    </div>
  );
};

export default WorkerLayout;

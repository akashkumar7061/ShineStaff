import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
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
  Sparkles,
  QrCode,
  Copy,
  CheckCircle2
} from 'lucide-react';

interface WorkerLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { name: 'Home Dashboard', path: '/worker', icon: Clock, color: 'text-secondary' },
  { name: 'Cleanups', path: '/worker/jobs', icon: Compass, color: 'text-amber-500' },
  { name: 'Payment QR Code', path: '/worker/qr', icon: QrCode, color: 'text-emerald-500' },
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
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQR, setActiveQR] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchWorkerQR = () => {
    if (user?.company) {
      api.get(`/qr/company/${user.company}`)
        .then(res => setActiveQR(res.data))
        .catch(err => console.error('Failed to fetch company QR:', err));
    }
  };

  useEffect(() => {
    fetchWorkerQR();
  }, [user, qrModalOpen]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCopyUPI = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {/* TOP RIGHT PAYMENT QR CODE BUTTON */}
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-black text-white shadow-md hover:scale-105 transition-all cursor-pointer active:scale-95"
            title="Open Payment Collection QR"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden xs:inline">Payment QR</span>
          </button>

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

          <div className="hidden sm:block rounded-full bg-gradient-to-r from-secondary to-blue-500 px-3 py-1 text-xs font-bold text-white shadow-sm uppercase tracking-wider">
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

      {/* Main Content Wrapper */}
      <div className="relative z-10 transition-all duration-300 px-4 sm:px-6">
        {children}
      </div>

      {/* QUICK HEADER PAYMENT QR MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500/50 text-center space-y-4">
            
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {activeQR && activeQR.qrImage ? (
              <>
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                    ⭐ Primary Payment QR Code
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{user.company} Official QR</h3>
                </div>

                <div className="p-3 bg-white rounded-2xl inline-block border-4 border-emerald-500/30 shadow-inner">
                  <img
                    src={activeQR.qrImage}
                    alt={activeQR.name || 'Payment QR'}
                    className="h-52 w-52 object-contain mx-auto"
                  />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 font-medium">Account Holder: <span className="font-extrabold text-white">{activeQR.accountHolder}</span></div>
                  
                  <div className="flex items-center justify-center space-x-2 bg-slate-800/80 py-2 px-3 rounded-xl max-w-xs mx-auto border border-slate-700">
                    <span className="font-mono text-emerald-400 font-extrabold text-xs">{activeQR.upiId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUPI(activeQR.upiId)}
                      className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-600 cursor-pointer inline-flex items-center space-x-1"
                    >
                      {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 font-semibold">{activeQR.bankName || 'Punjab National Bank (PNB)'}</div>
                </div>

                <p className="text-[10px] text-slate-300 font-medium leading-tight bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  📲 Customer ko Google Pay, PhonePe, Paytm ya BHIM app se scan karke payment karne bole.
                </p>
              </>
            ) : (
              <div className="py-8 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">No Active QR Configured</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Admin has not set up any default primary QR Code yet. Please contact Admin to configure one.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs shadow transition-all active:scale-95 cursor-pointer"
            >
              Close QR Screen
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default WorkerLayout;

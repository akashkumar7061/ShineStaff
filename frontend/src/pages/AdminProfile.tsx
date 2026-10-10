import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import QRManagementPanel from '../components/QRManagementPanel';
import {
  User as UserIcon,
  Phone,
  Mail,
  Shield,
  Camera,
  Save,
  LogOut,
  CheckCircle2,
  Lock,
  Key,
  CreditCard,
  ShieldCheck,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const AdminProfile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'qr-management'>(() => {
    return searchParams.get('tab') === 'qr-management' ? 'qr-management' : 'profile';
  });

  useEffect(() => {
    if (searchParams.get('tab') === 'qr-management') {
      setActiveTab('qr-management');
    }
  }, [searchParams]);

  // Admin Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photo, setPhoto] = useState<string | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // QR Payment Security & Password Protection States
  const [isQRVerified, setIsQRVerified] = useState(() => {
    return sessionStorage.getItem('shinestaff_dashboard_unlocked') === 'true';
  });
  const [securityPassInput, setSecurityPassInput] = useState('');
  const [securityPassError, setSecurityPassError] = useState('');
  const [verifyingSecurity, setVerifyingSecurity] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    try {
      await api.put('/auth/profile', {
        name,
        phone,
        photoDataUrl: photo || undefined
      });
      setSuccessMsg('Admin profile updated successfully!');
      setIsEditing(false);
      setPhoto(null);
      await refreshUser();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update admin profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setUpdatingPassword(true);
    setSuccessMsg(null);

    try {
      await api.put('/auth/profile', {
        password
      });
      setSuccessMsg('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // 🔒 Verify Security Password for QR Management
  const handleVerifySecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingSecurity(true);
    setSecurityPassError('');

    try {
      const res = await api.post('/qr/verify-password', { password: securityPassInput });
      if (res.data.verified) {
        setIsQRVerified(true);
        sessionStorage.setItem('shinestaff_dashboard_unlocked', 'true');
        setSecurityPassInput('');
      }
    } catch (err: any) {
      setSecurityPassError(err.response?.data?.message || 'Incorrect security password. Access denied.');
    } finally {
      setVerifyingSecurity(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      
      {/* Page Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <span>Admin Settings & Security Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage admin credentials, security passwords, and company payment QR codes.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile & Credentials</span>
          </button>
          
          <button
            onClick={() => setActiveTab('qr-management')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'qr-management'
                ? 'bg-white dark:bg-slate-800 text-secondary dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>💳 QR Payment Management</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-success/15 border border-success/20 p-4 text-xs text-success flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: Profile & Credentials */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Card: Summary & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden border-t-4 border-t-blue-500 shadow-xl">
              <div className="relative group mt-4">
                <img
                  src={photo || user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className="h-28 w-28 rounded-full object-cover border-4 border-white dark:border-slate-850 shadow-md"
                />
                <label className="absolute bottom-1 right-1 rounded-full bg-blue-600 text-white p-2 cursor-pointer shadow hover:scale-105 active:scale-95 transition-transform border border-white dark:border-slate-850">
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>

              <h3 className="font-extrabold text-lg text-slate-800 dark:text-white mt-4">{user.name}</h3>
              <span className="text-[10px] font-extrabold bg-blue-500/10 text-blue-550 px-3 py-0.5 rounded-full uppercase tracking-wider mt-1">
                SYSTEM ADMINISTRATOR
              </span>

              <div className="w-full border-t border-slate-100 dark:border-slate-800 my-6 pt-6 space-y-3.5 text-xs text-left">
                <div className="flex items-center space-x-2 text-slate-450">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-2 text-slate-450">
                    <Phone className="h-4 w-4 text-blue-500" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-slate-450">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Superadmin Access</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-danger/10 text-danger hover:bg-danger/15 py-3 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out of Admin Hub</span>
              </button>
            </div>
          </div>

          {/* Right Cards: Contact Details & Password */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 shadow-xl border-l-4 border-l-blue-500">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest">
                  Edit Contact Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                >
                  {isEditing ? 'Cancel' : 'Edit Info'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Display Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-3.5 pl-10 pr-4 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Mobile Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-3.5 pl-10 pr-4 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl px-6 py-3 text-xs font-bold shadow-md shadow-blue-500/10 flex items-center space-x-2 ml-auto cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Contact Details'}</span>
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400 uppercase">Display Name</span>
                    <span className="font-bold text-slate-800 dark:text-white">{user.name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400 uppercase">Phone Contact</span>
                    <span className="font-bold text-slate-800 dark:text-white">{user.phone || 'Not Logged'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-6 shadow-xl border-l-4 border-l-indigo-500">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                Update Hub Password
              </h3>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-3.5 pl-10 pr-4 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 py-3.5 pl-10 pr-4 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-gradient-to-r from-indigo-550 to-violet-650 text-white rounded-xl px-6 py-3 text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center space-x-2 ml-auto cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{updatingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 💳 QR Payment Management */}
      {activeTab === 'qr-management' && (
        <div className="animate-fade-in space-y-6">
          
          {/* STEP A: Password Verification Screen (if not verified yet) */}
          {!isQRVerified ? (
            <div className="max-w-md mx-auto my-12 glass-card p-8 shadow-2xl border-t-4 border-t-amber-500 rounded-3xl text-center space-y-6">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Lock className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">🔒 Secure Payment Settings</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  This section is protected with a separate Security Password. Enter password to manage corporate QR codes.
                </p>
              </div>

              {securityPassError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{securityPassError}</span>
                </div>
              )}

              <form onSubmit={handleVerifySecurityPassword} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">
                    Enter Security Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={securityPassInput}
                      onChange={(e) => setSecurityPassInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="flex-1 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingSecurity}
                    className="flex-1 py-3 text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{verifyingSecurity ? 'Verifying...' : 'Verify Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <QRManagementPanel />
          )}
        </div>
      )}

    </div>
  );
};

export default AdminProfile;

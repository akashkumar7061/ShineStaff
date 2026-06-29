import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  User as UserIcon,
  Phone,
  Mail,
  Shield,
  Camera,
  Save,
  LogOut,
  CheckCircle2,
  Lock
} from 'lucide-react';

const AdminProfile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photo, setPhoto] = useState<string | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      confirmPassword && setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Admin Profile Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Manage your credentials, photo, and dashboard preferences.</p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-success/15 border border-success/20 p-4 text-xs text-success flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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
              className="w-full flex items-center justify-center space-x-2 rounded-custom bg-danger/10 text-danger hover:bg-danger/15 py-3 text-xs font-bold transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out of Admin Hub</span>
            </button>
          </div>
        </div>

        {/* Right Cards: Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Contact Details */}
          <div className="glass-card p-6 shadow-xl border-l-4 border-l-blue-500">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest">
                Edit Contact Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-blue-500 hover:underline"
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
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-custom px-6 py-3 text-xs font-bold shadow-md shadow-blue-500/10 flex items-center space-x-2 ml-auto"
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

          {/* Card 2: Security settings */}
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
                className="bg-gradient-to-r from-indigo-550 to-violet-650 text-white rounded-custom px-6 py-3 text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center space-x-2 ml-auto"
              >
                <Save className="h-4 w-4" />
                <span>{updatingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminProfile;

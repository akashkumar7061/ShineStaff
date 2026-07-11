import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Briefcase,
  DollarSign,
  Camera,
  Save,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const WorkerProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState((user as any)?.address || '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAddress((user as any).address || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    try {
      await api.put('/auth/profile', {
        name,
        phone,
        address,
        photoDataUrl: photo || undefined
      });
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      setPhoto(null);
      await refreshUser();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Profile update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden relative">
      
      {/* Background glowing mesh */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-0 left-0 h-[450px] w-full bg-gradient-to-b from-violet-500/10 via-violet-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-10 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/10 blur-[90px]" />
      </div>

      {/* Full-bleed Widescreen Workspace (w-full px-8 instead of max-w-4xl mx-auto) */}
      <main className="relative p-6 sm:p-8 pt-24 w-full space-y-6 z-10">
        
        {successMsg && (
          <div className="rounded-xl bg-success/15 border border-success/20 p-4 text-xs text-success flex items-center space-x-2 animate-fade-in shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Full-Width Profile Banner Backdrop Cover */}
        <div className="glass-card border border-slate-200/50 dark:border-slate-800/60 shadow-xl overflow-hidden">
          
          {/* Top Decorative Banner Pattern */}
          <div className="h-32 bg-gradient-to-r from-violet-500 via-indigo-500 to-teal-500 relative flex items-end px-8 pb-4">
            <div className="absolute inset-0 bg-black/10" />
            <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase flex items-center space-x-1 z-10">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Verified Employee Account</span>
            </span>
          </div>

          {/* User profile section */}
          <div className="p-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end sm:space-x-6 -mt-10 relative z-10">
            <div className="relative group">
              <img
                src={photo || user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                alt={user.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg"
              />
              <label className="absolute bottom-0 right-0 rounded-full bg-violet-600 hover:bg-violet-700 text-white p-2 cursor-pointer shadow hover:scale-105 active:scale-95 transition-transform border border-white dark:border-slate-900">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-center sm:text-left space-y-1 mt-4 sm:mt-0 pt-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">{user.name}</h2>
                <div className="flex justify-center sm:justify-start space-x-2">
                  <span className="inline-block text-[9px] font-bold bg-violet-500/10 text-violet-500 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {user.company} Branch
                  </span>
                  <span className="inline-block text-[9px] font-bold bg-teal-500/10 text-teal-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-450">Unique ID: {user.id}</p>
            </div>
          </div>
        </div>

        {/* 2. Full-Width Grid Content (Splits 50%/50% on large screens) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* LEFT PANEL: Employment Metrics */}
          <div className="glass-card p-8 space-y-6 shadow-xl border-l-4 border-l-teal-500">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-3">
              Wages & Employment Record
            </h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450 flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-teal-500" />
                  <span>Aadhaar Number</span>
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {(user as any).aadhaarNumber || 'Not Logged'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450 flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span>Daily Wage Rate</span>
                </span>
                <span className="font-extrabold text-success">
                  ₹{(user as any).dailySalary || 450} / day
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-455 flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  <span>Service Group</span>
                </span>
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {user.company}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450 flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-rose-500" />
                  <span>Date of Joining</span>
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {(user as any).joiningDate ? new Date((user as any).joiningDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Personal Information & Editing details */}
          <div className="glass-card p-8 shadow-xl border-l-4 border-l-violet-500">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-6">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest">
                Personal Contact Directory
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-secondary hover:underline"
              >
                {isEditing ? 'Cancel' : 'Edit Info'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-405" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-3 pl-10 pr-4 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Mobile Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-405" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 py-3 pl-10 pr-4 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Home Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-4 h-4 w-4 text-slate-405" />
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 py-3 pl-10 pr-4 outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-custom py-3.5 text-xs font-bold shadow-md shadow-violet-500/10 flex items-center justify-center space-x-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile Details'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-xs">
                <div className="flex items-center space-x-3.5 py-1">
                  <UserIcon className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Full Name</span>
                    <span className="font-bold text-slate-800 dark:text-white">{user.name}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5 py-1">
                  <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Phone Number</span>
                    <span className="font-bold text-slate-800 dark:text-white">{user.phone || 'Not Registered'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5 py-1">
                  <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Email Address</span>
                    <span className="font-bold text-slate-800 dark:text-white">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3.5 py-1">
                  <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Home Address</span>
                    <span className="font-bold text-slate-800 dark:text-white">{(user as any).address || 'Not Added'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
};

export default WorkerProfile;

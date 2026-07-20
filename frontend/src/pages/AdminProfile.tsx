import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ORIGINAL_PNB_QR_IMAGE } from '../utils/defaultQRImage';
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
  QrCode,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Key,
  Check,
  X,
  Building,
  CreditCard,
  ShieldCheck,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface IQR {
  _id: string;
  name: string;
  company: 'SofaShine' | 'CleanCruisers' | 'All' | 'Custom';
  accountHolder: string;
  upiId: string;
  bankName: string;
  qrImage: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
}

const AdminProfile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'qr-management'>('profile');

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
  const [isQRVerified, setIsQRVerified] = useState(false);
  const [securityPassInput, setSecurityPassInput] = useState('');
  const [securityPassError, setSecurityPassError] = useState('');
  const [verifyingSecurity, setVerifyingSecurity] = useState(false);

  // QR Management States
  const [qrList, setQrList] = useState<IQR[]>([]);
  const [loadingQRs, setLoadingQRs] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [previewQR, setPreviewQR] = useState<IQR | null>(null);
  const [editingQR, setEditingQR] = useState<IQR | null>(null);

  // Security Password Update Modal State
  const [isSecurityPassModalOpen, setIsSecurityPassModalOpen] = useState(false);
  const [currentSecPass, setCurrentSecPass] = useState('');
  const [newSecPass, setNewSecPass] = useState('');
  const [confirmNewSecPass, setConfirmNewSecPass] = useState('');
  const [updatingSecPass, setUpdatingSecPass] = useState(false);

  // Form States for Add/Edit QR
  const [qrForm, setQrForm] = useState({
    name: '',
    company: 'SofaShine',
    accountHolder: '',
    upiId: '',
    bankName: '',
    qrImage: '',
    description: '',
    isDefault: false,
    isActive: true
  });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  // Fetch QR codes if verified
  const fetchQRCodes = async () => {
    setLoadingQRs(true);
    try {
      const res = await api.get('/qr');
      setQrList(res.data);
    } catch (err: any) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setLoadingQRs(false);
    }
  };

  useEffect(() => {
    if (isQRVerified) {
      fetchQRCodes();
    }
  }, [isQRVerified]);

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
        setSecurityPassInput('');
      }
    } catch (err: any) {
      setSecurityPassError(err.response?.data?.message || 'Incorrect security password. Access denied.');
    } finally {
      setVerifyingSecurity(false);
    }
  };

  // 🔑 Handle Update Security Password
  const handleUpdateSecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSecPass !== confirmNewSecPass) {
      alert('New security passwords do not match');
      return;
    }

    setUpdatingSecPass(true);
    try {
      await api.put('/qr/security-password', {
        currentPassword: currentSecPass,
        newPassword: newSecPass
      });
      alert('Security password updated successfully!');
      setIsSecurityPassModalOpen(false);
      setCurrentSecPass('');
      setNewSecPass('');
      setConfirmNewSecPass('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update security password');
    } finally {
      setUpdatingSecPass(false);
    }
  };

  // Open Modal to Add or Edit QR
  const handleOpenQRModal = (qr?: IQR) => {
    if (qr) {
      setEditingQR(qr);
      setQrForm({
        name: qr.name,
        company: qr.company,
        accountHolder: qr.accountHolder,
        upiId: qr.upiId,
        bankName: qr.bankName,
        qrImage: qr.qrImage,
        description: qr.description || '',
        isDefault: qr.isDefault,
        isActive: qr.isActive
      });
    } else {
      setEditingQR(null);
      setQrForm({
        name: '',
        company: 'SofaShine',
        accountHolder: '',
        upiId: '',
        bankName: '',
        qrImage: '',
        description: '',
        isDefault: false,
        isActive: true
      });
    }
    setIsQRModalOpen(true);
  };

  // Upload QR Image via File Input
  const handleQRImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrForm(prev => ({ ...prev, qrImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save QR Code (Create or Update)
  const handleSaveQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrForm.name || !qrForm.accountHolder || !qrForm.upiId || !qrForm.qrImage) {
      alert('Please fill in QR Name, Account Holder Name, UPI ID, and QR Image.');
      return;
    }

    try {
      if (editingQR) {
        await api.put(`/qr/${editingQR._id}`, qrForm);
      } else {
        await api.post('/qr', qrForm);
      }
      setIsQRModalOpen(false);
      fetchQRCodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save QR code');
    }
  };

  // Delete QR Code
  const handleDeleteQR = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/qr/${id}`);
      fetchQRCodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete QR code');
    }
  };

  // Set Active / Default Toggle
  const handleToggleActiveQR = async (id: string, currentActive: boolean) => {
    try {
      await api.put(`/qr/${id}/active`, { isActive: !currentActive });
      fetchQRCodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update QR status');
    }
  };

  const handleSetDefaultQR = async (id: string) => {
    try {
      await api.put(`/qr/${id}/active`, { isDefault: true, isActive: true });
      fetchQRCodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to set default QR code');
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
            /* STEP B: Verified QR Code Management Panel */
            <div className="space-y-6">
              
              {/* Header Action Bar */}
              <div className="glass-card p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Active Corporate QR Codes</h3>
                    <p className="text-xs text-slate-400 font-semibold">Unlimited QR codes mapped by company for automatic worker payment screens.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsSecurityPassModalOpen(true)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer inline-flex items-center space-x-2"
                  >
                    <Key className="h-4 w-4 text-amber-500" />
                    <span>Change Security Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenQRModal()}
                    className="px-5 py-2.5 bg-secondary hover:bg-secondary-dark text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Add New QR Code</span>
                  </button>
                </div>
              </div>

              {/* QR Cards Grid */}
              {loadingQRs ? (
                <div className="p-12 text-center text-xs font-bold text-slate-400">Loading QR Codes...</div>
              ) : qrList.length === 0 ? (
                <div className="p-12 text-center glass-card rounded-3xl space-y-3">
                  <QrCode className="h-12 w-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-500">No QR codes created yet.</p>
                  <button
                    onClick={() => handleOpenQRModal()}
                    className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl"
                  >
                    + Create First QR Code
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {qrList.map((qr) => (
                    <div
                      key={qr._id}
                      className={`glass-card p-5 rounded-3xl shadow-lg relative flex flex-col justify-between transition-all border ${
                        qr.isDefault
                          ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Top Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">{qr.name}</h4>
                              {qr.isDefault && (
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                              Mapped: {qr.company}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <span className={`h-2.5 w-2.5 rounded-full ${qr.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                              {qr.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        {/* Image Preview & Details */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-center space-x-4 mb-4">
                          <img
                            src={qr.qrImage && !qr.qrImage.includes('svg+xml') ? qr.qrImage : ORIGINAL_PNB_QR_IMAGE}
                            alt={qr.name}
                            className="h-20 w-20 object-contain rounded-xl border border-slate-100 dark:border-slate-800 bg-white p-1"
                          />
                          <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 font-semibold overflow-hidden">
                            <div className="truncate font-bold text-slate-900 dark:text-white">{qr.accountHolder}</div>
                            <div className="truncate font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{qr.upiId}</div>
                            <div className="truncate text-[10px] text-slate-400">{qr.bankName || 'Bank Account'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setPreviewQR(qr)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer"
                            title="Preview Full QR"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenQRModal(qr)}
                            className="p-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-xl cursor-pointer"
                            title="Edit QR"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQR(qr._id, qr.name)}
                            className="p-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer"
                            title="Delete QR"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {!qr.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultQR(qr._id)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-[10px] font-extrabold rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                            <Check className="h-3.5 w-3.5" />
                            <span>Primary QR</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* MODAL 1: Add or Edit QR Code */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsQRModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <QrCode className="h-5 w-5 text-secondary" />
                <span>{editingQR ? 'Edit QR Code' : 'Add New Corporate QR Code'}</span>
              </h3>
              <button onClick={() => setIsQRModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQR} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">QR Display Name *</label>
                  <input
                    type="text"
                    required
                    value={qrForm.name}
                    onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })}
                    placeholder="e.g. SofaShine PNB QR"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Map to Company *</label>
                  <select
                    value={qrForm.company}
                    onChange={(e) => setQrForm({ ...qrForm, company: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-secondary"
                  >
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                    <option value="All">All Companies (Universal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={qrForm.accountHolder}
                    onChange={(e) => setQrForm({ ...qrForm, accountHolder: e.target.value })}
                    placeholder="e.g. ADITYA RAY"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">UPI ID *</label>
                  <input
                    type="text"
                    required
                    value={qrForm.upiId}
                    onChange={(e) => setQrForm({ ...qrForm, upiId: e.target.value })}
                    placeholder="e.g. 8810319452@pnb"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-secondary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={qrForm.bankName}
                  onChange={(e) => setQrForm({ ...qrForm, bankName: e.target.value })}
                  placeholder="e.g. Punjab National Bank (PNB)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-secondary"
                />
              </div>

              {/* Upload QR Image */}
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">QR Code Image *</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRImageUpload}
                    className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-secondary file:text-white file:font-bold hover:file:opacity-90 cursor-pointer"
                  />
                  {qrForm.qrImage && (
                    <img src={qrForm.qrImage} alt="QR Preview" className="h-12 w-12 object-contain rounded border bg-white p-0.5" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={qrForm.description}
                  onChange={(e) => setQrForm({ ...qrForm, description: e.target.value })}
                  placeholder="Additional payment details or instructions..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrForm.isDefault}
                    onChange={(e) => setQrForm({ ...qrForm, isDefault: e.target.checked })}
                    className="rounded text-secondary focus:ring-secondary"
                  />
                  <span className="text-xs">Set as Primary Default QR</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrForm.isActive}
                    onChange={(e) => setQrForm({ ...qrForm, isActive: e.target.checked })}
                    className="rounded text-secondary focus:ring-secondary"
                  />
                  <span className="text-xs">Active Status</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsQRModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-extrabold text-white bg-secondary hover:bg-secondary-dark rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Save QR Code
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Full Screen QR Preview */}
      {previewQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setPreviewQR(null)} className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in p-6 text-center space-y-4">
            <button onClick={() => setPreviewQR(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <span className="px-3 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold rounded-full uppercase">
                {previewQR.company} QR
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{previewQR.name}</h3>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 inline-block shadow-inner">
              <img src={previewQR.qrImage} alt={previewQR.name} className="h-56 w-56 object-contain mx-auto" />
            </div>

            <div className="space-y-1 font-bold text-xs">
              <div className="text-slate-900 dark:text-white">{previewQR.accountHolder}</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{previewQR.upiId}</div>
              <div className="text-[11px] text-slate-400">{previewQR.bankName}</div>
            </div>

            <button
              onClick={() => setPreviewQR(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Update Security Password */}
      {isSecurityPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsSecurityPassModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <Key className="h-5 w-5 text-amber-500" />
                <span>Change Security Password</span>
              </h3>
              <button onClick={() => setIsSecurityPassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSecurityPassword} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Current Security Password</label>
                <input
                  type="password"
                  required
                  value={currentSecPass}
                  onChange={(e) => setCurrentSecPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">New Security Password</label>
                <input
                  type="password"
                  required
                  value={newSecPass}
                  onChange={(e) => setNewSecPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Confirm New Security Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewSecPass}
                  onChange={(e) => setConfirmNewSecPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSecurityPassModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSecPass}
                  className="flex-1 py-3 text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {updatingSecPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminProfile;

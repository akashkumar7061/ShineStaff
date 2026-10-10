import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ORIGINAL_PNB_QR_IMAGE } from '../utils/defaultQRImage';
import {
  QrCode,
  Plus,
  Key,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  CreditCard,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export interface IQR {
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

interface QRManagementPanelProps {
  onLock?: () => void;
}

const QRManagementPanel: React.FC<QRManagementPanelProps> = ({ onLock }) => {
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
    company: 'SofaShine' as 'SofaShine' | 'CleanCruisers' | 'All',
    accountHolder: '',
    upiId: '',
    bankName: '',
    qrImage: '',
    description: '',
    isDefault: false,
    isActive: true
  });

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
    fetchQRCodes();
  }, []);

  // Open Modal to Add or Edit QR
  const handleOpenQRModal = (qr?: IQR) => {
    if (qr) {
      setEditingQR(qr);
      setQrForm({
        name: qr.name,
        company: (qr.company === 'Custom' ? 'All' : qr.company) as any,
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

  // Handle Update Security Password
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

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Action Bar */}
      <div className="glass-card p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Active Corporate QR Codes
            </h3>
            <p className="text-xs text-slate-400 font-semibold">
              Manage company payment QR codes, UPI IDs, and security settings.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSecurityPassModalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer inline-flex items-center space-x-2"
          >
            <Key className="h-4 w-4 text-amber-500" />
            <span>Change Security Password</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenQRModal()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center space-x-2"
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
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    Make Default
                  </button>
                ) : (
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Primary QR</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Add or Edit QR Code */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsQRModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                <span>{editingQR ? 'Edit QR Code' : 'Add New Corporate QR Code'}</span>
              </h3>
              <button onClick={() => setIsQRModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQR} className="space-y-3.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">QR Label / Name *</label>
                  <input
                    type="text"
                    required
                    value={qrForm.name}
                    onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })}
                    placeholder="e.g. SofaShine PNB QR"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Map to Company *</label>
                  <select
                    value={qrForm.company}
                    onChange={(e) => setQrForm({ ...qrForm, company: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-emerald-500"
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-emerald-500"
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-emerald-500 font-mono"
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
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-emerald-500"
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
                    className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:text-white file:font-bold hover:file:opacity-90 cursor-pointer"
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
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrForm.isDefault}
                    onChange={(e) => setQrForm({ ...qrForm, isDefault: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs">Set as Primary Default QR</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrForm.isActive}
                    onChange={(e) => setQrForm({ ...qrForm, isActive: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
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
                  className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg transition-all cursor-pointer"
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
            <button onClick={() => setPreviewQR(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">
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
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
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
              <button onClick={() => setIsSecurityPassModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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

export default QRManagementPanel;

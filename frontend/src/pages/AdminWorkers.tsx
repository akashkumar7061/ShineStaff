import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import MapView from '../components/MapView';
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  UserCheck,
  Star,
  CheckCircle,
  Briefcase,
  Coins,
  Clock
} from 'lucide-react';

interface AdminWorkersProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminWorkers: React.FC<AdminWorkersProps> = ({ companyFilter }) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState<any>(null);
  
  // Modals visibility
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'jobs' | 'attendance' | 'finances'>('overview');

  // Form states
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [dailySalary, setDailySalary] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [company, setCompany] = useState<'SofaShine' | 'CleanCruisers' | 'Both'>('SofaShine');
  const [photoDataUrl, setPhotoDataUrl] = useState('');

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workers?company=${companyFilter}`);
      setWorkers(res.data);
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [companyFilter]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/workers', {
        name,
        email,
        password,
        phone,
        address,
        aadhaarNumber,
        dailySalary: Number(dailySalary) || 0,
        monthlySalary: Number(monthlySalary) || 0,
        company,
        photoDataUrl
      });
      alert('Worker added successfully!');
      setAddModalOpen(false);
      resetForm();
      fetchWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add worker');
    }
  };

  const handleEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkerId) return;

    try {
      await api.put(`/workers/${editingWorkerId}`, {
        name,
        email,
        phone,
        address,
        aadhaarNumber,
        dailySalary: Number(dailySalary) || 0,
        monthlySalary: Number(monthlySalary) || 0,
        company,
        photoDataUrl
      });
      alert('Worker details updated successfully!');
      setEditModalOpen(false);
      resetForm();
      fetchWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to edit worker');
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this worker permanently?')) return;
    try {
      await api.delete(`/workers/${id}`);
      alert('Worker deleted successfully');
      fetchWorkers();
    } catch (err: any) {
      alert('Failed to delete worker');
    }
  };

  const toggleWorkerStatus = async (worker: any) => {
    const nextStatus = worker.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/workers/${worker._id}`, { status: nextStatus });
      fetchWorkers();
    } catch (err) {
      alert('Failed to update worker status');
    }
  };

  const handleOpenDetails = async (id: string) => {
    try {
      const res = await api.get(`/workers/${id}`);
      setSelectedWorkerDetails(res.data);
      setDetailTab('overview');
      setDetailsModalOpen(true);
    } catch (err) {
      alert('Failed to fetch worker details');
    }
  };

  const handleDeletePayout = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment log? This will recalculate the remaining salary balance.')) return;
    try {
      await api.delete(`/salary/requests/${id}`);
      alert('Payment log deleted successfully!');
      if (selectedWorkerDetails?.worker?._id) {
        handleOpenDetails(selectedWorkerDetails.worker._id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete payment log');
    }
  };

  const handleOpenEdit = (worker: any) => {
    setEditingWorkerId(worker._id);
    setName(worker.name);
    setEmail(worker.email);
    setPhone(worker.phone);
    setAddress(worker.address || '');
    setAadhaarNumber(worker.aadhaarNumber || '');
    setDailySalary(worker.dailySalary.toString());
    setMonthlySalary(worker.monthlySalary.toString());
    setCompany(worker.company);
    setPhotoDataUrl(worker.photo || '');
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setEditingWorkerId(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAddress('');
    setAadhaarNumber('');
    setDailySalary('');
    setMonthlySalary('');
    setCompany('SofaShine');
    setPhotoDataUrl('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Worker Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Register, manage details, and track performance scores</p>
        </div>

        <button
          onClick={() => { resetForm(); setAddModalOpen(true); }}
          className="btn-blue-gradient flex items-center space-x-2 rounded-custom px-4 py-3.5 text-xs font-bold"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Register Worker</span>
        </button>
      </div>

      {/* Workers table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No workers registered for this criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Wage Rates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aadhaar</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {workers.map((worker) => (
                  <tr key={worker._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={worker.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${worker.name}`}
                          alt={worker.name}
                          className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                        />
                        <div>
                          <span className="block font-bold text-slate-850 dark:text-white text-xs">{worker.name}</span>
                          <span className="block text-[10px] text-slate-450 mt-0.5">{worker.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-6 py-4">
                      <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full uppercase">
                        {worker.company}
                      </span>
                    </td>

                    {/* Salary rates */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="block font-medium text-slate-700 dark:text-slate-300">Daily: ₹{worker.dailySalary}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Monthly: ₹{worker.monthlySalary}</span>
                      </div>
                    </td>

                    {/* Toggle Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleWorkerStatus(worker)}
                        className={`flex items-center space-x-1 font-bold ${
                          worker.status === 'active' ? 'text-success' : 'text-slate-400'
                        }`}
                      >
                        {worker.status === 'active' ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                        <span className="text-[10px] uppercase">{worker.status}</span>
                      </button>
                    </td>

                    {/* Aadhaar */}
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {worker.aadhaarNumber || 'Not Saved'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center space-x-3">
                        <button
                          onClick={() => handleOpenDetails(worker._id)}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-450 hover:bg-secondary/10 hover:text-secondary"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(worker)}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-450 hover:bg-warning/10 hover:text-warning"
                          title="Edit Details"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorker(worker._id)}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-450 hover:bg-danger/10 hover:text-danger"
                          title="Delete Worker"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Worker Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/75 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-850 dark:text-white text-base">Register New Worker</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleAddWorker} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Default: worker123"
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 pr-10 outline-none focus:border-secondary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Monthly Salary (₹)</label>
                  <input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Assigned Company <span className="text-red-500">*</span></label>
                  <select value={company} onChange={(e) => setCompany(e.target.value as any)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary">
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                    <option value="Both">Both (Shared)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Aadhaar Card Number</label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="12-digit Aadhaar Number"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Address</label>
                <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary resize-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Worker Profile Photo</label>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-xs outline-none" />
                {photoDataUrl && <img src={photoDataUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover mt-2" />}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setAddModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/75 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-850 dark:text-white text-base">Edit Worker Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleEditWorker} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Phone Number</label>
                  <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Assigned Company</label>
                  <select value={company} onChange={(e) => setCompany(e.target.value as any)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary">
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                    <option value="Both">Both (Shared)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Daily Salary (₹)</label>
                  <input type="number" required value={dailySalary} onChange={(e) => setDailySalary(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Monthly Salary (₹)</label>
                  <input type="number" required value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Aadhaar Card Number</label>
                <input type="text" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">Address</label>
                <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary resize-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Update Photo</label>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-xs outline-none" />
                {photoDataUrl && <img src={photoDataUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover mt-2 border border-slate-200" />}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Profile Detail View Modal */}
      {detailsModalOpen && selectedWorkerDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/70 backdrop-blur-md p-4">
          <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Worker Administration</span>
                <h3 className="font-bold text-slate-850 dark:text-white text-base mt-0.5">Worker Profile & History</h3>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 text-xs font-bold"
              >
                <span>Close Details</span>
                <span className="text-[10px]">✕</span>
              </button>
            </div>

            {/* Profile contents */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-1 text-xs">
              
              {/* Left Column: Bio info card */}
              <div className="space-y-4">
                <div className="glass-card p-5 text-center flex flex-col items-center">
                  <img
                    src={selectedWorkerDetails.worker.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedWorkerDetails.worker.name}`}
                    alt={selectedWorkerDetails.worker.name}
                    className="h-24 w-24 rounded-full object-cover border-2 border-secondary mb-3 shadow-lg"
                  />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedWorkerDetails.worker.name}</h4>
                  <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full uppercase mt-1">
                    {selectedWorkerDetails.worker.company}
                  </span>
                  
                  <div className="flex items-center space-x-1.5 text-xs text-amber-500 mt-3 font-semibold">
                    <Star className="h-4 w-4 fill-current" />
                    <span>Score: {selectedWorkerDetails.stats.performanceScore} / 100</span>
                  </div>
                </div>

                {/* Details list card */}
                <div className="glass-card p-5 space-y-2.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{selectedWorkerDetails.worker.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{selectedWorkerDetails.worker.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Joined: {new Date(selectedWorkerDetails.worker.joiningDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span>Aadhaar: {selectedWorkerDetails.worker.aadhaarNumber || 'Not Saved'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>Address: {selectedWorkerDetails.worker.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column (Colspan 2) */}
              <div className="md:col-span-2 space-y-6 flex flex-col">
                
                {/* Tabs bar */}
                <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-px">
                  {(['overview', 'jobs', 'attendance', 'finances'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setDetailTab(tab)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                        detailTab === tab
                          ? 'border-secondary text-secondary'
                          : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content conditional rendering */}
                <div className="flex-1 overflow-y-auto pt-2 space-y-4">
                  {detailTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Statistics counts grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="glass-card p-4 text-center">
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Jobs</span>
                          <span className="block text-xl font-extrabold text-slate-800 dark:text-white mt-1">{selectedWorkerDetails.stats.totalJobs}</span>
                        </div>
                        <div className="glass-card p-4 text-center">
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Job Completion</span>
                          <span className="block text-xl font-extrabold text-success mt-1">{selectedWorkerDetails.stats.completionRate}%</span>
                        </div>
                        <div className="glass-card p-4 text-center">
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Attendance Rate</span>
                          <span className="block text-xl font-extrabold text-secondary mt-1">{selectedWorkerDetails.stats.attendanceRate}%</span>
                        </div>
                      </div>

                      {/* GPS Live Position view */}
                      {selectedWorkerDetails.worker.currentLocation?.lat && (
                        <div className="glass-card p-4 space-y-2">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Latest GPS Tracked Coordinates</span>
                          <div className="h-48">
                            <MapView
                              pins={[{
                                id: selectedWorkerDetails.worker._id,
                                name: selectedWorkerDetails.worker.name,
                                lat: selectedWorkerDetails.worker.currentLocation.lat,
                                lng: selectedWorkerDetails.worker.currentLocation.lng,
                                type: 'worker'
                              }]}
                              center={{
                                lat: selectedWorkerDetails.worker.currentLocation.lat,
                                lng: selectedWorkerDetails.worker.currentLocation.lng
                              }}
                              zoom={14}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === 'jobs' && (
                    <div className="space-y-3">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Commits History</span>
                      <div className="max-h-[45vh] overflow-y-auto space-y-3">
                        {(!selectedWorkerDetails.jobs || selectedWorkerDetails.jobs.length === 0) ? (
                          <p className="text-center text-xs text-slate-400 py-6">No cleanup jobs assigned to this worker.</p>
                        ) : (
                          selectedWorkerDetails.jobs.map((job: any) => (
                            <div key={job._id} className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-bold text-slate-805 dark:text-slate-100">{job.title}</h5>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Client: {job.clientName} ({job.clientPhone})</p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                  job.status === 'completed' ? 'bg-success/15 text-success' :
                                  job.status === 'started' ? 'bg-secondary/15 text-secondary' :
                                  'bg-warning/15 text-warning'
                                }`}>
                                  {job.status}
                                </span>
                              </div>
                              
                              <div className="text-[11px] text-slate-500 space-y-1">
                                <div>📍 Address: <span className="font-medium text-slate-705 dark:text-slate-300">{job.address}</span></div>
                                <div className="grid grid-cols-2 gap-2 pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                                  <div>💵 Charged Price: <span className="font-bold text-slate-700 dark:text-slate-200">₹{job.price || 0}</span></div>
                                  <div>⏰ Scheduled: <span className="font-semibold text-secondary">{job.date || 'N/A'} ({job.timeSlot || 'N/A'})</span></div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {detailTab === 'attendance' && (
                    <div className="space-y-3">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Register</span>
                      <div className="max-h-[45vh] overflow-y-auto space-y-2.5">
                        {(!selectedWorkerDetails.attendance || selectedWorkerDetails.attendance.length === 0) ? (
                          <p className="text-center text-xs text-slate-400 py-6">No attendance records found.</p>
                        ) : (
                          selectedWorkerDetails.attendance.map((att: any) => (
                            <div key={att._id} className="flex justify-between items-center text-xs p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-150">{att.date}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Clocked: {new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3">
                                {att.selfie && att.selfie.startsWith('http') && (
                                  <a href={att.selfie} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-secondary hover:underline">Selfie</a>
                                )}
                                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                                  att.status === 'present' ? 'bg-success/15 text-success' :
                                  att.status === 'late' ? 'bg-warning/15 text-warning' :
                                  'bg-slate-200 text-slate-500'
                                }`}>
                                  {att.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {detailTab === 'finances' && (
                    <div className="space-y-4">
                      {/* Financial Salary Dossier Cards */}
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary Ledger & Advance Payouts</span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-4">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Regular Daily Rate</span>
                          <span className="block text-xl font-extrabold text-slate-850 dark:text-white mt-1">₹{selectedWorkerDetails.worker.dailySalary || 0}</span>
                        </div>
                        <div className="glass-card p-4">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Calculated Monthly Rate</span>
                          <span className="block text-xl font-extrabold text-slate-855 dark:text-white mt-1">₹{selectedWorkerDetails.worker.monthlySalary || 0}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Advances & Payout Logs</span>
                        <div className="max-h-[30vh] overflow-y-auto space-y-2">
                          {(!selectedWorkerDetails.payouts || selectedWorkerDetails.payouts.length === 0) ? (
                            <p className="text-center text-xs text-slate-400 py-4">No logged advances or payouts.</p>
                          ) : (
                            selectedWorkerDetails.payouts.map((pay: any) => (
                              <div key={pay._id} className="p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                      pay.type === 'advance' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                                    }`}>
                                      {pay.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{pay.paymentMode || 'Online'}</span>
                                  </div>
                                  <span className="block text-[10px] text-slate-450 mt-1">
                                    Date: {pay.paymentTime ? new Date(pay.paymentTime).toLocaleString() : new Date(pay.createdAt).toLocaleString()}
                                  </span>
                                  {pay.reason && (
                                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Reason: {pay.reason}</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3.5">
                                  <span className="text-sm font-extrabold text-slate-850 dark:text-white">₹{pay.amount}</span>
                                  <button
                                    onClick={() => handleDeletePayout(pay._id)}
                                    className="text-danger hover:text-red-750 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Delete payment log"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminWorkers;

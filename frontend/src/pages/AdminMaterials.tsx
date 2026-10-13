import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  User,
  Phone,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface AdminMaterialsProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

interface CatalogItem {
  _id: string;
  name: string;
  category: string;
  defaultUnit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  'Cleaning Chemical',
  'Cleaning Tools',
  'Safety Equipment',
  'Machine Parts & Accessories',
  'General Supplies'
];

const AdminMaterials: React.FC<AdminMaterialsProps> = ({ companyFilter }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'catalog'>('requests');

  // Requests state
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'dispatched' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Status update modal / remark
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Catalog management state
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialCategory, setNewMaterialCategory] = useState(CATEGORY_OPTIONS[0]);
  const [newMaterialUnit, setNewMaterialUnit] = useState('1 Unit');
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [addingMaterial, setAddingMaterial] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/material-requests?company=${companyFilter}&status=${statusFilter}`);
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to load material requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get('/material-requests/catalog/all');
      setCatalog(res.data);
    } catch (err) {
      console.error('Failed to load material catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [companyFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeTab]);

  const handleOpenActionModal = (request: any, status: string) => {
    setSelectedRequest(request);
    setTargetStatus(status);
    setAdminRemarks(request.adminRemarks || '');
    setModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest || !targetStatus) return;
    setUpdating(true);
    try {
      await api.put(`/material-requests/${selectedRequest._id}/status`, {
        status: targetStatus,
        adminRemarks
      });
      alert(`Request marked as ${targetStatus.toUpperCase()} successfully!`);
      setModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) {
      alert('Please enter material/chemical name');
      return;
    }

    setAddingMaterial(true);
    try {
      const res = await api.post('/material-requests/catalog', {
        name: newMaterialName.trim(),
        category: newMaterialCategory,
        defaultUnit: newMaterialUnit.trim() || '1 Unit',
        description: newMaterialDesc.trim()
      });
      alert(res.data?.message || 'Material added to catalog successfully!');
      setNewMaterialName('');
      setNewMaterialUnit('1 Unit');
      setNewMaterialDesc('');
      fetchCatalog();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add material');
    } finally {
      setAddingMaterial(false);
    }
  };

  const handleDeleteCatalogItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the worker dropdown catalog?`)) {
      return;
    }

    try {
      await api.delete(`/material-requests/catalog/${id}`);
      setCatalog(catalog.filter(c => c._id !== id));
      alert(`Material "${name}" removed successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete material');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const workerName = r.workerId?.name?.toLowerCase() || '';
    const itemsMatch = r.items?.some((i: any) => i.itemName?.toLowerCase().includes(q));
    const reasonMatch = r.reason?.toLowerCase().includes(q);
    const dateMatch = r.neededByDate?.toLowerCase().includes(q);
    return workerName.includes(q) || itemsMatch || reasonMatch || dateMatch;
  });

  const filteredCatalog = catalog.filter((c) => {
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || (c.defaultUnit && c.defaultUnit.toLowerCase().includes(q));
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30';
      case 'Urgent':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Approved</span>;
      case 'dispatched':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">Dispatched</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-500/15 text-slate-600 dark:text-slate-400">Delivered</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">Pending</span>;
    }
  };

  const getWorkerWhatsAppChatUrl = (request: any) => {
    if (!request?.workerId?.phone) return '#';
    const cleanPhone = request.workerId.phone.replace(/\D/g, '');
    const itemsList = request.items?.map((it: any) => `${it.itemName} (${it.quantity})`).join(', ');
    const text = `Hello ${request.workerId.name},\nRegarding your material request for [${itemsList}]:\nNeeded By: ${request.neededByDate || 'ASAP'}\nStatus: ${request.status.toUpperCase()}\nNotes: ${request.adminRemarks || 'Received by Admin office.'}`;
    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header controls & Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
            <Package className="h-6 w-6 text-secondary" />
            <span>Materials & Inventory Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage worker cleaning supplies requests and customize materials available in the worker dropdown
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab Switcher */}
          <div className="bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl flex space-x-1 border border-slate-200/40">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-slate-900 text-secondary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Worker Requests ({requests.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-slate-900 text-secondary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Dropdown Catalog</span>
            </button>
          </div>

          <button
            onClick={activeTab === 'requests' ? fetchRequests : fetchCatalog}
            className="btn-outline flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Refresh list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* TAB 1: WORKER REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by worker, material, reason, needed date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 outline-none focus:border-secondary w-full md:w-80 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full md:w-auto justify-end overflow-x-auto no-scrollbar">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {(['all', 'pending', 'approved', 'dispatched', 'completed', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-secondary text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Requests list */}
          <div className="glass-card overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-shimmer h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No material requests found matching this criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      <th className="px-5 py-4">Worker</th>
                      <th className="px-5 py-4">Requested Items</th>
                      <th className="px-5 py-4">Needed By</th>
                      <th className="px-5 py-4">Urgency</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Remarks & Log</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                        
                        {/* Worker Info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={req.workerId?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${req.workerId?.name || 'Worker'}`}
                              alt={req.workerId?.name}
                              className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                            />
                            <div>
                              <span className="block font-bold text-slate-850 dark:text-white">{req.workerId?.name || 'Unknown'}</span>
                              <span className="block text-[10px] text-slate-450 mt-0.5">{req.workerId?.phone}</span>
                              <span className="inline-block text-[8.5px] font-extrabold text-secondary mt-0.5 uppercase">
                                {req.company || req.workerId?.company}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 max-w-xs">
                            {req.items?.map((it: any, iIdx: number) => (
                              <div key={iIdx} className="flex items-center space-x-1.5 text-[11px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                                <span className="font-bold text-slate-800 dark:text-slate-200">{it.itemName}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  {it.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Needed By Date */}
                        <td className="px-5 py-4">
                          {req.neededByDate ? (
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10.5px]">
                              <Calendar className="h-3 w-3" />
                              <span>{req.neededByDate}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">—</span>
                          )}
                        </td>

                        {/* Urgency */}
                        <td className="px-5 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getUrgencyBadge(req.urgency)}`}>
                            {req.urgency}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {getStatusBadge(req.status)}
                        </td>

                        {/* Notes & Date */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="space-y-1">
                            <span className="block text-[10px] text-slate-400">
                              {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {req.reason && (
                              <span className="block text-[11px] text-slate-600 dark:text-slate-300 italic truncate" title={req.reason}>
                                "{req.reason}"
                              </span>
                            )}
                            {req.adminRemarks && (
                              <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate" title={req.adminRemarks}>
                                Reply: {req.adminRemarks}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* WhatsApp Worker */}
                            {req.workerId?.phone && (
                              <button
                                onClick={() => window.open(getWorkerWhatsAppChatUrl(req), '_blank')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                title="Chat with worker on WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Approve */}
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleOpenActionModal(req, 'approved')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            {/* Dispatch */}
                            {['pending', 'approved'].includes(req.status) && (
                              <button
                                onClick={() => handleOpenActionModal(req, 'dispatched')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Dispatch
                              </button>
                            )}

                            {/* Complete / Delivered */}
                            {req.status === 'dispatched' && (
                              <button
                                onClick={() => handleOpenActionModal(req, 'completed')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Delivered
                              </button>
                            )}

                            {/* Reject */}
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleOpenActionModal(req, 'rejected')}
                                className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DROPDOWN CATALOG MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Add New Material Form */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-secondary/25 bg-gradient-to-br from-secondary/5 via-transparent to-amber-500/5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-secondary">
              <Plus className="h-5 w-5" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-white">
                Add New Material to Worker Dropdown List
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Yahan se koi bhi material add karenge toh woh turant worker ke dropdown me live include ho jayega.
            </p>

            <form onSubmit={handleAddCatalogItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5 space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Material / Chemical Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Glass & Mirror Cleaner, Leather Polish..."
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary text-slate-850 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={newMaterialCategory}
                  onChange={(e) => setNewMaterialCategory(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary text-slate-850 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Default Unit
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5L Can, 1 Pc"
                  value={newMaterialUnit}
                  onChange={(e) => setNewMaterialUnit(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary text-slate-850 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={addingMaterial}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-secondary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{addingMaterial ? 'Adding...' : 'Add Material'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Current Catalog Table */}
          <div className="glass-card overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-850 dark:text-white">
                  Active Dropdown Materials ({catalog.length} items)
                </h4>
                <p className="text-[10px] text-slate-400">Ye sabhi items workers ko request form me select karne ke liye dikhte hain</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter materials..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:border-secondary"
                />
              </div>
            </div>

            {catalogLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-shimmer h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No materials found in catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCatalog.map((item) => (
                  <div
                    key={item._id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs hover:border-secondary/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <h5 className="font-extrabold text-xs text-slate-800 dark:text-white truncate" title={item.name}>
                          {item.name}
                        </h5>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{item.category}</span>
                        <span>•</span>
                        <span className="font-bold text-secondary">{item.defaultUnit}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCatalogItem(item._id, item.name)}
                      className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer shrink-0"
                      title="Remove from dropdown catalog"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action / Remarks Modal */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs text-left animate-scale-up space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white capitalize">
                  Update Material Request: {targetStatus}
                </h3>
                <span className="text-[10px] text-slate-400">Worker: {selectedRequest.workerId?.name}</span>
                {selectedRequest.neededByDate && (
                  <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    📅 Needed By: {selectedRequest.neededByDate}
                  </span>
                )}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">
                Remarks / Instructions for Worker (Optional)
              </label>
              <textarea
                rows={3}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="e.g. Chemical dispatched via courier / Collect from branch office today..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary resize-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleUpdateStatus}
                className="btn-blue-gradient px-5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {updating ? 'Updating...' : `Confirm ${targetStatus.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminMaterials;

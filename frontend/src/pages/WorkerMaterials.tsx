import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Package,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Calendar,
  Sparkles,
  ChevronDown,
  Edit3
} from 'lucide-react';

interface MaterialItemForm {
  selectedCatalog: string; // Catalog item name or '__CUSTOM__'
  customName: string;
  quantity: string;
}

interface CatalogOption {
  _id: string;
  name: string;
  category: string;
  defaultUnit: string;
}

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInTwoDaysString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WorkerMaterials: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Catalog loaded from server
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Form states
  const [items, setItems] = useState<MaterialItemForm[]>([
    { selectedCatalog: '', customName: '', quantity: '1 Unit' }
  ]);
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent' | 'Critical'>('Normal');
  const [neededByDate, setNeededByDate] = useState<string>(getTodayString());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<any>(null);

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get('/material-requests/catalog');
      setCatalog(res.data);
    } catch (err) {
      console.error('Failed to fetch material catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/material-requests');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch material requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchRequests();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      { selectedCatalog: '', customName: '', quantity: '1 Unit' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof MaterialItemForm, val: string) => {
    const updated = [...items];
    updated[index][field] = val;

    // If worker selects a catalog item that has a default unit, pre-fill quantity if default
    if (field === 'selectedCatalog' && val && val !== '__CUSTOM__') {
      const found = catalog.find(c => c.name === val);
      if (found && found.defaultUnit && updated[index].quantity === '1 Unit') {
        updated[index].quantity = found.defaultUnit;
      }
    }

    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map items to backend payload
    const validItems = items
      .map((it) => {
        const itemName = it.selectedCatalog === '__CUSTOM__' ? it.customName.trim() : it.selectedCatalog.trim();
        return {
          itemName,
          quantity: it.quantity.trim() || '1 Unit'
        };
      })
      .filter((it) => it.itemName !== '');

    if (validItems.length === 0) {
      alert('Please select or specify at least one material.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/material-requests/request', {
        items: validItems,
        urgency,
        neededByDate,
        reason: reason.trim()
      });

      setLastSubmission(res.data);
      alert('Material request submitted to Admin successfully!');
      setItems([{ selectedCatalog: '', customName: '', quantity: '1 Unit' }]);
      setUrgency('Normal');
      setNeededByDate(getTodayString());
      setReason('');
      fetchRequests();

      // Automatically offer to open WhatsApp
      if (res.data?.directWaUrl) {
        if (window.confirm('Request submitted! Would you also like to send a direct WhatsApp message to Admin?')) {
          window.open(res.data.directWaUrl, '_blank');
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit material request');
    } finally {
      setSubmitting(false);
    }
  };

  const getUrgencyBadge = (lvl: string) => {
    if (lvl === 'Critical') {
      return 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30';
    } else if (lvl === 'Urgent') {
      return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    }
    return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><CheckCircle className="h-3 w-3" /><span>Approved</span></span>;
      case 'dispatched':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"><Package className="h-3 w-3" /><span>Dispatched</span></span>;
      case 'completed':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-500/15 text-slate-600 dark:text-slate-400"><CheckCircle className="h-3 w-3" /><span>Delivered</span></span>;
      case 'rejected':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400"><XCircle className="h-3 w-3" /><span>Rejected</span></span>;
      default:
        return <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400"><Clock className="h-3 w-3" /><span>Pending</span></span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-indigo-400/15 dark:bg-indigo-600/5 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-emerald-400/15 dark:bg-emerald-600/5 blur-[80px]" />
      </div>

      <main className="p-3 sm:p-6 pt-20 sm:pt-24 max-w-7xl mx-auto space-y-4 sm:space-y-6 z-10 relative">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
              <Package className="h-6 w-6 text-amber-500" />
              <span>Material & Chemical Requisition</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Request chemicals, cloths, gloves, or cleaning tools — with live status and instant WhatsApp updates
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-1 glass-card p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 space-y-4 rounded-3xl shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-white">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">New Material Request</h3>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">
                Fast Admin Alert
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Urgency selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Priority / Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Normal', 'Urgent', 'Critical'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-extrabold transition-all border active:scale-95 cursor-pointer ${
                        urgency === lvl
                          ? lvl === 'Critical'
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : lvl === 'Urgent'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-teal-500 text-white border-teal-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {lvl === 'Critical' ? '🚨 ' : lvl === 'Urgent' ? '⚡ ' : '🟢 '}
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Needed By Date (Kab tak chahiye?) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Kab Tak Chahiye? (Needed By Date) *</span>
                  </label>
                </div>
                
                {/* Quick Date Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNeededByDate(getTodayString())}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 cursor-pointer ${
                      neededByDate === getTodayString()
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ⚡ Aaj Chahiye (Today)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeededByDate(getTomorrowString())}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 cursor-pointer ${
                      neededByDate === getTomorrowString()
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🌅 Kal Subah (Tomorrow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeededByDate(getInTwoDaysString())}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 cursor-pointer ${
                      neededByDate === getInTwoDaysString()
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    📅 2 Din Me
                  </button>
                </div>

                <input
                  type="date"
                  required
                  min={getTodayString()}
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-amber-500 dark:color-scheme-dark mt-1"
                />
              </div>

              {/* Items List (Multiple Materials Support) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Materials List ({items.length} item{items.length > 1 ? 's' : ''}) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[10.5px] font-extrabold border border-amber-500/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add Another</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 rounded-2xl space-y-2.5 relative shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        📦 Material #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Material Select Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[9.5px] font-bold text-slate-450 uppercase">
                        Select Material from Dropdown:
                      </label>
                      <select
                        required
                        value={it.selectedCatalog}
                        onChange={(e) => handleItemChange(idx, 'selectedCatalog', e.target.value)}
                        className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 outline-none focus:border-amber-500 text-slate-800 dark:text-white"
                      >
                        <option value="">-- Choose Material / Chemical --</option>
                        {catalog.map((c) => (
                          <option key={c._id} value={c.name}>
                            {c.name} {c.category ? `(${c.category})` : ''}
                          </option>
                        ))}
                        <option value="__CUSTOM__">✍️ Other / Custom Material (Not listed in dropdown)</option>
                      </select>
                    </div>

                    {/* Custom Material Name Input if selected */}
                    {it.selectedCatalog === '__CUSTOM__' && (
                      <div className="space-y-1 animate-fade-in">
                        <label className="block text-[9.5px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center space-x-1">
                          <Edit3 className="h-3 w-3" />
                          <span>Custom Material Name:</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Special Stain Remover, Car Wax 500ml..."
                          value={it.customName}
                          onChange={(e) => handleItemChange(idx, 'customName', e.target.value)}
                          className="w-full text-xs font-bold rounded-xl border border-amber-500/50 bg-white dark:bg-slate-950 p-2.5 outline-none focus:border-amber-500 text-slate-800 dark:text-white"
                        />
                      </div>
                    )}

                    {/* Quantity Row */}
                    <div className="space-y-1">
                      <label className="block text-[9.5px] font-bold text-slate-450 uppercase">
                        Quantity:
                      </label>
                      
                      {/* Quantity Preset Chips */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {['1 Unit', '2 Units', '5L Can', '1 Pack', '2 Packs'].map((q) => (
                          <button
                            type="button"
                            key={q}
                            onClick={() => handleItemChange(idx, 'quantity', q)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all active:scale-95 cursor-pointer ${
                              it.quantity === q
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="e.g. 2 Cans, 5 Litres, 10 Cloths, 1 Pair..."
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 outline-none focus:border-amber-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 px-3 border border-dashed border-amber-500/40 hover:border-amber-500 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-extrabold flex items-center justify-center space-x-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Another Material</span>
                </button>
              </div>

              {/* Remarks / Reason */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Remarks / Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Kal subah ke cleanup ke liye shampoo kam pad raha hai..."
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:border-amber-500 resize-none text-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'Submitting Request...' : 'Submit Material Request to Admin'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <div className="glass-card p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-secondary" />
                    <span>My Past Requisitions ({requests.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Track delivery status of chemicals and cleaning equipment requested</p>
                </div>
                <button
                  type="button"
                  onClick={fetchRequests}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Refresh"
                >
                  <Clock className="h-4 w-4" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-shimmer h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Aapne abhi tak koi material request nahi daali hai.
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req._id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-2.5 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            {getStatusBadge(req.status)}
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${getUrgencyBadge(req.urgency)}`}>
                              {req.urgency}
                            </span>
                            {req.neededByDate && (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                <Calendar className="h-2.5 w-2.5" />
                                <span>Needed: {req.neededByDate}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Requested on: {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-150/60 dark:border-slate-800 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                          Requested Materials:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {req.items?.map((it: any, iIdx: number) => (
                            <div key={iIdx} className="flex items-center space-x-1.5 text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{it.itemName}</span>
                              <span className="font-black text-[10px] text-amber-600 dark:text-amber-400">
                                ({it.quantity})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes / Admin Remarks */}
                      {(req.reason || req.adminRemarks) && (
                        <div className="text-[11px] space-y-1">
                          {req.reason && (
                            <p className="text-slate-500 dark:text-slate-400 italic">
                              📝 Notes: "{req.reason}"
                            </p>
                          )}
                          {req.adminRemarks && (
                            <p className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                              💬 Admin Reply: {req.adminRemarks}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

    </div>
  );
};

export default WorkerMaterials;

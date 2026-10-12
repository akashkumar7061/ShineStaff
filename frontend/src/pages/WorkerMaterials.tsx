import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Package, Plus, Trash2, Send, MessageSquare, Clock, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface MaterialItem {
  itemName: string;
  quantity: string;
}

const COMMON_MATERIALS = [
  'Fabric & Sofa Shampoo (5L)',
  'Foam Cleaning Booster',
  'Stain Remover Liquid',
  'Microfiber Cleaning Cloths (Pack of 5)',
  'Heavy Duty Scrubbing Brush',
  'Soft Upholstery Brush',
  'Vacuum Extraction Filter',
  'Disinfectant & Fragrance Mist',
  'Rubber Safety Gloves',
  'Extension Cable / Power Strip',
  'Leather Conditioner Cream'
];

const WorkerMaterials: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [items, setItems] = useState<MaterialItem[]>([
    { itemName: '', quantity: '1 Unit' }
  ]);
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent' | 'Critical'>('Normal');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<any>(null);

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
    fetchRequests();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { itemName: '', quantity: '1 Unit' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof MaterialItem, val: string) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(it => it.itemName.trim() !== '');
    if (validItems.length === 0) {
      alert('Please select or type at least one material/chemical name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/material-requests/request', {
        items: validItems,
        urgency,
        reason
      });

      setLastSubmission(res.data);
      alert('Material request submitted to Admin successfully!');
      setItems([{ itemName: '', quantity: '1 Unit' }]);
      setUrgency('Normal');
      setReason('');
      fetchRequests();

      // Automatically offer to open WhatsApp
      if (res.data?.directWaUrl) {
        if (window.confirm('Request logged! Would you like to also open WhatsApp to notify Admin instantly?')) {
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

      <main className="p-4 md:p-6 pt-24 max-w-7xl mx-auto space-y-6 z-10 relative">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center space-x-2">
              <Package className="h-5 w-5 text-secondary" />
              <span>Material & Chemical Request</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Request shampoo, chemicals, tools or cloths from admin with live status & WhatsApp alert
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-1 glass-card p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 space-y-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                <span>📝 New Request</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Fast Admin Notification</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Urgency selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">
                  Priority / Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Normal', 'Urgent', 'Critical'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`py-2 px-1 text-center rounded-xl text-[10.5px] font-bold transition-all border ${
                        urgency === lvl
                          ? lvl === 'Critical'
                            ? 'bg-red-500 text-white border-red-500 shadow'
                            : lvl === 'Urgent'
                            ? 'bg-amber-500 text-white border-amber-500 shadow'
                            : 'bg-secondary text-white border-secondary shadow'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {lvl === 'Critical' ? '🚨 ' : lvl === 'Urgent' ? '⚡ ' : '🟢 '}
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase">
                    Items & Quantities <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[10px] font-bold text-secondary hover:underline flex items-center space-x-0.5"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase text-slate-400">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-600 text-[10px] p-0.5 font-bold"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Common items quick select */}
                    <input
                      list={`material-suggestions-${idx}`}
                      type="text"
                      required
                      placeholder="e.g. Sofa Shampoo, Microfiber Cloth, Scrub Pad..."
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 outline-none focus:border-secondary font-medium"
                    />
                    <datalist id={`material-suggestions-${idx}`}>
                      {COMMON_MATERIALS.map((m, mIdx) => (
                        <option key={mIdx} value={m} />
                      ))}
                    </datalist>

                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Quantity (e.g. 2 Litres, 5 Pcs, 1 Box)"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Reason / Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">
                  Remarks / Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Bottle almost finished, needed for tomorrow's job..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 outline-none focus:border-secondary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-xl py-3 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? 'Submitting...' : 'Send Request to Admin'}</span>
              </button>

              {lastSubmission?.directWaUrl && (
                <button
                  type="button"
                  onClick={() => window.open(lastSubmission.directWaUrl, '_blank')}
                  className="w-full flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Share Last Request on WhatsApp ↗</span>
                </button>
              )}
            </form>
          </div>

          {/* Right Column: History of requests */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                <span>📦 My Material Request History</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{requests.length} requests</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-shimmer h-24 w-full rounded-2xl" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="glass-card p-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No material requests submitted yet. Use the form on the left to request chemicals or tools.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req._id}
                    className="glass-card p-4.5 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3 shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getUrgencyBadge(req.urgency)}`}>
                          {req.urgency}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Requested on {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div>{getStatusBadge(req.status)}</div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-450 uppercase block">Items:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.items?.map((it: any, iIdx: number) => (
                          <div key={iIdx} className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-150 dark:border-slate-800 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{it.itemName}</span>
                            <span className="text-[10px] font-extrabold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {req.reason && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-lg">
                        Note: "{req.reason}"
                      </div>
                    )}

                    {req.adminRemarks && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/30 flex items-center space-x-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Admin remarks: {req.adminRemarks}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default WorkerMaterials;

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { MapPin, Check, Plus, AlertCircle, Fuel, Compass, CheckCircle2, Edit } from 'lucide-react';

interface AdminFuelProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminFuel: React.FC<AdminFuelProps> = ({ companyFilter }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [allowance, setAllowance] = useState('100'); // default allowance

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLog, setEditLog] = useState<any>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'job' | 'home'>('job');
  const [editKms, setEditKms] = useState('');
  const [editAllowance, setEditAllowance] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'approved'>('approved');
  const [editFromLocation, setEditFromLocation] = useState('');
  const [editToLocation, setEditToLocation] = useState('');

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [createWorkerId, setCreateWorkerId] = useState('');
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
  const [createType, setCreateType] = useState<'job' | 'home'>('home');
  const [createKms, setCreateKms] = useState('');
  const [createAllowance, setCreateAllowance] = useState('100');
  const [createFromLocation, setCreateFromLocation] = useState('Last Work Site');
  const [createToLocation, setCreateToLocation] = useState('Home');

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/auth/workers');
      setWorkers(res.data);
    } catch (err) {
      console.error('Failed to load workers:', err);
    }
  };

  const fetchTravelLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/travel/all');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load travel logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravelLogs();
    fetchWorkers();

    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'TRAVEL_LOG_SUBMITTED' || customEvent.detail?.type === 'TRAVEL_LOG_UPDATED') {
        fetchTravelLogs();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [companyFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createWorkerId || !createKms) {
      alert('Worker and KMs are required!');
      return;
    }
    try {
      await api.post('/travel/admin-submit', {
        workerId: createWorkerId,
        date: createDate,
        type: createType,
        kms: Number(createKms),
        allowance: Number(createAllowance),
        fromLocation: createFromLocation,
        toLocation: createToLocation
      });
      alert('Travel log logged successfully!');
      setCreateModalOpen(false);
      setCreateWorkerId('');
      setCreateKms('');
      setCreateAllowance('100');
      setCreateFromLocation('Last Work Site');
      setCreateToLocation('Home');
      fetchTravelLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit travel log');
    }
  };

  const handleOpenApproveModal = (log: any) => {
    setSelectedLog(log);
    setAllowance((log.kms * 10).toString()); // default auto-calc: ₹10 per KM
    setApprovalModalOpen(true);
  };

  const handleOpenEditModal = (log: any) => {
    setEditLog(log);
    setEditDate(log.date);
    setEditType(log.type);
    setEditKms(log.kms.toString());
    setEditAllowance(log.allowance.toString());
    setEditStatus(log.status);
    setEditFromLocation(log.fromLocation || '');
    setEditToLocation(log.toLocation || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLog) return;
    try {
      await api.put(`/travel/${editLog._id}`, {
        date: editDate,
        type: editType,
        kms: Number(editKms),
        allowance: Number(editAllowance),
        status: editStatus,
        fromLocation: editFromLocation,
        toLocation: editToLocation
      });
      alert('Travel log updated successfully!');
      setEditModalOpen(false);
      fetchTravelLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update travel log');
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;
    try {
      await api.put(`/travel/${selectedLog._id}/approve`, {
        allowance: Number(allowance)
      });
      alert('Traveling allowance approved successfully!');
      setApprovalModalOpen(false);
      fetchTravelLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve allowance');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (companyFilter === 'All') return true;
    return log.workerId?.company === companyFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Fuel & Commute Logs Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">Audit travel distance logged by workers (including commutes back home) and approve payouts</p>
        </div>
        <button
          onClick={() => {
            fetchWorkers();
            setCreateModalOpen(true);
          }}
          className="rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all flex items-center space-x-1.5 self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Add Travel Log</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No worker travel logs recorded currently.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Commute Type</th>
                  <th className="px-6 py-4">Commute Details</th>
                  <th className="px-6 py-4 text-center">Distance (KM)</th>
                  <th className="px-6 py-4 text-center">Allowance Approved</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-5 flex items-center space-x-3">
                      <div>
                        <span className="block font-bold text-slate-850 dark:text-white">{log.workerId?.name}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{log.workerId?.phone}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded uppercase">
                        {log.workerId?.company}
                      </span>
                    </td>

                    <td className="px-6 py-5 font-medium">{log.date}</td>

                    <td className="px-6 py-5 font-semibold text-slate-700 dark:text-slate-205">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        log.type === 'home' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {log.type === 'home' ? 'Last work ➔ Home' : 'Booking cleanup'}
                      </span>
                    </td>

                    <td className="px-6 py-5 max-w-[220px]">
                      <div className="space-y-1">
                        {log.type === 'job' ? (
                          <span className="block font-bold text-slate-700 dark:text-slate-300 truncate">
                            Clean job: {log.jobId?.title || 'Cleanup Site'}
                          </span>
                        ) : (
                          <span className="block italic text-[10px] text-slate-400">
                            Commute back home
                          </span>
                        )}
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-500 truncate max-w-[90px]" title={log.fromLocation || 'Home'}>
                            {log.fromLocation || 'Home'}
                          </span>
                          <span className="text-secondary font-extrabold">➔</span>
                          <span className="font-semibold text-slate-500 truncate max-w-[90px]" title={log.toLocation || 'Site'}>
                            {log.toLocation || 'Site'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 font-extrabold text-secondary text-center text-sm">{log.kms} KM</td>

                    <td className="px-6 py-5 font-extrabold text-success text-center text-sm">
                      {log.status === 'approved' ? `₹${log.allowance}` : 'Pending'}
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        log.status === 'approved' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {log.status === 'pending' && (
                          <button
                            onClick={() => handleOpenApproveModal(log)}
                            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3 py-1.5 uppercase transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(log)}
                          className="rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 font-bold text-[10px] px-3 py-1.5 uppercase transition-colors flex items-center space-x-1"
                          title="Edit Log"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
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
      {/* Approval modal */}
      {approvalModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Approve Traveling Allowance</h3>
              <button onClick={() => setApprovalModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 dark:bg-slate-955 p-4 rounded-2xl space-y-1.5 text-slate-550">
                <div>Worker Name: <span className="font-bold text-slate-800 dark:text-slate-100">{selectedLog.workerId?.name}</span></div>
                <div>Distance Commuted: <span className="font-bold text-secondary">{selectedLog.kms} KM</span></div>
                <div>Commute Type: <span className="font-bold uppercase text-[9px] bg-secondary/15 text-secondary px-2 py-0.5 rounded">{selectedLog.type}</span></div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Travel Allowance (₹)</label>
                <input
                  type="number"
                  required
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2.5 outline-none focus:border-secondary"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Recommended calculation: ₹10 per KM (₹{selectedLog.kms * 10})</span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setApprovalModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2 text-xs font-bold">Approve Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit modal */}
      {editModalOpen && editLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-205 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Edit Travel Log</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 dark:bg-slate-955 p-3.5 rounded-2xl space-y-1 text-slate-550">
                <div>Worker: <span className="font-bold text-slate-800 dark:text-slate-100">{editLog.workerId?.name}</span></div>
                {editLog.jobId && <div>Job: <span className="font-bold text-slate-800 dark:text-slate-100">{editLog.jobId.title}</span></div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Type</label>
                  <select
                    value={editType}
                    onChange={(e: any) => setEditType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  >
                    <option value="job">Cleanup (job)</option>
                    <option value="home">Home (home)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Origin (From)</label>
                  <input
                    type="text"
                    value={editFromLocation}
                    onChange={(e) => setEditFromLocation(e.target.value)}
                    placeholder="e.g. Home"
                    className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Destination (To)</label>
                  <input
                    type="text"
                    value={editToLocation}
                    onChange={(e) => setEditToLocation(e.target.value)}
                    placeholder="e.g. Site"
                    className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Distance (KM)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editKms}
                    onChange={(e) => setEditKms(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Allowance (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editAllowance}
                    onChange={(e) => setEditAllowance(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2 text-xs font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Travel Log Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-205 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Add New Travel Log</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">Choose Worker</label>
                <select
                  required
                  value={createWorkerId}
                  onChange={(e) => setCreateWorkerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2.5 outline-none focus:border-secondary"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map((w) => (
                    <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">Travel Type</label>
                  <select
                    value={createType}
                    onChange={(e: any) => {
                      setCreateType(e.target.value);
                      if (e.target.value === 'home') {
                        setCreateFromLocation('Last Work Site');
                        setCreateToLocation('Home');
                      } else {
                        setCreateFromLocation('Home');
                        setCreateToLocation('Work Site');
                      }
                    }}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  >
                    <option value="home">Home Travel (Shift End)</option>
                    <option value="job">Job Commute</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">From Location</label>
                  <input
                    type="text"
                    required
                    value={createFromLocation}
                    onChange={(e) => setCreateFromLocation(e.target.value)}
                    placeholder="e.g. Site"
                    className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">To Location</label>
                  <input
                    type="text"
                    required
                    value={createToLocation}
                    onChange={(e) => setCreateToLocation(e.target.value)}
                    placeholder="e.g. Home"
                    className="w-full text-xs rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">Distance (KM)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={createKms}
                    onChange={(e) => {
                      setCreateKms(e.target.value);
                      setCreateAllowance((Number(e.target.value) * 10).toString());
                    }}
                    placeholder="Distance back home"
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1.5 uppercase">Allowance (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={createAllowance}
                    onChange={(e) => setCreateAllowance(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2 text-xs font-bold">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminFuel;

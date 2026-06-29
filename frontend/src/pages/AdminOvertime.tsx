import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Clock, Plus, Trash2, Calendar, User, DollarSign, FileClock } from 'lucide-react';

interface AdminOvertimeProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminOvertime: React.FC<AdminOvertimeProps> = ({ companyFilter }) => {
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [ratePerHour, setRatePerHour] = useState('100'); // default rate
  const [reason, setReason] = useState('');

  const fetchOvertimesAndWorkers = async () => {
    setLoading(true);
    try {
      const overRes = await api.get('/overtime');
      setOvertimes(overRes.data);

      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      setWorkers(workersRes.data);
    } catch (err) {
      console.error('Failed to fetch overtime data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOvertimesAndWorkers();
  }, [companyFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) {
      alert('Please choose a worker');
      return;
    }
    try {
      await api.post('/overtime', {
        workerId,
        date,
        hours: Number(hours),
        ratePerHour: Number(ratePerHour),
        reason
      });
      alert('Overtime charge recorded successfully!');
      setModalOpen(false);
      resetForm();
      fetchOvertimesAndWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record overtime');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this overtime log?')) return;
    try {
      await api.delete(`/overtime/${id}`);
      alert('Overtime record deleted successfully');
      fetchOvertimesAndWorkers();
    } catch (err) {
      alert('Failed to delete overtime record');
    }
  };

  const resetForm = () => {
    setWorkerId('');
    setDate(new Date().toISOString().split('T')[0]);
    setHours('');
    setRatePerHour('100');
    setReason('');
  };

  const filteredOvertimes = overtimes.filter((ot) => {
    if (companyFilter === 'All') return true;
    return ot.workerId?.company === companyFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Overtime Charges Registry</h2>
          <p className="text-xs text-slate-400 mt-0.5">Record and audit extra hourly work completed by team members</p>
        </div>

        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="btn-blue-gradient flex items-center space-x-2 rounded-custom px-4 py-3.5 text-xs font-bold"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Record Overtime</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredOvertimes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No overtime charges registered currently.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Hours logged</th>
                  <th className="px-6 py-4">Rate (per Hour)</th>
                  <th className="px-6 py-4">Total Pay</th>
                  <th className="px-6 py-4">Reason / Notes</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredOvertimes.map((ot) => (
                  <tr key={ot._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-3.5 flex items-center space-x-3">
                      <span className="font-bold text-slate-850 dark:text-white">{ot.workerId?.name}</span>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded uppercase">
                        {ot.workerId?.company}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 font-medium">{ot.date}</td>

                    <td className="px-6 py-3.5 font-semibold text-secondary">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{ot.hours} hrs</span>
                      </span>
                    </td>

                    <td className="px-6 py-3.5 font-semibold text-slate-650 dark:text-slate-200">₹{ot.ratePerHour}/hr</td>

                    <td className="px-6 py-3.5 font-extrabold text-success text-sm">₹{ot.totalCharges}</td>

                    <td className="px-6 py-3.5 text-slate-450 max-w-[200px] truncate" title={ot.reason}>{ot.reason || 'N/A'}</td>

                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(ot._id)}
                        className="rounded-lg bg-slate-105 dark:bg-slate-800 p-2 text-slate-500 hover:text-danger hover:bg-danger/10"
                        title="Delete Overtime"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-850 dark:text-white text-base">Record Overtime Hours</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Choose Worker</label>
                <select
                  required
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map((w) => (
                    <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="E.g., 2"
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Rate Per Hour (₹)</label>
                <input
                  type="number"
                  required
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Task Description / Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g., Sofa Clean overtime extension"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Record Overtime</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminOvertime;

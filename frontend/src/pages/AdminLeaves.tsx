import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck
} from 'lucide-react';

interface AdminLeavesProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminLeaves: React.FC<AdminLeavesProps> = ({ companyFilter }) => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leaves?company=${companyFilter}`);
      setLeaves(res.data);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [companyFilter]);

  const handleProcessLeave = async (id: string, status: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to set this leave request as ${status.toUpperCase()}?`)) return;
    try {
      await api.put(`/leaves/${id}/process`, { status });
      alert(`Leave request has been ${status}.`);
      fetchLeaves();
    } catch (err) {
      alert('Failed to process leave request');
    }
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (activeTab === 'all') return true;
    return leave.status === activeTab;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Leave Approvals Panel</h2>
        <p className="text-xs text-slate-400 mt-0.5">Approve or reject leave requests submitted by cleaning service staff</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`rounded-t-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-secondary text-secondary font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-250'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Requests table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No leave logs found under this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Reason for Leave</th>
                  <th className="px-6 py-4">Status</th>
                  {activeTab === 'pending' && <th className="px-6 py-4 text-center">Process</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                    {/* Worker Info */}
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <img
                        src={leave.workerId?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${leave.workerId?.name}`}
                        alt={leave.workerId?.name}
                        className="h-8.5 w-8.5 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                      />
                      <div>
                        <span className="block font-semibold text-slate-800 dark:text-slate-200">{leave.workerId?.name || 'Deleted User'}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{leave.workerId?.phone}</span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-6 py-4">
                      <span className="inline-block text-[9px] font-bold bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full uppercase">
                        {leave.workerId?.company}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                      <div>
                        <div>{new Date(leave.startDate).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">to {new Date(leave.endDate).toLocaleDateString()}</div>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={leave.reason}>
                      "{leave.reason}"
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        leave.status === 'approved' ? 'bg-success/15 text-success' :
                        leave.status === 'rejected' ? 'bg-danger/15 text-danger' :
                        'bg-slate-150 text-slate-450'
                      }`}>
                        {leave.status}
                      </span>
                    </td>

                    {/* Controls (For pending only) */}
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => handleProcessLeave(leave._id, 'approved')}
                            className="rounded-lg bg-emerald-500/10 hover:bg-emerald-550/20 text-success p-2"
                            title="Approve Leave"
                          >
                            <CheckCircle className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleProcessLeave(leave._id, 'rejected')}
                            className="rounded-lg bg-danger/10 hover:bg-danger/15 text-danger p-2"
                            title="Reject Leave"
                          >
                            <XCircle className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminLeaves;

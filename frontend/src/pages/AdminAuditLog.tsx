import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { History, Filter } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-secondary/15 text-secondary',
  updated: 'bg-amber-500/15 text-amber-500',
  deleted: 'bg-danger/15 text-danger',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger'
};

const ENTITY_TYPES = ['Attendance', 'SalaryRequest', 'TravelLog', 'Overtime', 'Leave', 'Worker', 'Job', 'Settings'];

const AdminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entityType, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Admin Audit Log</h2>
        <p className="text-xs text-slate-400 mt-0.5">Track every edit, approval, and deletion made by admins</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>

        <select
          value={entityType}
          onChange={(e) => { setPage(1); setEntityType(e.target.value); }}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3 py-2 outline-none focus:border-secondary"
        >
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => { setPage(1); setStartDate(e.target.value); }}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3 py-2 outline-none focus:border-secondary"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setPage(1); setEndDate(e.target.value); }}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-3 py-2 outline-none focus:border-secondary"
        />

        {(entityType || startDate || endDate) && (
          <button
            onClick={() => { setPage(1); setEntityType(''); setStartDate(''); setEndDate(''); }}
            className="text-xs font-bold text-secondary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Log table */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom flex flex-col items-center space-y-2">
            <History className="h-6 w-6 text-slate-350" />
            <span>No audit log entries found for this filter.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">When</th>
                    <th className="px-6 py-4">Admin</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-550 dark:text-slate-350 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-850 dark:text-white">
                        {log.adminId?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ACTION_COLORS[log.action] || 'bg-slate-200 text-slate-500'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-650 dark:text-slate-200">{log.entityType}</td>
                      <td className="px-6 py-3.5 text-slate-450 max-w-[350px] truncate" title={log.summary}>{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-slate-450">
              <span>Page {page} of {totalPages} • {total} total entries</span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-205 dark:border-slate-800 px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-205 dark:border-slate-800 px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default AdminAuditLog;

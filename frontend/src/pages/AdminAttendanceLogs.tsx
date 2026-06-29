import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Camera, MapPin, Smartphone, CheckCircle2, UserCheck, Calendar } from 'lucide-react';

interface AdminAttendanceLogsProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminAttendanceLogs: React.FC<AdminAttendanceLogsProps> = ({ companyFilter }) => {
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSelfieUrl, setSelectedSelfieUrl] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/today');
      setAttendanceLogs(res.data);
    } catch (err) {
      console.error('Failed to load today\'s attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [companyFilter]);

  // Filter logs by selected company branch
  const filteredLogs = attendanceLogs.filter((log) => {
    if (companyFilter === 'All') return true;
    return log.workerId?.company === companyFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Today's Attendance Register</h2>
          <p className="text-xs text-slate-400 mt-0.5">Audit verified worker selfie uploads and clock-in hardware specs</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-custom px-3 py-2">
          <Calendar className="h-4 w-4 text-secondary" />
          <span>{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </div>
      </div>

      {/* Grid table */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No employees have clocked in from this branch today.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Worker Profile</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Clock-In Time</th>
                  <th className="px-6 py-4">GPS Position</th>
                  <th className="px-6 py-4">Device Specs</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Selfie Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-3.5 flex items-center space-x-3">
                      <img
                        src={log.workerId?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${log.workerId?.name}`}
                        alt={log.workerId?.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                      />
                      <div>
                        <span className="block font-bold text-slate-850 dark:text-white">{log.workerId?.name}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{log.workerId?.phone}</span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded uppercase">
                        {log.workerId?.company}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 font-medium">
                      {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    <td className="px-6 py-3.5 text-slate-500">
                      {log.location?.lat && log.location?.lng ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 hover:text-secondary hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.location.lat.toFixed(5)}, {log.location.lng.toFixed(5)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">No GPS Data</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-slate-400 max-w-[150px] truncate" title={log.deviceInfo}>
                      <span className="flex items-center space-x-1">
                        <Smartphone className="h-3.5 w-3.5" />
                        <span className="truncate">{log.deviceInfo}</span>
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        log.status === 'present' ? 'bg-success/15 text-success' :
                        log.status === 'late' ? 'bg-warning/15 text-warning' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedSelfieUrl(log.selfie)}
                        className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-550 hover:bg-secondary/15 hover:text-secondary transition-colors"
                        title="Review Selfie Photo"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selfie review modal */}
      {selectedSelfieUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-widest">Clock-In Selfie Check</span>
              <button onClick={() => setSelectedSelfieUrl(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-55 dark:bg-slate-950">
              <img
                src={selectedSelfieUrl}
                alt="Verification Selfie"
                className="max-h-[50vh] object-contain rounded-2xl border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAttendanceLogs;

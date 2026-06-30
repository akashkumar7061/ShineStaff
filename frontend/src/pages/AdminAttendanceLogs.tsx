import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import GPSAddress from '../components/GPSAddress';
import { Camera, Smartphone, Calendar, Plus, Edit } from 'lucide-react';

interface AdminAttendanceLogsProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminAttendanceLogs: React.FC<AdminAttendanceLogsProps> = ({ companyFilter }) => {
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSelfieUrl, setSelectedSelfieUrl] = useState<string | null>(null);

  // Manual mark attendance modal state
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'present' | 'late' | 'absent' | 'half-day'>('present');

  // Edit attendance modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState('');
  const [editStatus, setEditStatus] = useState<'present' | 'late' | 'absent' | 'half-day'>('present');
  const [editDate, setEditDate] = useState('');
  const [editCheckInTime, setEditCheckInTime] = useState('');

  const fetchLogsAndWorkers = async () => {
    setLoading(true);
    try {
      const logsRes = await api.get('/attendance/today');
      setAttendanceLogs(logsRes.data);

      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      setWorkers(workersRes.data);
    } catch (err) {
      console.error('Failed to load today\'s attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndWorkers();
  }, [companyFilter]);

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) {
      alert('Please choose a worker');
      return;
    }
    try {
      await api.post('/attendance/manual', {
        workerId,
        date,
        status
      });
      alert('Attendance marked successfully!');
      setMarkModalOpen(false);
      setWorkerId('');
      fetchLogsAndWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record attendance');
    }
  };

  const handleEditAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogId) return;
    try {
      await api.put(`/attendance/${selectedLogId}`, {
        status: editStatus,
        date: editDate,
        checkInTime: editCheckInTime
      });
      alert('Attendance record updated successfully!');
      setEditModalOpen(false);
      fetchLogsAndWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Today's Attendance Register</h2>
          <p className="text-xs text-slate-400 mt-0.5">Audit verified worker selfie uploads and manually log attendance states</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => { setWorkerId(''); setMarkModalOpen(true); }}
            className="btn-blue-gradient flex items-center space-x-2 rounded-custom px-4 py-3 text-xs font-bold"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Mark Attendance</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-405 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-custom px-3 py-2.5">
            <Calendar className="h-4 w-4 text-secondary" />
            <span>{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          </div>
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
        ) : workers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No employees registered in this branch.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Worker Profile</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Clock-In Time</th>
                  <th className="px-6 py-4">GPS Position</th>
                  <th className="px-6 py-4">Device Specs</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {workers.map((worker) => {
                  const log = attendanceLogs.find(l => (l.workerId?._id || l.workerId) === worker._id);
                  return (
                    <tr key={worker._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-3.5 flex items-center space-x-3">
                        <img
                          src={worker.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${worker.name}`}
                          alt={worker.name}
                          className="h-8 w-8 rounded-full object-cover border border-slate-205 dark:border-slate-800"
                        />
                        <div>
                          <span className="block font-bold text-slate-850 dark:text-white">{worker.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{worker.phone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded uppercase">
                          {worker.company}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 font-medium">
                        {log ? (
                          new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-slate-400 font-semibold italic">Not Marked</span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-slate-500">
                        {log?.location?.lat && log?.location?.lng ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center space-x-1 hover:text-secondary"
                          >
                            <GPSAddress lat={log.location.lat} lng={log.location.lng} />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-slate-400 max-w-[150px] truncate" title={log?.deviceInfo || ''}>
                        {log ? (
                          <span className="flex items-center space-x-1">
                            <Smartphone className="h-3.5 w-3.5" />
                            <span className="truncate">{log.deviceInfo}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          log?.status === 'present' ? 'bg-success/15 text-success' :
                          log?.status === 'late' ? 'bg-warning/15 text-warning' :
                          log?.status === 'half-day' ? 'bg-indigo-500/15 text-indigo-500' :
                          'bg-danger/15 text-danger'
                        }`}>
                          {log ? (log.status === 'half-day' ? 'Half-Day' : log.status) : 'Absent'}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-center flex items-center justify-center space-x-3.5">
                        {log ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedSelfieUrl(log.selfie)}
                              className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-550 hover:bg-secondary/15 hover:text-secondary transition-colors"
                              title="Review Selfie Photo"
                              disabled={!log.selfie}
                            >
                              <Camera className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLogId(log._id);
                                setEditStatus(log.status);
                                setEditDate(log.date);
                                setEditCheckInTime(log.checkInTime ? new Date(log.checkInTime).toISOString().slice(0, 16) : '');
                                setEditModalOpen(true);
                              }}
                              className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-550 hover:bg-amber-500/15 hover:text-amber-500 transition-colors"
                              title="Edit Attendance Record"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setWorkerId(worker._id); setStatus('present'); setMarkModalOpen(true); }}
                            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3.5 py-1.5 uppercase transition-colors"
                          >
                            Mark Attendance
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual marking modal */}
      {markModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Mark Manual Attendance</h3>
              <button onClick={() => setMarkModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleMarkAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Choose Worker</label>
                <select
                  required
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map((w) => (
                    <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                  ))}
                </select>
              </div>

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
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                >
                  <option value="present">Present (On Time)</option>
                  <option value="late">Late</option>
                  <option value="half-day">Half-Day (Half Time)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setMarkModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Mark Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit attendance modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Edit Attendance Record</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleEditAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                >
                  <option value="present">Present (On Time)</option>
                  <option value="late">Late</option>
                  <option value="half-day">Half-Day (Half Time)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Date</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Check-In Time</label>
                <input
                  type="datetime-local"
                  value={editCheckInTime}
                  onChange={(e) => setEditCheckInTime(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selfie review modal */}
      {selectedSelfieUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-widest">Clock-In Selfie Check</span>
              <button onClick={() => setSelectedSelfieUrl(null)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-55 dark:bg-slate-950">
              <img
                src={selectedSelfieUrl}
                alt="Verification Selfie"
                className="max-h-[50vh] object-contain rounded-2xl border border-slate-205 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAttendanceLogs;

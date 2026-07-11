import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Calendar,
  Clock,
  UserCheck
} from 'lucide-react';

const WorkerAttendance: React.FC = () => {
  const { user } = useAuth();

  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendanceData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await api.get(`/attendance/worker/${user.id}`);
      setAttendanceHistory(attRes.data);

      const todayAtt = attRes.data.find((a: any) => a.date === todayStr);
      setAttendanceToday(todayAtt);
    } catch (error) {
      console.error('Error fetching worker attendance register:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="relative pb-20 max-w-full">
        {/* Main Content */}
        <main className="relative z-10 max-w-full px-4 md:px-6 lg:px-8 py-8 pt-24 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Attendance Register</h2>
            <p className="text-xs text-slate-400 mt-1">Verify your daily present and late wage logs approved by admin</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="animate-shimmer h-24 w-full rounded-2xl" />
              <div className="animate-shimmer h-48 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Daily checkin card */}
              <div className="glass-card p-6 relative overflow-hidden border-t-4 border-t-emerald-500 shadow-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl" />
                <h3 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-4 flex items-center space-x-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  <span>Today's Status</span>
                </h3>
                
                {attendanceToday ? (
                  <div className="flex items-center justify-between bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/10">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-450 block">Attendance Recorded</span>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Clocked: {new Date(attendanceToday.checkInTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        attendanceToday.status === 'present' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                      }`}>
                        {attendanceToday.status}
                      </span>
                      {attendanceToday.status === 'late' && attendanceToday.lateReason && (
                        <span className="text-[9px] text-amber-500 font-bold max-w-[150px] text-right truncate" title={attendanceToday.lateReason}>
                          Reason: {attendanceToday.lateReason}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                      Attendance not marked yet. Admin will log it manually.
                    </span>
                  </div>
                )}
              </div>

              {/* Attendance Register History */}
              <div className="glass-card p-6 border-t-4 border-t-indigo-500 shadow-xl">
                <h3 className="text-xs font-extrabold text-slate-455 uppercase tracking-widest mb-4 flex items-center space-x-1.5">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Attendance Logs Sheet</span>
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {attendanceHistory.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No attendance logs saved yet.</p>
                  ) : (
                    attendanceHistory.map((att: any) => (
                      <div key={att._id} className="flex justify-between items-center text-xs p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-805">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{att.date}</span>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Clocked: {new Date(att.checkInTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                            att.status === 'present' ? 'bg-success/15 text-success' :
                            att.status === 'late' ? 'bg-warning/15 text-warning' :
                            'bg-slate-200 text-slate-500'
                          }`}>
                            {att.status}
                          </span>
                          {att.status === 'late' && att.lateReason && (
                            <span className="text-[9px] text-amber-500 font-bold max-w-[150px] text-right truncate" title={att.lateReason}>
                              Reason: {att.lateReason}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>
    </div>
  );
};

export default WorkerAttendance;

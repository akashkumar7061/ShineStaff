import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Activity, RefreshCw } from 'lucide-react';

interface AdminActivitiesProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminActivities: React.FC<AdminActivitiesProps> = ({ companyFilter }) => {
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const attRes = await api.get('/attendance/today');
      const attToday = attRes.data;

      const jobsRes = await api.get(`/jobs?company=${companyFilter}`);
      const jobs = jobsRes.data;
      const completedJobs = jobs.filter((j: any) => j.status === 'completed');
      const activeJobs = jobs.filter((j: any) => j.status === 'started');

      const activities: any[] = [];
      attToday.forEach((a: any) => {
        if (companyFilter === 'All' || a.workerId?.company === companyFilter) {
          activities.push({
            id: `att_${a._id}`,
            type: 'attendance',
            message: `${a.workerId?.name || 'Worker'} checked in as ${a.status.toUpperCase()}`,
            time: new Date(a.checkInTime)
          });
        }
      });
      completedJobs.forEach((j: any) => {
        activities.push({
          id: `job_${j._id}`,
          type: 'job',
          message: `Cleanup job "${j.title}" completed by ${(j.workerId as any)?.name || 'Worker'}`,
          time: new Date(j.completedAt)
        });
      });
      activeJobs.forEach((j: any) => {
        activities.push({
          id: `job_start_${j._id}`,
          type: 'job_started',
          message: `Cleanup job "${j.title}" started by ${(j.workerId as any)?.name || 'Worker'}`,
          time: new Date(j.startedAt)
        });
      });

      activities.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivitiesList(activities);
    } catch (err) {
      console.error('Failed to fetch recent activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [companyFilter]);

  return (
    <div className="space-y-6 max-w-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Recent Activity Registry</h2>
          <p className="text-xs text-slate-400 mt-0.5">Chronological system events and logs reported today</p>
        </div>
        <button
          onClick={fetchActivities}
          className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-650 hover:text-secondary hover:scale-105 active:scale-95 transition-transform"
          title="Refresh Log Timeline"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Activity Timeline Card */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="animate-shimmer h-40 w-full rounded-custom" />
        ) : activitiesList.length === 0 ? (
          <div className="text-center py-12 text-slate-455 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No system actions recorded today.
          </div>
        ) : (
          <div className="relative border-l border-slate-150 dark:border-slate-800 ml-3 space-y-6">
            {activitiesList.map((act) => (
              <div key={act.id} className="relative pl-6">
                {/* Status Bullet */}
                <span className={`absolute left-0 top-1.5 -ml-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  act.type === 'attendance' ? 'bg-success' :
                  act.type === 'job' ? 'bg-secondary' :
                  'bg-warning'
                }`} />
                
                <div>
                  <p className="text-xs font-semibold text-slate-750 dark:text-slate-200">
                    {act.message}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminActivities;

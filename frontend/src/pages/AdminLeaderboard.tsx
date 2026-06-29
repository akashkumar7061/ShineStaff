import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Leaderboard from '../components/Leaderboard';
import { Trophy } from 'lucide-react';

interface AdminLeaderboardProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminLeaderboard: React.FC<AdminLeaderboardProps> = ({ companyFilter }) => {
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      setWorkersList(workersRes.data);

      const jobsRes = await api.get(`/jobs?company=${companyFilter}`);
      setJobsList(jobsRes.data);

      const attRes = await api.get('/attendance/today');
      setAttendanceLogs(attRes.data);
    } catch (err) {
      console.error('Failed to load leaderboard datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyFilter]);

  const leaderboardWorkers = workersList.map((w) => {
    const completed = jobsList.filter((j) => j.workerId?._id === w._id && j.status === 'completed').length;
    const total = jobsList.filter((j) => j.workerId?._id === w._id).length;
    const attCount = attendanceLogs.filter((a) => a.workerId?._id === w._id).length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    const attendanceRate = Math.min(100, Math.round((attCount / 30) * 100)) || 85;
    const score = Math.round((completionRate * 0.6) + (attendanceRate * 0.4));

    return {
      id: w._id,
      name: w.name,
      photo: w.photo,
      company: w.company,
      completedJobs: completed,
      attendanceRate,
      performanceScore: score
    };
  });

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Worker Performance Leaderboard</h2>
        <p className="text-xs text-slate-400 mt-0.5">Top performing cleaning service workers ranked by task completions and attendance</p>
      </div>

      {loading ? (
        <div className="animate-shimmer h-64 w-full rounded-custom" />
      ) : (
        <Leaderboard workers={leaderboardWorkers} />
      )}

    </div>
  );
};

export default AdminLeaderboard;

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import MapView from '../components/MapView';
import { Map, RefreshCw } from 'lucide-react';

interface AdminMapTrackingProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminMapTracking: React.FC<AdminMapTrackingProps> = ({ companyFilter }) => {
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const [workersRes, jobsRes] = await Promise.all([
        api.get(`/workers?company=${companyFilter}`),
        api.get(`/jobs?company=${companyFilter}`)
      ]);
      setWorkersList(workersRes.data);
      setJobsList(jobsRes.data);
    } catch (err) {
      console.error('Failed to load map tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [companyFilter]);

  useEffect(() => {
    const handleLocationUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || !data.workerId || !data.lat || !data.lng) return;

      // Real-time live coordinate update inside state lists
      setWorkersList((prevList) =>
        prevList.map((w) => {
          if (w._id === data.workerId) {
            return {
              ...w,
              currentLocation: { lat: data.lat, lng: data.lng },
              lastActive: data.lastActive || new Date()
            };
          }
          return w;
        })
      );
    };

    window.addEventListener('worker-location-update', handleLocationUpdate);
    return () => window.removeEventListener('worker-location-update', handleLocationUpdate);
  }, []);

  // Filter workers and jobs by search query
  const filteredWorkers = searchQuery
    ? workersList.filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : workersList;

  const filteredJobs = searchQuery
    ? jobsList.filter((j) => {
        const workerName = (j.workerId as any)?.name || '';
        return workerName.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : jobsList;

  // Aggregate map pins - ONLY showing worker locations as requested by the user
  const mapPins = filteredWorkers
    .filter((w) => w.currentLocation?.lat && w.currentLocation?.lng)
    .map((w) => ({
      id: w._id,
      name: w.name,
      lat: w.currentLocation.lat,
      lng: w.currentLocation.lng,
      type: 'worker' as const,
      info: `Status: ${w.status} | Last active: ${w.lastActive ? new Date(w.lastActive).toLocaleTimeString() : 'N/A'}`
    }));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Live Worker GPS Tracking</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time GPS coordinate overlays for active cleaning crews</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              list="workers-list"
              placeholder="Search worker by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 pr-10 outline-none focus:border-secondary transition-all"
            />
            <datalist id="workers-list">
              {workersList.map((w) => (
                <option key={w._id} value={w.name}>
                  {w.company}
                </option>
              ))}
            </datalist>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={fetchTrackingData}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-650 hover:text-secondary hover:scale-105 active:scale-95 transition-transform"
            title="Refresh Map Markers"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Map View Box */}
      <div className="glass-card p-6 h-[72vh] min-h-[500px]">
        {loading ? (
          <div className="animate-shimmer h-full w-full rounded-custom" />
        ) : (
          <MapView pins={mapPins} />
        )}
      </div>

    </div>
  );
};

export default AdminMapTracking;

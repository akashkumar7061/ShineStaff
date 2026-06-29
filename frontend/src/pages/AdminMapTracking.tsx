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

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      setWorkersList(workersRes.data);

      const jobsRes = await api.get(`/jobs?company=${companyFilter}`);
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

  // Aggregate map pins
  const mapPins = [
    ...workersList
      .filter((w) => w.currentLocation?.lat && w.currentLocation?.lng)
      .map((w) => ({
        id: w._id,
        name: w.name,
        lat: w.currentLocation.lat,
        lng: w.currentLocation.lng,
        type: 'worker' as const,
        info: `Status: ${w.status} | Last active: ${w.lastActive ? new Date(w.lastActive).toLocaleTimeString() : 'N/A'}`
      })),
    ...jobsList
      .filter((j) => j.location?.lat && j.location?.lng)
      .map((j) => ({
        id: j._id,
        name: j.title,
        lat: j.location.lat,
        lng: j.location.lng,
        type: 'job' as const,
        company: j.company,
        info: `Client: ${j.clientName} | Status: ${j.status.toUpperCase()}`
      }))
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Live Worker GPS Tracking</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time GPS coordinate overlays for active cleaning crews</p>
        </div>
        <button
          onClick={fetchTrackingData}
          className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-650 hover:text-secondary hover:scale-105 active:scale-95 transition-transform"
          title="Refresh Map Markers"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
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

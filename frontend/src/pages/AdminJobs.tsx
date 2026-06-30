import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import MapView from '../components/MapView';
import GPSAddress from '../components/GPSAddress';
import {
  Plus,
  Briefcase,
  User,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Trash2,
  X,
  Compass,
  CheckCircle,
  FileCheck2,
  Clock,
  DollarSign
} from 'lucide-react';

interface AdminJobsProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const timeSlotsList = [
  '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM'
];

const AdminJobs: React.FC<AdminJobsProps> = ({ companyFilter }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'started' | 'completed' | 'cancelled'>('all');

  // Modals visibility
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedJobPhotos, setSelectedJobPhotos] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState<'SofaShine' | 'CleanCruisers'>('SofaShine');
  const [workerId, setWorkerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(timeSlotsList[0]);

  const fetchJobsAndWorkers = async () => {
    setLoading(true);
    try {
      const jobsRes = await api.get(`/jobs?company=${companyFilter}`);
      setJobs(jobsRes.data);

      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      setWorkers(workersRes.data);
    } catch (err) {
      console.error('Failed to load jobs/workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndWorkers();

    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'JOB_COMPLETED') {
        fetchJobsAndWorkers();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [companyFilter]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/jobs', {
        title,
        description,
        company,
        workerId,
        clientName,
        clientPhone,
        address,
        locationName,
        price: Number(price) || 0,
        date,
        timeSlot
      });
      alert('Cleanup job created and worker notified!');
      setCreateModalOpen(false);
      resetForm();
      fetchJobsAndWorkers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create job');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      alert('Job deleted successfully');
      fetchJobsAndWorkers();
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const handleCancelJob = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this job?')) return;
    try {
      await api.put(`/jobs/${id}/cancel`);
      alert('Job cancelled successfully');
      fetchJobsAndWorkers();
    } catch (err) {
      alert('Failed to cancel job');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCompany('SofaShine');
    setWorkerId('');
    setClientName('');
    setClientPhone('');
    setAddress('');
    setLocationName('');
    setPrice('');
    setDate('');
    setTimeSlot(timeSlotsList[0]);
  };

  const handleOpenPhotoComparison = (job: any) => {
    setSelectedJobPhotos(job);
    setPhotoModalOpen(true);
  };

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === 'all') return true;
    return job.status === activeTab;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Job Scheduling Board</h2>
          <p className="text-xs text-slate-400 mt-0.5">Assign tasks, track status timelines, and review photo compliance logs</p>
        </div>

        <button
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="btn-blue-gradient flex items-center space-x-2 rounded-custom px-4 py-3.5 text-xs font-bold"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Assign New Cleanup</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {['all', 'pending', 'started', 'completed', 'cancelled'].map((tab) => (
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

      {/* Jobs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="animate-shimmer h-44 rounded-custom" />
          ))
        ) : filteredJobs.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            No assigned cleanups listed in this state currently.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job._id}
              className="glass-card p-5 border border-slate-100 dark:border-slate-850 hover:scale-[1.01] transition-transform space-y-4"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block text-[9px] font-bold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full uppercase">
                    {job.company}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    job.status === 'completed' ? 'text-success' :
                    job.status === 'started' ? 'text-secondary' :
                    job.status === 'cancelled' ? 'text-danger' :
                    'text-warning'
                  }`}>
                    {job.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{job.title}</h3>
                
                <p className="text-xs text-slate-550 dark:text-slate-350 mt-1.5">
                  📍 {job.address} 
                  {job.locationName && (
                    <span className="text-[10px] font-bold text-violet-500 block mt-0.5">GPS Area: {job.locationName}</span>
                  )}
                </p>

                {/* Price & Schedule details inside card */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-450">
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Price Payout</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">₹{job.price || 0}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Schedule Time</span>
                    <span className="font-semibold text-secondary block">{job.date || 'N/A'}</span>
                    <span className="text-[9px] text-slate-400">{job.timeSlot || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                  👤 Assigned: <span className="font-semibold text-slate-700 dark:text-slate-350">{job.workerId?.name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Photo stamp compliance flags */}
              <div className="flex space-x-2 text-[9px] uppercase tracking-wider font-bold">
                <span className={`px-2 py-0.5 rounded ${job.beforePhoto ? 'bg-success/15 text-success' : 'bg-slate-100 text-slate-400'}`}>
                  Before Photo
                </span>
                <span className={`px-2 py-0.5 rounded ${job.afterPhoto ? 'bg-success/15 text-success' : 'bg-slate-100 text-slate-400'}`}>
                  After Photo
                </span>
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-1">
                <div>Client: <span className="font-medium text-slate-650 dark:text-slate-200">{job.clientName} ({job.clientPhone})</span></div>
                {job.fuelKmsTravelled > 0 && (
                  <div className="text-success font-semibold">⛽ Fuel allowance: ₹{job.fuelAllowance} ({job.fuelKmsTravelled} KM)</div>
                )}
              </div>

              {/* Actions footer */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {job.status === 'completed' ? (
                  <button
                    onClick={() => handleOpenPhotoComparison(job)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-secondary hover:underline"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>View Photos</span>
                  </button>
                ) : (
                  <div className="w-1" />
                )}

                <div className="flex space-x-2">
                  {job.status !== 'completed' && job.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancelJob(job._id)}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[10px] font-bold text-danger uppercase hover:bg-danger/5"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteJob(job._id)}
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:text-danger hover:bg-danger/10"
                    title="Delete Job"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assign Job Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-850 dark:text-white text-base">Assign New Cleaning Job</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Job Title</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sofa Clean / Floor Scrub" className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Company Branch</label>
                  <select value={company} onChange={(e) => setCompany(e.target.value as any)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary">
                    <option value="SofaShine">SofaShine</option>
                    <option value="CleanCruisers">CleanCruisers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Assign Worker</label>
                  <select required value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary">
                    <option value="">-- Choose Worker --</option>
                    {workers.map((w) => (
                      <option key={w._id} value={w._id}>{w.name} ({w.company})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Price (₹)</label>
                  <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter job price" className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Client Name</label>
                  <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Client Phone</label>
                  <input type="text" required value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Site Address</label>
                <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street location details..." className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary resize-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">GPS Location Name (Area / Landmark)</label>
                <input type="text" required value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="E.g., Connaught Place, Mumbai Airport" className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary" />
              </div>

              {/* Schedule and Worker Slot */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 space-y-3.5">
                <span className="block text-[9px] font-bold text-secondary uppercase tracking-widest">Schedule & Time Slots</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Date</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">1-Hour Time Slot (7 AM - 8 PM)</label>
                    <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 outline-none focus:border-secondary">
                      {timeSlotsList.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Special Description Instructions</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary resize-none" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2.5 text-xs font-bold">Assign Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Comparison View Modal */}
      {photoModalOpen && selectedJobPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Photo Compliance Audit</h3>
              <button onClick={() => setPhotoModalOpen(false)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedJobPhotos.title}</h4>
                <p className="text-xs text-slate-400 mt-1">Worker: {selectedJobPhotos.workerId?.name} | Client: {selectedJobPhotos.clientName}</p>
              </div>

              {/* Side by side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Before Photo */}
                <div className="glass-card overflow-hidden">
                  <span className="block bg-warning/10 text-warning text-[10px] font-bold text-center py-2 uppercase tracking-wider">Before Cleaning</span>
                  <div className="aspect-video w-full bg-slate-100 dark:bg-slate-955 flex items-center justify-center">
                    {selectedJobPhotos.beforePhoto ? (
                      <img src={selectedJobPhotos.beforePhoto} alt="Before" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-405">No photo logged</span>
                    )}
                  </div>
                  {selectedJobPhotos.beforePhotoTime && (
                    <div className="p-3 text-[10px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800">
                      <div>🕒 Time: {new Date(selectedJobPhotos.beforePhotoTime).toLocaleString()}</div>
                      {selectedJobPhotos.beforePhotoGPS && (
                        <div className="flex items-center space-x-1">
                          <span>📍 Location: </span>
                          <GPSAddress lat={selectedJobPhotos.beforePhotoGPS.lat} lng={selectedJobPhotos.beforePhotoGPS.lng} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* After Photo */}
                <div className="glass-card overflow-hidden">
                  <span className="block bg-success/10 text-success text-[10px] font-bold text-center py-2 uppercase tracking-wider">After Cleaning</span>
                  <div className="aspect-video w-full bg-slate-100 dark:bg-slate-955 flex items-center justify-center">
                    {selectedJobPhotos.afterPhoto ? (
                      <img src={selectedJobPhotos.afterPhoto} alt="After" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-405">No photo logged</span>
                    )}
                  </div>
                  {selectedJobPhotos.afterPhotoTime && (
                    <div className="p-3 text-[10px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800">
                      <div>🕒 Time: {new Date(selectedJobPhotos.afterPhotoTime).toLocaleString()}</div>
                      {selectedJobPhotos.afterPhotoGPS && (
                        <div className="flex items-center space-x-1">
                          <span>📍 Location: </span>
                          <GPSAddress lat={selectedJobPhotos.afterPhotoGPS.lat} lng={selectedJobPhotos.afterPhotoGPS.lng} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
              
              {/* GPS Audit Map */}
              {(selectedJobPhotos.beforePhotoGPS?.lat || selectedJobPhotos.afterPhotoGPS?.lat) && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">GPS Work Locations Map</span>
                  <div className="h-60 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow">
                    <MapView
                      pins={[
                        ...(selectedJobPhotos.beforePhotoGPS?.lat ? [{
                          id: 'before_gps',
                          name: 'Before Snap Location',
                          lat: selectedJobPhotos.beforePhotoGPS.lat,
                          lng: selectedJobPhotos.beforePhotoGPS.lng,
                          type: 'worker' as const,
                          info: `Started clean: ${new Date(selectedJobPhotos.beforePhotoTime).toLocaleTimeString()}`
                        }] : []),
                        ...(selectedJobPhotos.afterPhotoGPS?.lat ? [{
                          id: 'after_gps',
                          name: 'After Snap Location',
                          lat: selectedJobPhotos.afterPhotoGPS.lat,
                          lng: selectedJobPhotos.afterPhotoGPS.lng,
                          type: 'job' as const,
                          info: `Completed clean: ${new Date(selectedJobPhotos.afterPhotoTime).toLocaleTimeString()}`
                        }] : [])
                      ]}
                      center={selectedJobPhotos.beforePhotoGPS?.lat ? {
                        lat: selectedJobPhotos.beforePhotoGPS.lat,
                        lng: selectedJobPhotos.beforePhotoGPS.lng
                      } : {
                        lat: selectedJobPhotos.afterPhotoGPS.lat,
                        lng: selectedJobPhotos.afterPhotoGPS.lng
                      }}
                      zoom={14}
                    />
                  </div>
                </div>
              )}

              {/* Distance / fuel details */}
              {selectedJobPhotos.fuelKmsTravelled > 0 && (
                <div className="p-4 rounded-custom bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-550/20 text-xs font-semibold text-center">
                  Establishment completed successfully. Verified fuel distance: {selectedJobPhotos.fuelKmsTravelled} KM (+₹{selectedJobPhotos.fuelAllowance} allowance added to wage balance)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminJobs;

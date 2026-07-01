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
  const [filterDate, setFilterDate] = useState('');

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
      let url = `/jobs?company=${companyFilter}`;
      if (filterDate) {
        url += `&date=${filterDate}`;
      }
      const jobsRes = await api.get(url);
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
  }, [companyFilter, filterDate]);

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

      {/* Tabs & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex space-x-1">
          {['all', 'pending', 'started', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`rounded-t-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-secondary text-secondary font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 pb-1.5 md:pb-0">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Scheduled Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/50 p-2 outline-none focus:border-secondary dark:color-scheme-dark"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-xs text-danger font-semibold hover:underline px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs Table Dashboard */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
            No assigned cleanups listed in this state currently.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-55 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Job Details</th>
                  <th className="px-6 py-4">Assigned Worker</th>
                  <th className="px-6 py-4">Client Info</th>
                  <th className="px-6 py-4">Clean Date & Time</th>
                  <th className="px-6 py-4">Address / GPS Position</th>
                  <th className="px-6 py-4 text-center">Price</th>
                  <th className="px-6 py-4 text-center">Compliance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    
                    {/* Job Details */}
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <span className="block font-bold text-slate-850 dark:text-white text-sm">{job.title}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-block text-[8px] font-extrabold bg-secondary/15 text-secondary px-2 py-0.5 rounded uppercase tracking-wider">
                            {job.company}
                          </span>
                          {job.fuelKmsTravelled > 0 && (
                            <span className="inline-block text-[8px] font-extrabold bg-success/15 text-success px-2 py-0.5 rounded uppercase tracking-wider">
                              ⛽ {job.fuelKmsTravelled} KM (+₹{job.fuelAllowance})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assigned Worker */}
                    <td className="px-6 py-5">
                      {job.workerId ? (
                        <div className="space-y-1">
                          <span className="block font-bold text-slate-700 dark:text-slate-200">{job.workerId.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{job.workerId.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* Client Info */}
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <span className="block font-semibold text-slate-750 dark:text-slate-205">{job.clientName}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{job.clientPhone}</span>
                      </div>
                    </td>

                    {/* Clean Date & Time */}
                    <td className="px-6 py-5 font-medium">
                      <div className="space-y-1">
                        <span className="block text-secondary font-bold text-xs">{job.date || 'N/A'}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">{job.timeSlot || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Address / GPS Position */}
                    <td className="px-6 py-5 max-w-[200px]">
                      <div className="space-y-1.5">
                        {job.location?.lat && job.location?.lng ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${job.location.lat},${job.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-slate-600 dark:text-slate-350 hover:text-secondary underline truncate font-medium"
                            title={job.address}
                          >
                            📍 {job.address}
                          </a>
                        ) : (
                          <span className="block text-slate-600 dark:text-slate-350 truncate font-medium" title={job.address}>
                            📍 {job.address}
                          </span>
                        )}
                        {job.locationName && (
                          <span className="block text-[10px] font-bold text-violet-500 truncate" title={job.locationName}>
                            GPS: {job.locationName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-5 text-center font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                      ₹{job.price || 0}
                    </td>

                    {/* Compliance Photos */}
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex space-x-1.5 text-[8px] uppercase tracking-wider font-extrabold">
                          <span className={`px-1.5 py-0.5 rounded ${job.beforePhoto ? 'bg-success/15 text-success' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            Before
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${job.afterPhoto ? 'bg-success/15 text-success' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            After
                          </span>
                        </div>
                        {job.status === 'completed' && (
                          <button
                            onClick={() => handleOpenPhotoComparison(job)}
                            className="flex items-center justify-center space-x-1 text-[10px] font-bold text-secondary hover:underline"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            <span>View Images</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-5 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        job.status === 'completed' ? 'bg-success/15 text-success' :
                        job.status === 'started' ? 'bg-secondary/15 text-secondary' :
                        job.status === 'cancelled' ? 'bg-danger/15 text-danger' :
                        'bg-warning/15 text-warning'
                      }`}>
                        {job.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {job.status !== 'completed' && job.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelJob(job._id)}
                            className="rounded-lg border border-slate-205 dark:border-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-danger uppercase hover:bg-danger/5"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteJob(job._id)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete Job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

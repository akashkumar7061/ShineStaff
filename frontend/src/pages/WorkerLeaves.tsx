import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, Send, Calendar, ListTodo, HelpCircle } from 'lucide-react';

const WorkerLeaves: React.FC = () => {
  const navigate = useNavigate();

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/leaves/apply', { startDate, endDate, reason });
      alert('Leave request submitted to admins!');
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaves();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background color blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-rose-400/15 dark:bg-rose-600/5 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/15 dark:bg-teal-600/5 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4 z-10 relative">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/worker')}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">Leave Tracker</span>
        </div>
      </header>

      {/* Responsive Grid Container */}
      <main className="p-6 max-w-7xl mx-auto space-y-6 z-10 relative">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Leave Request Form */}
          <div className="lg:col-span-1 glass-card p-6 border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-secondary">
              <Calendar className="h-4.5 w-4.5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Apply for Leave</h3>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Reason for Leave</label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason description..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-blue-gradient w-full flex items-center justify-center space-x-2 rounded-custom py-3.5 text-xs font-bold"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </form>
          </div>

          {/* Right Columns: Leaves History list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2 text-slate-400">
              <ListTodo className="h-4.5 w-4.5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Leave Logs history</h3>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="animate-shimmer h-24 w-full rounded-custom" />
              ) : leaves.length === 0 ? (
                <div className="glass-card p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-custom">
                  No leave requests logged yet.
                </div>
              ) : (
                leaves.map((leave) => (
                  <div
                    key={leave._id}
                    className="glass-card p-4.5 border border-slate-100 dark:border-slate-850 flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        📅 {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        Reason: "{leave.reason}"
                      </span>
                    </div>

                    <span className={`rounded-full px-3.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      leave.status === 'approved' ? 'bg-success/15 text-success' :
                      leave.status === 'rejected' ? 'bg-danger/15 text-danger' :
                      'bg-slate-150 text-slate-400'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default WorkerLeaves;

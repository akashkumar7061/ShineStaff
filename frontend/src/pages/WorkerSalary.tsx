import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  DollarSign,
  Download,
  Calendar,
  ArrowLeft,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';

const WorkerSalary: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // YYYY-MM
  });

  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get(`/salary/dashboard?workerId=${user.id}&month=${selectedMonth}`);
      setDashboard(res.data);
    } catch (error) {
      console.error('Failed to load salary dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedMonth]);

  const handleDownloadPayslip = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    window.open(`/api/salary/payslip?month=${selectedMonth}&token=${token}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 pb-20 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden relative">
      
      {/* Background color blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none z-0">
        <div className="absolute top-10 left-10 h-[250px] w-[250px] rounded-full bg-emerald-400/15 dark:bg-emerald-600/5 blur-[80px]" />
        <div className="absolute bottom-20 right-10 h-[300px] w-[300px] rounded-full bg-teal-400/15 dark:bg-teal-600/5 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-205/85 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4 z-10 relative">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/worker')}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">Wages & Payouts</span>
        </div>
      </header>

      {/* Main Grid Container */}
      <main className="p-6 max-w-4xl mx-auto space-y-6 z-10 relative">
        
        {/* Month selector */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-custom border border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">Select Payout Cycle</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-55 dark:bg-slate-950 px-3.5 py-1.5 outline-none font-semibold text-secondary"
          />
        </div>

        {loading ? (
          <div className="animate-shimmer h-64 w-full rounded-custom" />
        ) : (
          <div className="space-y-6">
            
            {/* Financial aggregates */}
            {dashboard && (
              <div className="glass-card p-6 border-t-4 border-t-secondary relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-secondary/10 blur-xl" />
                
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Net Remaining Salary</span>
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-6">
                  ₹{dashboard.earnings.remainingSalary}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center border-t border-slate-105 dark:border-slate-800/85 pt-4">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest">Gross Earnings</span>
                    <span className="block text-base font-extrabold text-slate-700 dark:text-slate-350">₹{dashboard.earnings.grossEarnings}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest">Paid Out</span>
                    <span className="block text-base font-extrabold text-success">₹{dashboard.earnings.paidAmount}</span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadPayslip}
                  className="mt-6 w-full btn-blue-gradient flex items-center justify-center space-x-2 rounded-custom py-3.5 text-xs font-bold shadow-md shadow-secondary/10"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>Download Payslip PDF</span>
                </button>
              </div>
            )}

            {/* Wage details Ledger */}
            {dashboard && (
              <div className="glass-card p-6 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <DollarSign className="h-4 w-4 text-secondary" />
                  <span>Detailed Earnings Ledger</span>
                </h3>
                
                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-500">Days Present ({dashboard.counters.present} days)</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-205">₹{(dashboard.counters.present + dashboard.counters.late) * dashboard.worker.dailySalary}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-500">Days Half-Day ({dashboard.counters.halfDay} days)</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-205">₹{dashboard.counters.halfDay * (dashboard.worker.dailySalary / 2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-amber-500 py-1 border-b border-slate-50 dark:border-slate-850">
                  <span>Days Late (Deductions: ₹0, {dashboard.counters.late} days)</span>
                  <span className="font-semibold">No Penalty</span>
                </div>
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-500">Fuel Allowances ({dashboard.earnings.fuelKms} KM travelled)</span>
                  <span className="font-semibold text-success">₹{dashboard.earnings.fuelAllowance}</span>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
};

export default WorkerSalary;

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  DollarSign,
  Calendar,
  Download,
  CreditCard,
  X,
  CheckCircle
} from 'lucide-react';

interface AdminSalaryProps {
  companyFilter: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminSalary: React.FC<AdminSalaryProps> = ({ companyFilter }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // YYYY-MM
  });

  const [payrollList, setPayrollList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Payout overlay form states
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutWorkerId, setPayoutWorkerId] = useState('');
  const [payoutWorkerName, setPayoutWorkerName] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch workers to calculate payroll details for each
      const workersRes = await api.get(`/workers?company=${companyFilter}`);
      const workers = workersRes.data;

      const payrolls: any[] = [];
      for (const w of workers) {
        try {
          const dashRes = await api.get(`/salary/dashboard?workerId=${w._id}&month=${selectedMonth}`);
          payrolls.push(dashRes.data);
        } catch (err) {
          console.error(`Failed to load payroll for worker ${w._id}`, err);
        }
      }
      setPayrollList(payrolls);
    } catch (err) {
      console.error('Failed to load salary details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, [companyFilter, selectedMonth]);

  const handleDownloadPayslip = (workerId: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    window.open(`http://localhost:5000/api/salary/payslip?workerId=${workerId}&month=${selectedMonth}&token=${token}`);
  };

  const handleOpenPayoutModal = (workerId: string, name: string, calculatedNet: number) => {
    setPayoutWorkerId(workerId);
    setPayoutWorkerName(name);
    setPayoutAmount(calculatedNet.toString());
    setPayoutModalOpen(true);
  };

  const handleRecordPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayout(true);
    try {
      await api.post('/salary/payouts', {
        workerId: payoutWorkerId,
        amount: Number(payoutAmount),
        month: selectedMonth
      });
      alert(`Payout of ₹${payoutAmount} recorded successfully for ${payoutWorkerName}!`);
      setPayoutModalOpen(false);
      fetchSalaryData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payout');
    } finally {
      setSubmittingPayout(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Payroll & Salary Board</h2>
          <p className="text-xs text-slate-400 mt-0.5">Review auto-calculated salaries, manually decide payout amounts, and generate payslips</p>
        </div>

        {/* Month selector */}
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-custom px-4 py-2">
          <Calendar className="h-4.5 w-4.5 text-secondary" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs outline-none bg-transparent font-semibold text-secondary"
          />
        </div>
      </div>

      {/* Auto-Calculated Payroll Summary List */}
      <div className="glass-card p-6 shadow-xl border-t-4 border-t-secondary">
        <div className="flex items-center space-x-2 mb-6">
          <div className="rounded-xl bg-secondary/10 p-2.5 text-secondary">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Calculated Monthly Payouts Registry</h3>
            <p className="text-[10px] text-slate-400">Live wages computed from daily attendance registers and fuel allowances</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="animate-shimmer h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : payrollList.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            No payroll data available for this month.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Worker Name</th>
                  <th className="px-4 py-3.5">Presents / Half</th>
                  <th className="px-4 py-3.5">Late / Absent</th>
                  <th className="px-4 py-3.5">Base Wage</th>
                  <th className="px-4 py-3.5">Fuel KM (Allowance)</th>
                  <th className="px-4 py-3.5">Paid Payouts</th>
                  <th className="px-4 py-3.5">Remaining Balance</th>
                  <th className="px-4 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                {payrollList.map((pay) => (
                  <tr key={pay.worker.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3.5">
                      <span className="block font-bold text-slate-750 dark:text-slate-205">{pay.worker.name}</span>
                      <span className="block text-[9px] text-slate-400 uppercase mt-0.5">Rate: ₹{pay.worker.dailySalary}/day</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {pay.counters.present} Present | {pay.counters.halfDay} Half
                    </td>
                    <td className="px-4 py-3.5 text-slate-455">
                      {pay.counters.late} Late | {pay.counters.absent} Absent
                    </td>
                    <td className="px-4 py-3.5 font-semibold">₹{pay.earnings.baseWage}</td>
                    <td className="px-4 py-3.5">
                      <span className="block">{pay.earnings.fuelKms} KM</span>
                      <span className="block text-[9px] text-success font-semibold mt-0.5">+₹{pay.earnings.fuelAllowance}</span>
                    </td>
                    <td className="px-4 py-3.5 text-success font-semibold">₹{pay.earnings.paidAmount}</td>
                    <td className="px-4 py-3.5 font-bold text-secondary dark:text-secondary-light">
                      ₹{pay.earnings.remainingSalary}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <button
                          onClick={() => handleOpenPayoutModal(pay.worker.id, pay.worker.name, pay.earnings.remainingSalary)}
                          disabled={pay.earnings.remainingSalary <= 0}
                          className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-success p-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Decide & Record Salary Payout"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPayslip(pay.worker.id)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-805 p-2 text-slate-550 hover:bg-secondary/10 hover:text-secondary transition-colors"
                          title="Download Payslip"
                        >
                          <Download className="h-4 w-4" />
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

      {/* DECIDE & RECORD SALARY PAYOUT MODAL */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-850 flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Decide & Pay Salary</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{payoutWorkerName}</h3>
              </div>
              <button
                onClick={() => setPayoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 rounded-full p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleRecordPayoutSubmit} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150/40 dark:border-slate-850/40 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-450">Billing Cycle:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-205">{selectedMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Calculated Net Remaining:</span>
                  <span className="font-bold text-secondary">₹{payoutAmount}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Override Payout Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter payout amount"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPayout}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white flex items-center justify-center space-x-2 rounded-custom py-3.5 text-xs font-bold shadow-md shadow-emerald-500/10 transition-transform active:scale-95 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{submittingPayout ? 'Recording Payout...' : 'Confirm & Mark Paid'}</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminSalary;

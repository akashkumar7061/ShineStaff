import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  DollarSign,
  Calendar,
  Download,
  CreditCard,
  X,
  CheckCircle,
  Coins,
  History,
  Trash2,
  Edit
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

  // Expanded payout fields
  const [payoutType, setPayoutType] = useState<'regular_payout' | 'advance'>('regular_payout');
  const [paymentMode, setPaymentMode] = useState<'Online' | 'Cash'>('Online');
  const [paymentTime, setPaymentTime] = useState('');
  const [payoutReason, setPayoutReason] = useState('');

  // Payment history states
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyWorkerName, setHistoryWorkerName] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // Edit payout states
  const [editPayoutModalOpen, setEditPayoutModalOpen] = useState(false);
  const [editPayoutId, setEditPayoutId] = useState('');
  const [editPayoutAmount, setEditPayoutAmount] = useState('');
  const [editPayoutType, setEditPayoutType] = useState<'regular_payout' | 'advance'>('regular_payout');
  const [editPaymentMode, setEditPaymentMode] = useState<'Online' | 'Cash'>('Online');
  const [editPaymentTime, setEditPaymentTime] = useState('');
  const [editPayoutReason, setEditPayoutReason] = useState('');
  const [editPayoutMonth, setEditPayoutMonth] = useState('');

  const handleOpenEditPayoutModal = (payment: any) => {
    setEditPayoutId(payment._id);
    setEditPayoutAmount(payment.amount.toString());
    setEditPayoutType(payment.type || 'regular_payout');
    setEditPaymentMode(payment.paymentMode || 'Online');
    setEditPaymentTime(payment.paymentTime ? new Date(payment.paymentTime).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16));
    setEditPayoutReason(payment.reason || '');
    setEditPayoutMonth(payment.month || selectedMonth);
    setEditPayoutModalOpen(true);
  };

  const handleEditPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/salary/payouts/${editPayoutId}`, {
        amount: Number(editPayoutAmount),
        type: editPayoutType,
        paymentMode: editPaymentMode,
        paymentTime: new Date(editPaymentTime).toISOString(),
        reason: editPayoutReason,
        month: editPayoutMonth
      });
      alert('Payment record updated successfully!');
      setEditPayoutModalOpen(false);
      // Refresh history modal
      const res = await api.get(`/salary/requests?workerId=${payoutWorkerId || paymentHistory[0]?.workerId}`);
      const paidLogs = res.data.filter((r: any) => r.status === 'approved');
      setPaymentHistory(paidLogs);
      fetchSalaryData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update payment record');
    }
  };

  const handleOpenHistoryModal = async (workerId: string, name: string) => {
    setHistoryWorkerName(name);
    try {
      const res = await api.get(`/salary/requests?workerId=${workerId}`);
      // Filter to only show approved/recorded logs
      const paidLogs = res.data.filter((r: any) => r.status === 'approved');
      setPaymentHistory(paidLogs);
      setHistoryModalOpen(true);
    } catch (err) {
      alert('Failed to load payment logs');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment log? This will recalculate the remaining salary balance.')) return;
    try {
      await api.delete(`/salary/requests/${id}`);
      alert('Payment log deleted successfully!');
      setPaymentHistory(prev => prev.filter(p => p._id !== id));
      fetchSalaryData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete payment log');
    }
  };

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
          console.error(`Failed to fetch payroll for ${w.name}:`, err);
        }
      }
      setPayrollList(payrolls);
    } catch (err) {
      console.error('Failed to fetch salary database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();

    const handleSocketUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'JOB_COMPLETED' || customEvent.detail?.type === 'TRAVEL_LOG_APPROVED') {
        fetchSalaryData();
      }
    };
    window.addEventListener('socket-update', handleSocketUpdate);
    return () => window.removeEventListener('socket-update', handleSocketUpdate);
  }, [companyFilter, selectedMonth]);

  const handleDownloadPayslip = (workerId: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    window.open(`https://shinestaff-backend.onrender.com/api/salary/payslip?workerId=${workerId}&month=${selectedMonth}&token=${token}`);
  };

  const handleOpenPayoutModal = (workerId: string, name: string, calculatedNet: number) => {
    setPayoutWorkerId(workerId);
    setPayoutWorkerName(name);
    setPayoutAmount(calculatedNet.toString());
    setPayoutType('regular_payout');
    setPaymentMode('Online');
    setPaymentTime(new Date().toISOString().substring(0, 16));
    setPayoutReason('Monthly payroll payout');
    setPayoutModalOpen(true);
  };

  const handleRecordPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayout(true);
    try {
      await api.post('/salary/payouts', {
        workerId: payoutWorkerId,
        amount: Number(payoutAmount),
        month: selectedMonth,
        type: payoutType,
        paymentMode,
        paymentTime: new Date(paymentTime).toISOString(),
        reason: payoutReason
      });
      alert(`Payment of ₹${payoutAmount} logged successfully as ${payoutType.replace('_', ' ')} via ${paymentMode}!`);
      setPayoutModalOpen(false);
      fetchSalaryData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
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
          <p className="text-xs text-slate-400 mt-0.5">Review auto-calculated salaries, record cash/online payouts or advances, and generate payslips</p>
        </div>

        {/* Month selector */}
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-custom px-4 py-2 mt-1">
          <Calendar className="h-4.5 w-4.5 text-secondary" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs outline-none bg-transparent font-semibold text-secondary"
          />
        </div>
      </div>

      {/* Grid table */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : payrollList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No worker records found to generate payroll logs.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Worker Profile</th>
                  <th className="px-6 py-4 text-center">Duty Days (P / L)</th>
                  <th className="px-6 py-4">Daily Rate</th>
                  <th className="px-6 py-4">Wage Earned</th>
                  <th className="px-6 py-4">Fuel Commute</th>
                  <th className="px-6 py-4">Gross Earned</th>
                  <th className="px-6 py-4">Advance Paid</th>
                  <th className="px-6 py-4">Regular Paid</th>
                  <th className="px-6 py-4">Net Remaining</th>
                  <th className="px-6 py-4 text-center">Payroll Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {payrollList.map((entry) => (
                  <tr key={entry.worker.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="block font-bold text-slate-805 dark:text-white">{entry.worker.name}</span>
                      <span className="inline-block text-[9px] font-bold bg-secondary/10 text-secondary px-2.5 py-0.5 rounded mt-1 uppercase">
                        {entry.worker.company}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-center font-semibold text-slate-500">
                      {entry.counters.present} present / {entry.counters.late} late
                    </td>

                    <td className="px-6 py-3.5 font-medium">₹{entry.worker.dailySalary || 0}</td>

                    <td className="px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-300">₹{entry.earnings.baseWage}</td>

                    <td className="px-6 py-3.5 text-success font-semibold">
                      ₹{entry.earnings.fuelAllowance} <span className="text-[10px] text-slate-400 block font-normal">({entry.earnings.fuelKms} KM)</span>
                    </td>

                    <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-100">₹{entry.earnings.grossEarnings}</td>

                    <td className="px-6 py-3.5 text-danger font-semibold">₹{entry.earnings.advanceDeducted}</td>

                    <td className="px-6 py-3.5 text-success font-semibold">₹{entry.earnings.paidAmount}</td>

                    <td className="px-6 py-3.5 font-extrabold text-secondary text-sm">₹{entry.earnings.remainingSalary}</td>

                    <td className="px-6 py-3.5 text-center flex items-center justify-center space-x-2.5">
                      <button
                        onClick={() => handleOpenPayoutModal(entry.worker.id, entry.worker.name, entry.earnings.remainingSalary)}
                        className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3.5 py-1.5 uppercase transition-colors"
                      >
                        Pay / Record
                      </button>

                      <button
                        onClick={() => handleDownloadPayslip(entry.worker.id)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-500 hover:text-slate-855 dark:hover:text-slate-205"
                        title="Download PDF Payslip"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleOpenHistoryModal(entry.worker.id, entry.worker.name)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-505 hover:text-slate-855 dark:hover:text-slate-205"
                        title="View Payment Logs History"
                      >
                        <History className="h-4 w-4" />
                      </button>
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
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Decide & Log Salary payment</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{payoutWorkerName}</h3>
              </div>
              <button
                onClick={() => setPayoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  <span className="font-bold text-secondary text-sm">₹{payoutAmount}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Payment Type</label>
                  <select
                    value={payoutType}
                    onChange={(e) => setPayoutType(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary"
                  >
                    <option value="regular_payout">Regular Payout</option>
                    <option value="advance">Advance Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary"
                  >
                    <option value="Online">Online Transfer</option>
                    <option value="Cash">Cash Handout</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Date & Timing</label>
                  <input
                    type="datetime-local"
                    required
                    value={paymentTime}
                    onChange={(e) => setPaymentTime(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Payment Reason / Remarks</label>
                <input
                  type="text"
                  required
                  value={payoutReason}
                  onChange={(e) => setPayoutReason(e.target.value)}
                  placeholder="Reason for payment/advance"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/50 p-3 outline-none focus:border-secondary"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPayout}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white flex items-center justify-center space-x-2 rounded-custom py-3.5 text-xs font-bold shadow-md shadow-emerald-500/10 transition-transform active:scale-95 disabled:opacity-50 mt-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{submittingPayout ? 'Recording...' : 'Confirm & Log Payment'}</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* PAYMENT HISTORY / DELETE MODAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-850 flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Payment Logs History</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{historyWorkerName}</h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {paymentHistory.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No approved advances or payout records logged for this worker.</p>
              ) : (
                paymentHistory.map((pay: any) => (
                  <div key={pay._id} className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          pay.type === 'advance' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                        }`}>
                          {pay.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-450 font-semibold">{pay.paymentMode || 'Online'}</span>
                        <span className="text-[10px] text-slate-400">({pay.month})</span>
                      </div>
                      <span className="block text-[10px] text-slate-450 mt-1">
                        Logged: {pay.paymentTime ? new Date(pay.paymentTime).toLocaleString() : new Date(pay.createdAt).toLocaleString()}
                      </span>
                      {pay.reason && (
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Remarks: {pay.reason}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-white mr-1.5">₹{pay.amount}</span>
                      <button
                        onClick={() => handleOpenEditPayoutModal(pay)}
                        className="rounded-lg bg-indigo-100 dark:bg-indigo-950/20 p-2 text-indigo-500 hover:bg-indigo-500/20 transition-colors"
                        title="Edit this payment record"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(pay._id)}
                        className="rounded-lg bg-red-100 dark:bg-red-950/20 p-2 text-danger hover:bg-danger/15 hover:text-white transition-colors"
                        title="Delete this payment record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-lg border border-slate-205 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Payout Modal */}
      {editPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-205 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-855 dark:text-white text-base">Edit Payout Record</h3>
              <button onClick={() => setEditPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-650">✕</button>
            </div>
            
            <form onSubmit={handleEditPayoutSubmit} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={editPayoutAmount}
                    onChange={(e) => setEditPayoutAmount(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Month (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-06"
                    value={editPayoutMonth}
                    onChange={(e) => setEditPayoutMonth(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Payout Type</label>
                  <select
                    value={editPayoutType}
                    onChange={(e: any) => setEditPayoutType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  >
                    <option value="regular_payout">Regular Salary Payout</option>
                    <option value="regular_salary">Regular Salary Request</option>
                    <option value="advance">Salary Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Payment Mode</label>
                  <select
                    value={editPaymentMode}
                    onChange={(e: any) => setEditPaymentMode(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                  >
                    <option value="Online">Online Transfer</option>
                    <option value="Cash">Cash Payout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Payment Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={editPaymentTime}
                  onChange={(e) => setEditPaymentTime(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 mb-1 uppercase">Remarks / Reason</label>
                <textarea
                  value={editPayoutReason}
                  onChange={(e) => setEditPayoutReason(e.target.value)}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-2 outline-none focus:border-secondary resize-none"
                  placeholder="Payment remarks details..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditPayoutModalOpen(false)} className="rounded-lg border border-slate-205 px-4 py-2 text-xs font-semibold">Cancel</button>
                <button type="submit" className="btn-blue-gradient rounded-lg px-5 py-2 text-xs font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSalary;

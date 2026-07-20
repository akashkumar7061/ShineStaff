import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ORIGINAL_PNB_QR_IMAGE } from '../utils/defaultQRImage';
import {
  QrCode,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Share2,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';

const WorkerQR: React.FC = () => {
  const { user } = useAuth();
  const [activeQR, setActiveQR] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchDefaultQR = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch mapped active QR code for worker's company
      const res = await api.get(`/qr/company/${user.company}`);
      if (res.data) {
        setActiveQR(res.data);
      } else {
        setActiveQR(null);
      }
    } catch (err) {
      console.error('Failed to fetch default QR:', err);
      setActiveQR(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultQR();
  }, [user]);

  const handleCopyUPI = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-24 pb-12 max-w-4xl mx-auto space-y-6 text-left animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm gap-4">
        <div>
          <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest flex items-center space-x-1 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
            <span>Official Corporate Payment Collection QR</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <span>Payment QR Code</span>
            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Scan & Pay QR for clients. Auto-synced with Admin Primary Default Settings.
          </p>
        </div>

        <button
          onClick={fetchDefaultQR}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          title="Refresh QR Code details"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Latest QR</span>
        </button>
      </div>

      {/* Main QR Card Display */}
      {loading ? (
        <div className="glass-card p-12 text-center text-slate-400 font-bold text-sm space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          <p>Loading Active Primary Payment QR Code...</p>
        </div>
      ) : activeQR ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* QR Image Box */}
          <div className="md:col-span-1 glass-card p-6 flex flex-col items-center justify-center text-center space-y-4 border-2 border-emerald-500/30">
            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider">
              ⭐ Primary Active QR
            </span>

            <div className="p-4 bg-white rounded-3xl border-4 border-emerald-500/30 shadow-2xl inline-block">
              {activeQR.qrImage ? (
                <img
                  src={activeQR.qrImage}
                  alt={activeQR.name}
                  className="h-56 w-56 object-contain mx-auto"
                />
              ) : (
                <div className="h-56 w-56 flex items-center justify-center text-rose-500 font-bold text-xs p-4 bg-slate-50 rounded-2xl">
                  No QR image uploaded by Admin.
                </div>
              )}
            </div>

            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Scan with any UPI App
            </span>
          </div>

          {/* Account Details & Instructions */}
          <div className="md:col-span-2 glass-card p-6 flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Holder Name</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{activeQR.accountHolder}</h3>
                </div>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold rounded-xl uppercase">
                  {activeQR.company || user?.company}
                </span>
              </div>

              {/* UPI ID Copy Box */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Official Corporate UPI ID</span>
                <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-955 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-black text-emerald-500 dark:text-emerald-400 text-sm sm:text-base flex-1 truncate">
                    {activeQR.upiId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyUPI(activeQR.upiId)}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied!' : 'Copy UPI'}</span>
                  </button>
                </div>
              </div>

              {/* Bank Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{activeQR.bankName || 'Punjab National Bank (PNB)'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="font-bold text-emerald-500 mt-0.5 block flex items-center space-x-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block mr-1" />
                    <span>Active Collection QR</span>
                  </span>
                </div>
              </div>

            </div>

            {/* Instruction Notice Banner */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase">
                <Info className="h-4 w-4" />
                <span>Client Payment Guidance</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Customer ko online payment ke liye ye QR Code dikhaye. Client kisi bhi UPI app (Google Pay, PhonePe, Paytm, BHIM) se scan karke payment kar sakte hain. Payment complete hote hi job worksheet me update kare.
              </p>
            </div>

          </div>

        </div>
      ) : (
        <div className="glass-card p-12 text-center text-rose-500 font-bold text-sm">
          No active QR Code configured by Admin. Please contact Admin to set up a primary payment QR code.
        </div>
      )}

    </div>
  );
};

export default WorkerQR;

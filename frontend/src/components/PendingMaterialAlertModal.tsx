import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Package,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  CheckCircle2,
  Calendar,
  X,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Bell,
  Check
} from 'lucide-react';

export const cleanPhoneNumber = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
};

interface MaterialItem {
  itemName: string;
  quantity: string;
}

interface MaterialRequestWorker {
  _id?: string;
  name?: string;
  phone?: string;
  company?: string;
  photo?: string;
}

export interface PendingMaterialRequest {
  _id: string;
  workerId?: MaterialRequestWorker;
  company: 'SofaShine' | 'CleanCruisers' | 'Both';
  items: MaterialItem[];
  urgency: 'Normal' | 'Urgent' | 'Critical';
  reason?: string;
  neededByDate?: string;
  status: string;
  createdAt: string;
}

interface PendingMaterialAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: PendingMaterialRequest[];
  onStatusUpdated: () => void;
  onSnooze: (minutes?: number) => void;
}

const PendingMaterialAlertModal: React.FC<PendingMaterialAlertModalProps> = ({
  isOpen,
  onClose,
  requests,
  onStatusUpdated,
  onSnooze
}) => {
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickDispatch = async (requestId: string, workerName: string) => {
    setUpdatingId(requestId);
    try {
      await api.put(`/material-requests/${requestId}/status`, {
        status: 'dispatched',
        adminRemarks: 'Handed over by Admin via Quick Action Alert'
      });
      setSuccessId(requestId);
      setTimeout(() => {
        setSuccessId(null);
        setUpdatingId(null);
        onStatusUpdated();
      }, 700);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update request');
      setUpdatingId(null);
    }
  };

  const criticalCount = requests.filter(r => r.urgency === 'Critical').length;
  const urgentCount = requests.filter(r => r.urgency === 'Urgent').length;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/40 dark:border-amber-500/30 shadow-2xl overflow-hidden my-auto animate-scale-up text-left"
      >
        {/* Glowing Top Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-4 sm:p-5 flex items-start justify-between relative overflow-hidden">
          {/* Subtle animated background shapes */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="flex items-start space-x-3 sm:space-x-4 relative z-10">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg shrink-0 animate-bounce">
              <Package className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border border-white/25">
                  🚨 Action Required
                </span>
                <span className="bg-white text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs">
                  {requests.length} Worker Request{requests.length === 1 ? '' : 's'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-1 text-white leading-tight">
                Pending Material Requests!
              </h2>
              <p className="text-[11px] sm:text-xs text-white/90 font-medium mt-0.5 leading-snug">
                Workers ne chemicals & equipment ki demand daali hai. Kripya material provide karein taaki ground clean work na ruke.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer relative z-10 shrink-0"
            title="Dismiss for now"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Priority Summary Bar */}
        {(criticalCount > 0 || urgentCount > 0) && (
          <div className="bg-amber-50 dark:bg-amber-950/40 px-5 py-2 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span>High Priority:</span>
            </span>
            <div className="flex items-center space-x-2">
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[10px] animate-pulse">
                  🔴 {criticalCount} Critical
                </span>
              )}
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px]">
                  🟠 {urgentCount} Urgent
                </span>
              )}
            </div>
          </div>
        )}

        {/* Request Cards Container */}
        <div className="p-4 sm:p-5 max-h-[52vh] overflow-y-auto space-y-3.5">
          {requests.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-xl">
                ✓
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                Sabhi Material Requests Cleared!
              </h3>
              <p className="text-xs text-slate-400">
                Ground workers ke paas abhi sabhi zaroori cleaning supplies pahunch chuki hain.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const workerName = req.workerId?.name || 'Worker';
              const workerPhone = req.workerId?.phone || '';
              const workerCompany = req.workerId?.company || req.company || 'SofaShine';
              const cleanPhone = cleanPhoneNumber(workerPhone);
              const itemsListText = req.items.map(it => `${it.itemName} (${it.quantity})`).join(', ');

              const waMessage = `Namaste ${workerName}, aapki material request humein receive ho gayi hai (${itemsListText}). ShineStaff admin se materials ready/dispatch kiye ja rahe hain.`;
              const waUrl = cleanPhone 
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}` 
                : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

              const isSuccess = successId === req._id;
              const isUpdating = updatingId === req._id;

              return (
                <div
                  key={req._id}
                  className={`rounded-2xl border transition-all p-3.5 sm:p-4 space-y-3 ${
                    req.urgency === 'Critical'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : req.urgency === 'Urgent'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header: Worker details & Urgency badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={req.workerId?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${workerName}`}
                        alt={workerName}
                        className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-850 dark:text-white">
                            {workerName}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {workerCompany}
                          </span>
                        </div>
                        {workerPhone ? (
                          <a
                            href={`tel:${workerPhone}`}
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-1 mt-0.5"
                          >
                            <Phone className="h-2.5 w-2.5" />
                            <span>{workerPhone}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">No Phone</span>
                        )}
                      </div>
                    </div>

                    {/* Urgency Badge */}
                    <div className="shrink-0">
                      {req.urgency === 'Critical' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs inline-flex items-center space-x-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                          <span>Critical Ground Need</span>
                        </span>
                      ) : req.urgency === 'Urgent' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                          Urgent
                        </span>
                      ) : (
                        <span className="px-2 py-0.8 rounded-lg text-[9.5px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requested Items Chips List */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Requested Items ({req.items?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {req.items?.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                        >
                          <span>📦</span>
                          <span>{item.itemName}</span>
                          <span className="font-black text-amber-600 dark:text-amber-400 bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.2 rounded text-[10px] ml-1">
                            Qty: {item.quantity}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Meta: Needed by date & Ground notes */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] gap-2 pt-0.5">
                    <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                      {req.neededByDate && (
                        <span className="font-semibold flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3 w-3 text-orange-500" />
                          <span>Needed By: <b>{req.neededByDate}</b></span>
                        </span>
                      )}
                      {req.createdAt && (
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {req.reason && (
                    <div className="bg-slate-100/70 dark:bg-slate-800/50 p-2 rounded-lg text-[10.5px] text-slate-600 dark:text-slate-300 italic border border-slate-200/50 dark:border-slate-700/50">
                      💬 "{req.reason}"
                    </div>
                  )}

                  {/* Action Controls for this request */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center space-x-1.5">
                      {workerPhone && (
                        <>
                          <a
                            href={`tel:${workerPhone}`}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl inline-flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Call worker to confirm pickup or location"
                          >
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>Call</span>
                          </a>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold rounded-xl inline-flex items-center space-x-1 transition-colors cursor-pointer"
                            title="WhatsApp worker that materials are ready"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuickDispatch(req._id, workerName)}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer ${
                          isSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Dispatched!</span>
                          </>
                        ) : isUpdating ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>⚡ Mark Dispatched (Handed Over)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onSnooze(30)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center space-x-1.5"
              title="Snooze popup for 30 minutes"
            >
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Remind Me in 30 Mins</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-extrabold cursor-pointer"
            >
              Dismiss
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/admin/materials');
              }}
              className="px-4 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-xl font-black shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <span>📦 Open Full Material Hub</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PendingMaterialAlertModal;

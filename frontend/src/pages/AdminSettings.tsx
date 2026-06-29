import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Settings,
  Shield,
  Clock,
  Sparkles,
  Upload,
  Coins
} from 'lucide-react';

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [fuelAllowanceRate, setFuelAllowanceRate] = useState('');
  const [lateTimeGraceMins, setLateTimeGraceMins] = useState('');
  const [halfDayThresholdHours, setHalfDayThresholdHours] = useState('');
  const [adminEmailForAlerts, setAdminEmailForAlerts] = useState('');

  // Logo previews
  const [sofaLogo, setSofaLogo] = useState('');
  const [cruiserLogo, setCruiserLogo] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const s = res.data;
      setFuelAllowanceRate(s.fuelAllowanceRate.toString());
      setLateTimeGraceMins(s.lateTimeGraceMins.toString());
      setHalfDayThresholdHours(s.halfDayThresholdHours.toString());
      setAdminEmailForAlerts(s.adminEmailForAlerts || '');
      setSofaLogo(s.sofaShineLogo || '');
      setCruiserLogo(s.cleanCruisersLogo || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'sofa' | 'cruiser') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'sofa') {
          setSofaLogo(reader.result as string);
        } else {
          setCruiserLogo(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put('/settings', {
        fuelAllowanceRate: Number(fuelAllowanceRate),
        lateTimeGraceMins: Number(lateTimeGraceMins),
        halfDayThresholdHours: Number(halfDayThresholdHours),
        adminEmailForAlerts,
        sofaShineLogoDataUrl: sofaLogo,
        cleanCruisersLogoDataUrl: cruiserLogo
      });
      alert('Settings updated successfully!');
      fetchSettings();
    } catch (err) {
      alert('Failed to save configuration settings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Company Configurations</h2>
        <p className="text-xs text-slate-400 mt-0.5">Control late-in grace thresholds, fuel rates, and upload business branch logos</p>
      </div>

      {loading ? (
        <div className="animate-shimmer h-64 w-full rounded-custom" />
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Rules / Payroll Config Card */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center space-x-2 text-secondary mb-2">
              <Coins className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Payroll & Fuel Rules</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Fuel Allowance Rate (₹ / KM)</label>
                <input
                  type="number"
                  required
                  value={fuelAllowanceRate}
                  onChange={(e) => setFuelAllowanceRate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1.5">Admin Email for Notifications</label>
                <input
                  type="email"
                  value={adminEmailForAlerts}
                  onChange={(e) => setAdminEmailForAlerts(e.target.value)}
                  placeholder="alerts@shinestaff.com"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                />
              </div>
            </div>
          </div>

          {/* Time Attendance rules Card */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center space-x-2 text-secondary mb-2">
              <Clock className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Attendance Clocking Rules</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Late check-in grace period (Minutes)</label>
                <input
                  type="number"
                  required
                  value={lateTimeGraceMins}
                  onChange={(e) => setLateTimeGraceMins(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/50 p-3 outline-none focus:border-secondary"
                />
                <span className="block text-[9px] text-slate-400 mt-1">Grace time allowed past 09:00 AM check-in target</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Half-Day threshold (Hours)</label>
                <input
                  type="number"
                  required
                  value={halfDayThresholdHours}
                  onChange={(e) => setHalfDayThresholdHours(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 outline-none focus:border-secondary"
                />
                <span className="block text-[9px] text-slate-400 mt-1">Minimum hours to qualify as full day instead of half-day</span>
              </div>
            </div>
          </div>

          {/* Business Branch Logos */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center space-x-2 text-secondary mb-2">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Branch Branding Logos</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* SofaShine */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between items-center space-y-4">
                <div className="text-center">
                  <span className="block font-semibold text-xs text-slate-800 dark:text-slate-200">SofaShine Logo</span>
                  <span className="text-[9px] text-slate-400">Used on dashboard filters & PDF reports</span>
                </div>
                <div className="h-20 w-32 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-150 dark:border-slate-850 overflow-hidden">
                  {sofaLogo ? (
                    <img src={sofaLogo} alt="SofaShine" className="h-full object-contain p-2" />
                  ) : (
                    <span className="text-[10px] text-slate-400">No logo uploaded</span>
                  )}
                </div>
                <label className="flex items-center justify-center space-x-1.5 text-xs text-secondary hover:underline cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Image</span>
                  <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'sofa')} className="hidden" />
                </label>
              </div>

              {/* CleanCruisers */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between items-center space-y-4">
                <div className="text-center">
                  <span className="block font-semibold text-xs text-slate-800 dark:text-slate-200">CleanCruisers Logo</span>
                  <span className="text-[9px] text-slate-400">Used on dashboard filters & PDF reports</span>
                </div>
                <div className="h-20 w-32 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-150 dark:border-slate-850 overflow-hidden">
                  {cruiserLogo ? (
                    <img src={cruiserLogo} alt="CleanCruisers" className="h-full object-contain p-2" />
                  ) : (
                    <span className="text-[10px] text-slate-400">No logo uploaded</span>
                  )}
                </div>
                <label className="flex items-center justify-center space-x-1.5 text-xs text-secondary hover:underline cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Image</span>
                  <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'cruiser')} className="hidden" />
                </label>
              </div>

            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-blue-gradient rounded-custom px-6 py-4 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Saving Changes...' : 'Save Configuration Changes'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

export default AdminSettings;

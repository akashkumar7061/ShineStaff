import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  settingsId: string;
  sofaShineLogo: string;
  cleanCruisersLogo: string;
  fuelAllowanceRate: number; // ₹ per KM
  lateTimeGraceMins: number; // grace period in minutes (e.g. 15)
  halfDayThresholdHours: number; // hours after which work is considered full day (otherwise half day)
  adminEmailForAlerts: string;
  qrSecurityPassword?: string;
}

const SettingsSchema = new Schema<ISettings>({
  settingsId: { type: String, default: 'global', unique: true },
  sofaShineLogo: { type: String, default: '' },
  cleanCruisersLogo: { type: String, default: '' },
  fuelAllowanceRate: { type: Number, default: 4 }, // ₹4 per KM
  lateTimeGraceMins: { type: Number, default: 15 }, // 15 mins
  halfDayThresholdHours: { type: Number, default: 4 },
  adminEmailForAlerts: { type: String, default: '' },
  qrSecurityPassword: { type: String, default: 'admin123' }
}, {
  timestamps: true
});

export default mongoose.model<ISettings>('Settings', SettingsSchema);

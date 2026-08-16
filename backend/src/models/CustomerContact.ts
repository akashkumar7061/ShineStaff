import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerContact extends Document {
  name: string;
  phone: string; // Normalize phone/WhatsApp number
  alternatePhone?: string;
  email?: string;
  company: 'SofaShine' | 'CleanCruisers' | 'All';
  serviceTaken: string; // Name of the last service
  lastServiceDate: Date;
  lastServiceName: string;
  lastServiceAmount: number;
  serviceLocation: string; // Location / Address
  totalServicesTaken: number;
  totalAmountSpent: number;
  nextReminderDate?: Date;
  reminderStatus: 'pending' | 'sent' | 'failed' | 'no_reminder';
  marketingOptOut: boolean;
  notes?: string;
}

const CustomerContactSchema = new Schema<ICustomerContact>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true }, // Ensure single customer entry per phone number
  alternatePhone: { type: String, default: '' },
  email: { type: String, default: '' },
  company: { type: String, enum: ['SofaShine', 'CleanCruisers', 'All'], default: 'All' },
  serviceTaken: { type: String, default: '' },
  lastServiceDate: { type: Date, required: true },
  lastServiceName: { type: String, default: '' },
  lastServiceAmount: { type: Number, default: 0 },
  serviceLocation: { type: String, default: '' },
  totalServicesTaken: { type: Number, default: 1 },
  totalAmountSpent: { type: Number, default: 0 },
  nextReminderDate: { type: Date },
  reminderStatus: { type: String, enum: ['pending', 'sent', 'failed', 'no_reminder'], default: 'pending' },
  marketingOptOut: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.model<ICustomerContact>('CustomerContact', CustomerContactSchema);

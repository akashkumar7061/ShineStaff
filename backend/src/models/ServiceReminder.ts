import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceReminder extends Document {
  customerId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  serviceName: string;
  reminderDate: Date;
  sentDate?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  messageText?: string;
  errorMessage?: string;
}

const ServiceReminderSchema = new Schema<IServiceReminder>({
  customerId: { type: Schema.Types.ObjectId, ref: 'CustomerContact', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  serviceName: { type: String, required: true },
  reminderDate: { type: Date, required: true },
  sentDate: { type: Date },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  messageText: { type: String, default: '' },
  errorMessage: { type: String, default: '' }
}, {
  timestamps: true
});

// Avoid duplicate pending reminders for same customer and service name
ServiceReminderSchema.index({ customerId: 1, serviceName: 1, status: 1 });

export default mongoose.model<IServiceReminder>('ServiceReminder', ServiceReminderSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IOvertime extends Document {
  workerId: mongoose.Types.ObjectId;
  date: string; // Format: YYYY-MM-DD
  hours: number;
  ratePerHour: number;
  totalCharges: number;
  reason?: string;
}

const OvertimeSchema = new Schema<IOvertime>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  hours: { type: Number, required: true, default: 0 },
  ratePerHour: { type: Number, required: true, default: 0 },
  totalCharges: { type: Number, required: true, default: 0 },
  reason: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.model<IOvertime>('Overtime', OvertimeSchema);

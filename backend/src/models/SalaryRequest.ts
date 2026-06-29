import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryRequest extends Document {
  workerId: mongoose.Types.ObjectId;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'advance' | 'regular_payout';
  month: string; // Format: YYYY-MM
  processedAt?: Date;
}

const SalaryRequestSchema = new Schema<ISalaryRequest>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  type: { type: String, enum: ['advance', 'regular_payout'], default: 'advance' },
  month: { type: String, required: true }, // E.g., "2026-06"
  processedAt: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model<ISalaryRequest>('SalaryRequest', SalaryRequestSchema);

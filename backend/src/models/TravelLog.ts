import mongoose, { Schema, Document } from 'mongoose';

export interface ITravelLog extends Document {
  workerId: mongoose.Types.ObjectId;
  date: string; // Format: YYYY-MM-DD
  type: 'job' | 'home';
  jobId?: mongoose.Types.ObjectId;
  kms: number;
  allowance: number; // Decided by admin
  status: 'pending' | 'approved';
}

const TravelLogSchema = new Schema<ITravelLog>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['job', 'home'], required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  kms: { type: Number, required: true, default: 0 },
  allowance: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' }
}, {
  timestamps: true
});

export default mongoose.model<ITravelLog>('TravelLog', TravelLogSchema);

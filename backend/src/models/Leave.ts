import mongoose, { Schema, Document } from 'mongoose';

export interface ILeave extends Document {
  workerId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

const LeaveSchema = new Schema<ILeave>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, {
  timestamps: true
});

export default mongoose.model<ILeave>('Leave', LeaveSchema);

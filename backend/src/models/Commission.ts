import mongoose, { Schema, Document } from 'mongoose';

export interface ICommission extends Document {
  workerId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  company: string;
  clientName: string;
  jobDate: string;
  workAmount: number;
  commissionAmount: number;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionSchema = new Schema<ICommission>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
  company: { type: String, required: true },
  clientName: { type: String, required: true },
  jobDate: { type: String, required: true },
  workAmount: { type: Number, required: true, default: 0 },
  commissionAmount: { type: Number, required: true, default: 0 },
  remarks: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default mongoose.model<ICommission>('Commission', CommissionSchema);

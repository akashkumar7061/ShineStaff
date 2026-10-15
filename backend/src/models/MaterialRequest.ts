import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterialItem {
  itemName: string;
  quantity: string;
}

export interface IMaterialRequest extends Document {
  workerId: mongoose.Types.ObjectId;
  company: 'SofaShine' | 'CleanCruisers' | 'Both';
  items: IMaterialItem[];
  urgency: 'Normal' | 'Urgent' | 'Critical';
  reason?: string;
  neededByDate?: string;
  neededBy?: Date;
  jobId?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'dispatched' | 'completed' | 'rejected';
  adminRemarks?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const MaterialRequestSchema = new Schema<IMaterialRequest>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, enum: ['SofaShine', 'CleanCruisers', 'Both'], default: 'SofaShine' },
  items: [
    {
      itemName: { type: String, required: true },
      quantity: { type: String, required: true }
    }
  ],
  urgency: { type: String, enum: ['Normal', 'Urgent', 'Critical'], default: 'Normal' },
  reason: { type: String, default: '' },
  neededByDate: { type: String, default: '' },
  neededBy: { type: Date },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'dispatched', 'completed', 'rejected'],
    default: 'pending'
  },
  adminRemarks: { type: String, default: '' },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

MaterialRequestSchema.index({ status: 1, createdAt: -1 });
MaterialRequestSchema.index({ workerId: 1, createdAt: -1 });

export default mongoose.model<IMaterialRequest>('MaterialRequest', MaterialRequestSchema);

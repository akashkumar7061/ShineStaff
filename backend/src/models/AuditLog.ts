import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: any;
  ipAddress?: string;
  device?: string;
  browser?: string;
  status?: 'success' | 'failure';
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  summary: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  ipAddress: { type: String, default: '' },
  device: { type: String, default: 'Desktop' },
  browser: { type: String, default: 'Browser' },
  status: { type: String, enum: ['success', 'failure'], default: 'success' }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ entityType: 1, createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

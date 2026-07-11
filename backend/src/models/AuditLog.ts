import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  summary: string;
  metadata?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['created', 'updated', 'deleted', 'approved', 'rejected'], required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  summary: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ entityType: 1, createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

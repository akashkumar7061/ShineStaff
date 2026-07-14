import mongoose, { Schema, Document } from 'mongoose';

export interface IDraft extends Document {
  userId: mongoose.Types.ObjectId;
  draftId: string;
  clientName: string;
  formData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DraftSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  draftId: { type: String, required: true },
  clientName: { type: String, default: 'Untitled Draft' },
  formData: { type: Schema.Types.Map, of: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

DraftSchema.index({ userId: 1, draftId: 1 }, { unique: true });

export default mongoose.model<IDraft>('Draft', DraftSchema);

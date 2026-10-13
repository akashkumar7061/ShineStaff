import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterialCatalog extends Document {
  name: string;
  category: string;
  defaultUnit: string;
  description?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const MaterialCatalogSchema = new Schema<IMaterialCatalog>({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: String, default: 'Cleaning Chemical' },
  defaultUnit: { type: String, default: 'Unit' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

MaterialCatalogSchema.index({ isActive: 1, name: 1 });

export default mongoose.model<IMaterialCatalog>('MaterialCatalog', MaterialCatalogSchema);

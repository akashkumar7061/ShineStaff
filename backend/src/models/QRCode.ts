import mongoose, { Schema, Document } from 'mongoose';

export interface IQRCode extends Document {
  name: string;
  company: 'SofaShine' | 'CleanCruisers' | 'ShineStaff' | 'All' | 'Custom';
  accountHolder: string;
  upiId: string;
  bankName: string;
  qrImage: string; // Base64 data URL or image path
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QRCodeSchema = new Schema<IQRCode>({
  name: { type: String, required: true },
  company: { type: String, required: true, default: 'All' },
  accountHolder: { type: String, required: true },
  upiId: { type: String, required: true },
  bankName: { type: String, default: '' },
  qrImage: { type: String, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

export default mongoose.model<IQRCode>('QRCode', QRCodeSchema);

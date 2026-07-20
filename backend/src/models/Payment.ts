import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  jobId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  workerId?: mongoose.Types.ObjectId;
  workerName: string;
  clientName: string;
  clientPhone: string;
  company: 'SofaShine' | 'CleanCruisers' | 'ShineStaff' | 'Other';
  serviceCategory?: string;
  paymentMethod: 'cash' | 'upi_online' | 'card' | 'bank_transfer';
  qrId?: mongoose.Types.ObjectId;
  qrName?: string;
  upiId?: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentTime: string; // HH:mm:ss
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  collectedBy: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: { type: String, required: true, unique: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  invoiceNumber: { type: String, default: '' },
  workerId: { type: Schema.Types.ObjectId, ref: 'User' },
  workerName: { type: String, required: true },
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  company: { type: String, required: true },
  serviceCategory: { type: String, default: 'Cleaning' },
  paymentMethod: { type: String, enum: ['cash', 'upi_online', 'card', 'bank_transfer'], required: true },
  qrId: { type: Schema.Types.ObjectId, ref: 'QRCode' },
  qrName: { type: String, default: '' },
  upiId: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: String, required: true },
  paymentTime: { type: String, required: true },
  status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded'], default: 'completed' },
  collectedBy: { type: String, default: 'Worker' },
  remarks: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.model<IPayment>('Payment', PaymentSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  description?: string;
  company: 'SofaShine' | 'CleanCruisers';
  workerId: mongoose.Types.ObjectId;
  clientName: string;
  clientPhone: string;
  address: string;
  locationName?: string;
  price?: number;
  date?: string;
  timeSlot?: string;
  location?: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'started' | 'completed' | 'cancelled';
  beforePhoto?: string;
  beforePhotoTime?: Date;
  beforePhotoGPS?: {
    lat: number;
    lng: number;
  };
  afterPhoto?: string;
  afterPhotos?: string[];
  afterPhotoTime?: Date;
  afterPhotoGPS?: {
    lat: number;
    lng: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  notificationSentAt?: Date;
  notificationDeliveredAt?: Date;
  fuelKmsTravelled?: number;
  fuelAllowance?: number;
  workerNotes?: string;
  cancelReason?: string;
}

const JobSchema = new Schema<IJob>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  company: { type: String, enum: ['SofaShine', 'CleanCruisers'], required: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  address: { type: String, default: '' },
  locationName: { type: String, default: '' },
  price: { type: Number, default: 0 },
  date: { type: String, default: '' },
  timeSlot: { type: String, default: '' },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'started', 'completed', 'cancelled'], default: 'pending' },
  beforePhoto: { type: String, default: '' },
  beforePhotoTime: { type: Date },
  beforePhotoGPS: {
    lat: { type: Number },
    lng: { type: Number }
  },
  afterPhoto: { type: String, default: '' },
  afterPhotos: { type: [String], default: [] },
  afterPhotoTime: { type: Date },
  afterPhotoGPS: {
    lat: { type: Number },
    lng: { type: Number }
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  notificationSentAt: { type: Date },
  notificationDeliveredAt: { type: Date },
  fuelKmsTravelled: { type: Number, default: 0 },
  fuelAllowance: { type: Number, default: 0 },
  workerNotes: { type: String, default: '' },
  cancelReason: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.model<IJob>('Job', JobSchema);

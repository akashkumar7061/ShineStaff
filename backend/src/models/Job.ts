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
  paymentStatus?: 'pending' | 'received' | 'outstanding';
  rating?: number;

  visitId?: string;
  alternatePhone?: string;
  clientEmail?: string;
  serviceCategory?: string;
  estimatedDuration?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  specialInstructions?: string;
  createdBy?: mongoose.Types.ObjectId;
  attachments?: string[];
  fromLocation?: string;
  toLocation?: string;
}

const JobSchema = new Schema<IJob>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  company: { type: String, enum: ['SofaShine', 'CleanCruisers'], required: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  address: { type: String, default: '' },
  locationName: { type: String, default: '' },
  price: { type: Number, min: [0, 'Price cannot be negative'], default: 0 },
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
  cancelReason: { type: String, default: '' },
  paymentStatus: { type: String, enum: ['pending', 'received', 'outstanding'], default: 'pending' },
  rating: { type: Number, min: 1, max: 5 },

  visitId: { type: String, default: '' },
  alternatePhone: { type: String, default: '' },
  clientEmail: { type: String, default: '' },
  serviceCategory: { type: String, default: '' },
  estimatedDuration: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  landmark: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  notes: { type: String, default: '' },
  specialInstructions: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  attachments: { type: [String], default: [] },
  fromLocation: { type: String, default: '' },
  toLocation: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.model<IJob>('Job', JobSchema);

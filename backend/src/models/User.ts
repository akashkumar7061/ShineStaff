import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'worker';
  company: 'SofaShine' | 'CleanCruisers' | 'Both';
  photo?: string;
  phone: string;
  address?: string;
  aadhaarNumber?: string;
  joiningDate: Date;
  dailySalary: number;
  monthlySalary: number;
  status: 'active' | 'inactive';
  currentLocation?: {
    lat: number;
    lng: number;
  };
  lastActive?: Date;
  pushSubscriptions?: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'worker'], required: true },
  company: { type: String, enum: ['SofaShine', 'CleanCruisers', 'Both'], required: true },
  photo: { type: String, default: '' },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  aadhaarNumber: { type: String, default: '' },
  joiningDate: { type: Date, default: Date.now },
  dailySalary: { type: Number, default: 0 },
  monthlySalary: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  lastActive: { type: Date },
  pushSubscriptions: {
    type: [{
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      }
    }],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);

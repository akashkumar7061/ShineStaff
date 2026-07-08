import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  workerId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  checkInTime: Date;
  selfie: string; // Cloudinary URL
  location: {
    lat: number;
    lng: number;
  };
  deviceInfo: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  editedByAdmin: boolean;
  lateReason?: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  checkInTime: { type: Date, required: true },
  selfie: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  deviceInfo: { type: String, required: true },
  status: { type: String, enum: ['present', 'late', 'absent', 'half-day'], default: 'present' },
  editedByAdmin: { type: Boolean, default: false },
  lateReason: { type: String, default: '' }
}, {
  timestamps: true
});

// Compound index so a worker can only have one attendance log per day
AttendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);

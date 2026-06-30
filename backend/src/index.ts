import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Configurations
import { connectDB } from './config/db';
import User from './models/User';
import Job from './models/Job';
import TravelLog from './models/TravelLog';

// Routes
import authRoutes from './routes/authRoutes';
import workerRoutes from './routes/workerRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import jobRoutes from './routes/jobRoutes';
import salaryRoutes from './routes/salaryRoutes';
import leaveRoutes from './routes/leaveRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportRoutes from './routes/reportRoutes';
import overtimeRoutes from './routes/overtimeRoutes';
import travelRoutes from './routes/travelRoutes';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
let io: SocketIOServer | null = null;

// Initialize Socket.io
io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

export const getIO = () => io;

// Socket connection logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Room subscription
  socket.on('subscribe', (userId: string) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local mock static images
}));
app.use(cors());
// Set high size limits since pictures are sent as base64 strings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve local upload assets (Mock Cloudinary uploads)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// Mount APIs
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/travel', travelRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('ShineStaff API Service is Running');
});

// Seed admin database if empty
const seedAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('No administrator found. Seeding default admin account...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      const defaultAdmin = new User({
        name: 'System Administrator',
        email: 'admin@shinestaff.com',
        password: hashedPassword,
        role: 'admin',
        company: 'Both',
        phone: '9876543210',
        joiningDate: new Date(),
        status: 'active'
      });

      await defaultAdmin.save();
      console.log('Default Admin seeded: admin@shinestaff.com / admin123');
    }
  } catch (error) {
    console.error('Failed to seed default admin:', error);
  }
};

const PORT = process.env.PORT || 5000;

const backfillTravelLogs = async () => {
  try {
    const completedJobs = await Job.find({
      status: 'completed',
      fuelKmsTravelled: { $gt: 0 }
    });
    let backfilledCount = 0;
    for (const job of completedJobs) {
      const exists = await TravelLog.findOne({ jobId: job._id });
      if (!exists) {
        const travelLog = new TravelLog({
          workerId: job.workerId,
          date: new Date(job.completedAt || new Date()).toISOString().split('T')[0],
          type: 'job',
          jobId: job._id,
          kms: job.fuelKmsTravelled,
          allowance: job.fuelAllowance || 0,
          status: 'approved',
          fromLocation: 'Home',
          toLocation: job.address
        });
        await travelLog.save();
        backfilledCount++;
      }
    }
    if (backfilledCount > 0) {
      console.log(`Successfully backfilled ${backfilledCount} missing travel logs from completed jobs.`);
    }
  } catch (err) {
    console.error('Failed to backfill travel logs:', err);
  }
};

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await backfillTravelLogs();
  server.listen(PORT, () => {
    console.log(`ShineStaff Server running on port ${PORT}`);
  });
};

startServer();

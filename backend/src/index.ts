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
import auditRoutes from './routes/auditRoutes';
import biRoutes from './routes/biRoutes';
import expenseRoutes from './routes/expenseRoutes';
import commissionRoutes from './routes/commissionRoutes';
import draftRoutes from './routes/draftRoutes';
import qrRoutes from './routes/qrRoutes';
import paymentRoutes from './routes/paymentRoutes';
import QRCode from './models/QRCode';

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

  // Real-time high frequency worker location reporting
  socket.on('reportLocation', (data: { workerId: string; lat: number; lng: number }) => {
    io?.emit('workerLocationUpdate', {
      workerId: data.workerId,
      lat: Number(data.lat),
      lng: Number(data.lng),
      lastActive: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local mock static images
}));
app.use(cors({
  origin: (origin, callback) => {
    // Dynamically echo the origin to support credentials for all clean sources
    callback(null, true);
  },
  credentials: true
}));
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
app.use('/api/audit-logs', auditRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/payments', paymentRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('ShineStaff API Service is Running');
});

// Seed default QR codes if empty
const seedDefaultQRCodes = async () => {
  try {
    const qrCount = await QRCode.countDocuments();
    if (qrCount === 0) {
      console.log('No QR codes found. Seeding default company QR codes...');

      // Mock SVG Data URI for PNB QR
      const mockPnbQRImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23ffffff"/><rect x="20" y="20" width="260" height="260" fill="none" stroke="%23a00000" stroke-width="4" rx="16"/><text x="150" y="55" font-family="sans-serif" font-weight="900" font-size="18" fill="%23a00000" text-anchor="middle">PNB UPI PAYMENT</text><text x="150" y="80" font-family="sans-serif" font-size="11" fill="%23666666" text-anchor="middle">Scan and Pay using any UPI app</text><rect x="60" y="100" width="180" height="180" fill="%23000000"/><rect x="70" y="110" width="160" height="160" fill="%23ffffff"/><rect x="80" y="120" width="50" height="50" fill="%23000000"/><rect x="90" y="130" width="30" height="30" fill="%23ffffff"/><rect x="100" y="140" width="10" height="10" fill="%23000000"/><rect x="170" y="120" width="50" height="50" fill="%23000000"/><rect x="180" y="130" width="30" height="30" fill="%23ffffff"/><rect x="190" y="140" width="10" height="10" fill="%23000000"/><rect x="80" y="200" width="50" height="50" fill="%23000000"/><rect x="90" y="210" width="30" height="30" fill="%23ffffff"/><rect x="100" y="220" width="10" height="10" fill="%23000000"/><circle cx="150" cy="190" r="18" fill="%23a00000"/><text x="150" y="195" font-family="sans-serif" font-weight="bold" font-size="13" fill="%23ffffff" text-anchor="middle">PNB</text><text x="150" y="280" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23333333" text-anchor="middle">UPI ID: 8810319452@pnb</text></svg>`;

      await QRCode.create([
        {
          name: 'SofaShine PNB QR',
          company: 'SofaShine',
          accountHolder: 'ADITYA RAY',
          upiId: '8810319452@pnb',
          bankName: 'Punjab National Bank (PNB)',
          qrImage: mockPnbQRImage,
          description: 'Official SofaShine Collection QR Code',
          isActive: true,
          isDefault: true
        },
        {
          name: 'CleanCruisers QR',
          company: 'CleanCruisers',
          accountHolder: 'ADITYA RAY',
          upiId: '8810319452@pnb',
          bankName: 'Punjab National Bank (PNB)',
          qrImage: mockPnbQRImage,
          description: 'Official CleanCruisers Collection QR Code',
          isActive: true,
          isDefault: false
        },
        {
          name: 'ShineStaff Central QR',
          company: 'ShineStaff',
          accountHolder: 'ADITYA RAY',
          upiId: '8810319452@pnb',
          bankName: 'Punjab National Bank (PNB)',
          qrImage: mockPnbQRImage,
          description: 'Central Corporate QR Code',
          isActive: true,
          isDefault: false
        }
      ]);
      console.log('Default QR codes seeded successfully!');
    }
  } catch (error) {
    console.error('Failed to seed default QR codes:', error);
  }
};

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

const clearAllDistancesAndLogsEver = async () => {
  try {
    // Reset all jobs ever
    const jobUpdate = await Job.updateMany(
      {},
      { $set: { fuelKmsTravelled: 0, fuelAllowance: 0 } }
    );
    // Delete all travel logs ever
    const travelDelete = await TravelLog.deleteMany({});
    console.log(`Successfully cleared all travel distances and logs ever from the database. Jobs reset: ${jobUpdate.modifiedCount}, Travel logs deleted: ${travelDelete.deletedCount}`);
  } catch (err) {
    console.error('Failed to clear all travel data:', err);
  }
};

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedDefaultQRCodes();
  await backfillTravelLogs();
  await clearAllDistancesAndLogsEver();

  // Start delayed job notification scheduler
  setInterval(async () => {
    try {
      const pendingJobs = await Job.find({
        workerId: { $exists: true, $ne: null },
        $or: [
          { notificationSentAt: null },
          { notificationSentAt: { $exists: false } }
        ]
      });

      if (pendingJobs.length > 0) {
        const { shouldDelayNotification, sendJobNotification } = require('./controllers/jobController');
        for (const job of pendingJobs) {
          if (!shouldDelayNotification(job.date || '')) {
            await sendJobNotification(job);
          }
        }
      }
    } catch (err) {
      console.error('Error in delayed job notification scheduler:', err);
    }
  }, 30 * 1000); // Check every 30 seconds for responsiveness

  server.listen(PORT, () => {
    console.log(`ShineStaff Server running on port ${PORT}`);
  });
};

startServer();

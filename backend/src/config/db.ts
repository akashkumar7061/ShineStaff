import mongoose from 'mongoose';
import User from '../models/User';

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shinestaff';
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-calculate daily salary for existing database records having dailySalary as 0
    try {
      const workersToUpdate = await User.find({ role: 'worker', $or: [{ dailySalary: 0 }, { dailySalary: { $exists: false } }] });
      if (workersToUpdate.length > 0) {
        console.log(`[Migration] Found ${workersToUpdate.length} workers with 0/missing dailySalary. Migrating...`);
        for (const worker of workersToUpdate) {
          const calculatedDaily = Math.round((worker.monthlySalary || 0) / 30);
          worker.dailySalary = calculatedDaily;
          await worker.save();
        }
        console.log(`[Migration] Successfully updated daily salaries!`);
      }
    } catch (migErr) {
      console.error('[Migration] Failed to migrate daily salaries:', migErr);
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error}`);
    process.exit(1);
  }
};

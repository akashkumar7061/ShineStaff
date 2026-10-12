import mongoose from 'mongoose';
import User from '../models/User';

export const connectDB = async () => {
  try {
    mongoose.set('strictPopulate', false);
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

    // Auto-populate default weekly holidays for Rohit, Manish, Arun, Vidyanchal, Rahul
    try {
      const defaultHolidays: { [key: string]: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' } = {
        'rohit': 'Friday',
        'manish': 'Tuesday',
        'arun': 'Thursday',
        'vidyanchal': 'Wednesday',
        'rahul': 'Monday'
      };

      const workers = await User.find({ role: 'worker' });
      for (const worker of workers) {
        const lowerName = (worker.name || '').toLowerCase().trim();
        for (const [key, holiday] of Object.entries(defaultHolidays)) {
          if (lowerName.includes(key)) {
            if (!worker.weeklyHoliday || worker.weeklyHoliday === 'None') {
              worker.weeklyHoliday = holiday;
              await worker.save();
              console.log(`[Migration] Set default weekly holiday for ${worker.name} -> ${holiday}`);
            }
            break;
          }
        }
      }
    } catch (holidayMigErr) {
      console.error('[Migration] Failed to migrate default weekly holidays:', holidayMigErr);
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error}`);
    process.exit(1);
  }
};

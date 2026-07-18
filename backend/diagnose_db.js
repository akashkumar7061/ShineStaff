const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://akashkumar706110_db_user:Y1eTpx088PcthW3N@cluster0.js3qjqr.mongodb.net/shinestaff?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  try {
    console.log('Connecting to MongoDB cluster...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully!');

    const JobSchema = new mongoose.Schema({}, { strict: false });
    const Job = mongoose.model('Job', JobSchema);

    console.log('Fetching latest 10 jobs...');
    const latestJobs = await Job.find().sort({ createdAt: -1 }).limit(10);
    console.log(`Found ${latestJobs.length} jobs.`);

    latestJobs.forEach((job, index) => {
      console.log(`\n--- Job ${index + 1} ---`);
      console.log('ID:', job._id);
      console.log('Title:', job.get('title'));
      console.log('Client Name:', job.get('clientName'));
      console.log('Status:', job.get('status'));
      console.log('Date:', job.get('date'));
      console.log('Worker ID:', job.get('workerId'));
    });

    console.log('\nFetching unique status values in database:');
    const statuses = await Job.distinct('status');
    console.log('Statuses:', statuses);

  } catch (err) {
    console.error('Error running diagnosis:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

main();

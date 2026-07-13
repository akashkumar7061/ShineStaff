const https = require('https');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function main() {
  try {
    console.log('Logging in as Admin...');
    const loginRes = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@shinestaff.com',
      password: 'admin123'
    });

    if (!loginRes.token) {
      console.error('Login failed:', loginRes);
      return;
    }
    const token = loginRes.token;
    console.log('Login successful, token retrieved.');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\nQuerying workers...');
    const workers = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/workers',
      method: 'GET',
      headers
    });
    console.log('Workers count:', Array.isArray(workers) ? workers.length : typeof workers);

    // Find Rohit
    const rohit = Array.isArray(workers) ? workers.find(w => w.name.toLowerCase().includes('rohit')) : null;
    if (!rohit) {
      console.log('Rohit worker not found. Workers payload:', workers);
      return;
    }
    console.log('Rohit User Details:', rohit);

    console.log('\nQuerying travel logs...');
    const logs = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/travel/all',
      method: 'GET',
      headers
    });
    console.log('Total travel logs:', Array.isArray(logs) ? logs.length : typeof logs);
    
    const rohitLogs = Array.isArray(logs) ? logs.filter(l => l.workerId?._id === rohit._id || l.workerId === rohit._id) : [];
    console.log('Rohit Travel Logs:');
    rohitLogs.forEach(l => {
      console.log(`  - Log ID: ${l._id}, Date: ${l.date}, Type: ${l.type}, KMs: ${l.kms}, Allowance: ${l.allowance}, Status: ${l.status}, From: ${l.fromLocation}, To: ${l.toLocation}`);
    });

    console.log('\nQuerying jobs...');
    const jobs = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/jobs',
      method: 'GET',
      headers
    });
    console.log('Total jobs:', Array.isArray(jobs) ? jobs.length : typeof jobs);
    
    const rohitJobs = Array.isArray(jobs) ? jobs.filter(j => j.workerId?._id === rohit._id || j.workerId === rohit._id) : [];
    console.log('Rohit Jobs:');
    rohitJobs.forEach(j => {
      console.log(`  - Job ID: ${j._id}, Title: ${j.title}, Status: ${j.status}, Price: ${j.price}, Date: ${j.date}, KMs: ${j.fuelKmsTravelled}, Allowance: ${j.fuelAllowance}`);
    });

  } catch (err) {
    console.error('Failed to query backend:', err.message);
  }
}

main();

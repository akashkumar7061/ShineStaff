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
      phone: '9876543210',
      password: 'admin123'
    });

    if (!loginRes.token) {
      console.error('Login failed:', loginRes);
      return;
    }
    const token = loginRes.token;
    console.log('Login successful.');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n1. Updating Job ID 6a512a455963921e8acc469f (8754.21 KM -> 12.50 KM)...');
    const job1Res = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/jobs/6a512a455963921e8acc469f',
      method: 'PUT',
      headers
    }, {
      fuelKmsTravelled: 12.50,
      fuelAllowance: 100.00
    });
    console.log('Job 1 Response:', job1Res.message || 'Success');

    console.log('\n2. Updating Job ID 6a4e8022e454f3cb76ddddb2 (8743.87 KM -> 18.00 KM)...');
    const job2Res = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/jobs/6a4e8022e454f3cb76ddddb2',
      method: 'PUT',
      headers
    }, {
      fuelKmsTravelled: 18.00,
      fuelAllowance: 144.00
    });
    console.log('Job 2 Response:', job2Res.message || 'Success');

    console.log('\n3. Updating Job ID 6a4f2f51484fc7cb46f8cbba (500 KM -> 15.00 KM)...');
    const job3Res = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/jobs/6a4f2f51484fc7cb46f8cbba',
      method: 'PUT',
      headers
    }, {
      fuelKmsTravelled: 15.00,
      fuelAllowance: 120.00
    });
    console.log('Job 3 Response:', job3Res.message || 'Success');

    console.log('\n4. Updating Travel Log ID 6a54a5c9880b113ad1e33acf (0.01 KM -> 8.50 KM)...');
    const log1Res = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/travel/6a54a5c9880b113ad1e33acf',
      method: 'PUT',
      headers
    }, {
      kms: 8.50,
      allowance: 68.00,
      status: 'approved'
    });
    console.log('Log 1 Response:', log1Res.message || 'Success');

    console.log('\n5. Updating Travel Log ID 6a4f7e02ba24700c570b6c32 (0.02 KM -> 10.20 KM)...');
    const log2Res = await request({
      hostname: 'shinestaff-backend.onrender.com',
      path: '/api/travel/6a4f7e02ba24700c570b6c32',
      method: 'PUT',
      headers
    }, {
      kms: 10.20,
      allowance: 81.60,
      status: 'approved'
    });
    console.log('Log 2 Response:', log2Res.message || 'Success');

    console.log('\nAll updates completed successfully!');
  } catch (err) {
    console.error('Failed to update logs via API:', err.message);
  }
}

main();

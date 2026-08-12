const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
  date: '2026-08-12',
  records: [{
    employeeId: 'usr_test',
    status: 'present',
    checkInTime: '2026-08-12T10:00:00Z',
    checkOutTime: '2026-08-12T18:00:00Z',
    hoursWorked: 8
  }],
  employees: [{
    id: 'usr_test',
    firstName: 'Test',
    lastName: 'User',
    empCode: 'EMP-001'
  }],
  today: {
    total: 1,
    present: 1,
    absent: 0,
    halfDay: 0,
    onLeave: 0
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/pdf/attendance-report',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  const chunks = [];
  res.on('data', (chunk) => {
    chunks.push(chunk);
  });
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    if (res.statusCode === 200 || res.statusCode === 201) {
      fs.writeFileSync('test_output.pdf', buffer);
      console.log('PDF generated successfully!');
    } else {
      console.log('Response body:', buffer.toString());
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

// test_controller.js
const http = require('http');

const ip = '192.168.0.170';
const username = 'admin';
const password = '888888';
const credentials = Buffer.from(`${username}:${password}`).toString('base64');

console.log('=== Node.js Controller Test ===');
console.log('Credentials:', `${username}:${password}`);
console.log('Base64:', credentials);
console.log('Auth Header:', `Basic ${credentials}`);
console.log('');

const options = {
  hostname: ip,
  port: 80,
  path: '/cdor.cgi?open=1&door=0',
  method: 'GET',
  headers: {
    'Authorization': `Basic ${credentials}`,
  },
};

console.log('Request options:', JSON.stringify(options, null, 2));
console.log('');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.log('Error:', e.message);
});

req.end();

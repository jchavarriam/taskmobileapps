// Test controller command with different authentication methods
const controllerIp = '192.168.0.170';
const door = '0';
const username = 'admin';
const password = '888888';

// Base64 encoding function (same as in app)
function encodeBase64(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
  }
  
  return result;
}

const credentials = encodeBase64(username + ':' + password);
console.log('Credentials:', username + ':' + password);
console.log('Base64:', credentials);

// Test different methods
async function testController() {
  const url = `http://${controllerIp}/cdor.cgi?open=1&door=${door}`;
  
  console.log('\n=== Testing Method 1: Basic Auth Header ===');
  try {
    const response1 = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });
    console.log('Status:', response1.status);
    console.log('Headers:', Object.fromEntries(response1.headers.entries()));
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n=== Testing Method 2: URL Parameters ===');
  try {
    const url2 = `http://${controllerIp}/cdor.cgi?open=1&door=${door}&username=${username}&password=${password}`;
    const response2 = await fetch(url2, { method: 'GET' });
    console.log('Status:', response2.status);
    console.log('Headers:', Object.fromEntries(response2.headers.entries()));
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n=== Testing Method 3: Custom Headers ===');
  try {
    const response3 = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Username': username,
        'X-Password': password
      }
    });
    console.log('Status:', response3.status);
    console.log('Headers:', Object.fromEntries(response3.headers.entries()));
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testController().catch(console.error);

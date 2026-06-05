// controllerTCP.ts
import TcpSocket from 'react-native-tcp-socket';

// Base64 encoding function
const btoa = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const triplet = (a << 16) | (b << 8) | c;
    
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i > str.length + 1 ? '=' : chars[(triplet >> 6) & 63];
    result += i > str.length ? '=' : chars[triplet & 63];
  }
  
  return result;
};

interface ControllerResult {
  success: boolean;
  status?: number;
  error?: string;
  rawResponse?: string;
}

export const openDoorRawTCP = (
  ip: string,
  port: number,
  door: string,
  username: string,
  password: string
): Promise<ControllerResult> => {
  return new Promise((resolve) => {
    console.log('=== Raw TCP Controller Request ===');
    console.log('IP:', ip);
    console.log('Port:', port);
    console.log('Door:', door);
    
    const credentials = `${username}:${password}`;
    const base64 = btoa(credentials);
    
    console.log('Credentials:', credentials);
    console.log('Base64:', base64);
    
    // Raw HTTP request exactly like Node.js
    const httpRequest = [
      `GET /cdor.cgi?open=1&door=${door} HTTP/1.1`,
      `Host: ${ip}`,
      `Authorization: Basic ${base64}`,
      `Connection: close`,
      ``,
      ``,
    ].join('\r\n');
    
    console.log('--- Raw HTTP Request ---');
    console.log(httpRequest);
    console.log('------------------------');
    
    let response = '';
    let hasResolved = false;
    
    const client = TcpSocket.createConnection(
      { host: ip, port: port },
      () => {
        console.log('TCP Connected');
        client.write(httpRequest);
        console.log('Request sent');
      }
    );
    
    client.on('data', (data) => {
      response += data.toString();
    });
    
    client.on('close', () => {
      console.log('TCP Closed');
      console.log('Response:', response);
      
      if (!hasResolved) {
        hasResolved = true;
        
        if (response.includes('200')) {
          console.log('🎉 SUCCESS!');
          resolve({ success: true, status: 200, rawResponse: response });
        } else if (response.includes('401')) {
          resolve({ success: false, status: 401, rawResponse: response });
        } else {
          resolve({ success: false, error: 'Unknown response', rawResponse: response });
        }
      }
    });
    
    client.on('error', (error) => {
      console.log('TCP Error:', error.message);
      if (!hasResolved) {
        hasResolved = true;
        resolve({ success: false, error: error.message });
      }
    });
    
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        client.destroy();
        resolve({ success: false, error: 'Timeout' });
      }
    }, 5000);
  });
};

export const testRawTCP = async () => {
  return await openDoorRawTCP(
    '192.168.0.170',
    80,
    '0',
    'admin',
    '888888'
  );
};

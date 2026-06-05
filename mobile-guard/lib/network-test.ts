// Network diagnostic utility
import { getServerUrl } from './storage';

export async function runNetworkDiagnostics() {
  console.log('=== Starting Network Diagnostics ===');
  
  try {
    const serverUrl = await getServerUrl();
    console.log('Server URL from storage:', serverUrl);
    
    if (!serverUrl) {
      console.log('❌ No server URL configured');
      return { success: false, error: 'No server URL configured' };
    }
    
    // Test 1: Basic connectivity
    console.log('🔍 Test 1: Basic connectivity test');
    try {
      const healthUrl = serverUrl.startsWith('http') ? `${serverUrl}/api/health` : `http://${serverUrl}/api/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('Health check status:', response.status);
      console.log('Health check ok:', response.ok);
      
      if (response.ok) {
        const healthData = await response.json();
        console.log('Health check response:', healthData);
      } else {
        const errorText = await response.text();
        console.log('Health check error:', errorText);
      }
    } catch (error) {
      console.log('Health check failed:', error);
    }
    
    // Test 2: API endpoint test
    console.log('🔍 Test 2: API endpoint test');
    try {
      const guardHealthUrl = serverUrl.startsWith('http') ? `${serverUrl}/api/guard/health` : `http://${serverUrl}/api/guard/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(guardHealthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('Guard health status:', response.status);
      console.log('Guard health ok:', response.ok);
      
      if (response.ok) {
        const guardHealthData = await response.json();
        console.log('Guard health response:', guardHealthData);
      } else {
        const errorText = await response.text();
        console.log('Guard health error:', errorText);
      }
    } catch (error) {
      console.log('Guard health check failed:', error);
    }
    
    // Test 3: Test with different protocols
    console.log('🔍 Test 3: HTTPS test (if available)');
    try {
      const httpsResponse = await fetch(`https://${serverUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      console.log('HTTPS test status:', httpsResponse.status);
    } catch (error) {
      console.log('HTTPS test failed (expected):', error);
    }
    
    // Test 4: DNS resolution test
    console.log('🔍 Test 4: DNS resolution test');
    try {
      // Try to resolve the hostname
      const url = new URL(serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`);
      console.log('Hostname:', url.hostname);
      console.log('Port:', url.port || '80');
    } catch (error) {
      console.log('URL parsing failed:', error);
    }
    
    console.log('=== Network Diagnostics Complete ===');
    return { success: true, message: 'Diagnostics completed' };
    
  } catch (error) {
    console.log('Diagnostics failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Quick connectivity test
export async function quickConnectivityTest() {
  try {
    const serverUrl = await getServerUrl();
    if (!serverUrl) return false;
    
    const healthUrl = serverUrl.startsWith('http') ? `${serverUrl}/api/health` : `http://${serverUrl}/api/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch {
    return false;
  }
}

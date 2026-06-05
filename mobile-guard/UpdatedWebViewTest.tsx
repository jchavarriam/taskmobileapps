// UpdatedWebViewTest.tsx
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import * as Linking from 'expo-linking';

export default function UpdatedWebViewTest() {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState('Ready');
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [webViewUrl, setWebViewUrl] = useState('about:blank');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-10), message]); // Keep last 10 logs
  };

  const handleOpenDoor = () => {
    setStatus('Loading...');
    setHttpStatus(null);
    setLogs([]);
    
    const url = 'http://admin:888888@192.168.0.170/cdor.cgi?open=1&door=0';
    
    addLog('Navigating to controller...');
    setWebViewUrl(url);
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    addLog(`Nav: ${navState.url} | loading: ${navState.loading}`);
    
    // Check if we navigated to the controller URL
    if (navState.url.includes('192.168.0.170') && !navState.loading) {
      addLog('✅ Navigation to controller completed!');
    }
  };

  const handleLoadEnd = (event: any) => {
    addLog('Load ended');
    
    // Inject script to check if page loaded successfully
    webViewRef.current?.injectJavaScript(`
      (function() {
        var info = {
          url: window.location.href,
          title: document.title,
          body: document.body ? document.body.innerHTML : 'no body',
          bodyLength: document.body ? document.body.innerHTML.length : 0
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(info));
      })();
      true;
    `);
  };

  const handleHttpError = (event: any) => {
    const code = event.nativeEvent.statusCode;
    addLog('HTTP Error: ' + code);
    setHttpStatus(code);
    setStatus('HTTP Error: ' + code);
  };

  const handleShouldStartLoad = (event: any) => {
    addLog('Should start load: ' + event.url);
    return true; // Allow all URLs
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      addLog('Page info: ' + JSON.stringify(data));
      
      // If URL is the controller and body is empty, it worked!
      if (data.url.includes('192.168.0.170')) {
        if (data.bodyLength === 0 || data.body === '' || data.body === 'no body') {
          addLog('🎉 SUCCESS! Empty response = door opened!');
          setStatus('🎉 SUCCESS! Door opened!');
          setHttpStatus(200);
        } else {
          addLog('Response body: ' + data.body.substring(0, 100));
          if (data.body.includes('401') || data.body.includes('Unauthorized')) {
            setStatus('❌ 401 Unauthorized');
            setHttpStatus(401);
          }
        }
      }
    } catch (e) {
      addLog('Message parse error');
    }
  };

  const handleOpenInBrowser = async () => {
    const url = 'http://admin:888888@192.168.0.170/cdor.cgi?open=1&door=0';
    addLog('Opening in system browser...');
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      addLog('Can open URL: ' + canOpen);
      
      if (canOpen) {
        await Linking.openURL(url);
        addLog('Browser opened');
      } else {
        addLog('Cannot open URL');
      }
    } catch (error: any) {
      addLog('Browser error: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WebView Controller Test</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleOpenDoor}>
          <Text style={styles.buttonText}>Test WebView</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.buttonAlt]} onPress={handleOpenInBrowser}>
          <Text style={styles.buttonText}>Open Browser</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Status: {status}</Text>
        {httpStatus && <Text style={styles.httpStatus}>HTTP: {httpStatus}</Text>}
      </View>
      
      {/* Log Output */}
      <View style={styles.logBox}>
        <Text style={styles.logTitle}>Logs:</Text>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>{log}</Text>
        ))}
      </View>
      
      {/* WebView */}
      <View style={styles.webviewBox}>
        <Text style={styles.webviewLabel}>WebView:</Text>
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadEnd={handleLoadEnd}
          onHttpError={handleHttpError}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          originWhitelist={['*']}
          sharedCookiesEnabled={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonAlt: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  statusBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  httpStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  logBox: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxHeight: 150,
  },
  logTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  logText: {
    color: '#0f0',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  webviewBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webviewLabel: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 8,
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
});

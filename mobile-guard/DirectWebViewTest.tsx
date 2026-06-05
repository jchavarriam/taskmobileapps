// DirectWebViewTest.tsx
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function DirectWebViewTest() {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState('Ready');
  const [webViewUrl, setWebViewUrl] = useState('about:blank');

  const handleOpenDoor = () => {
    setStatus('Loading...');
    
    // Direct URL with credentials
    const url = 'http://admin:888888@192.168.0.170/cdor.cgi?open=1&door=0';
    
    console.log('=== Direct WebView Navigation ===');
    console.log('Navigating to:', url.replace('888888', '****'));
    
    setWebViewUrl(url);
  };

  const handleLoadStart = () => {
    console.log('WebView: Load started');
    setStatus('Loading...');
  };

  const handleLoadEnd = () => {
    console.log('WebView: Load ended');
    setStatus('Load completed - check console');
    
    // Try to get page info
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({
        url: window.location.href,
        status: 'loaded'
      }));
      true;
    `);
  };

  const handleHttpError = (event: any) => {
    const statusCode = event.nativeEvent.statusCode;
    console.log('WebView HTTP Error:', statusCode);
    setStatus('HTTP Error: ' + statusCode);
  };

  const handleError = (event: any) => {
    console.log('WebView Error:', event.nativeEvent);
    setStatus('Error: ' + event.nativeEvent.description);
  };

  const handleMessage = (event: any) => {
    console.log('WebView Message:', event.nativeEvent.data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Direct WebView Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleOpenDoor}>
        <Text style={styles.buttonText}>Open Door (Direct Navigate)</Text>
      </TouchableOpacity>
      
      <Text style={styles.status}>Status: {status}</Text>
      
      {/* Visible WebView for debugging */}
      <View style={styles.webviewBox}>
        <Text style={styles.label}>WebView Output:</Text>
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webview}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onHttpError={handleHttpError}
          onError={handleError}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          originWhitelist={['*']}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          // Important for Basic Auth
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666',
  },
  webviewBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  label: {
    padding: 10,
    backgroundColor: '#007AFF',
    color: 'white',
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
});

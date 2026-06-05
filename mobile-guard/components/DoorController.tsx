// components/DoorController.tsx
import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

export interface DoorControllerRef {
  openDoor: (
    ip: string,
    door: string,
    username: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
}

export const DoorController = forwardRef<DoorControllerRef, {}>((_props, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [url, setUrl] = useState('about:blank');
  const currentRequestUrlRef = useRef<string>('');
  const requestInFlightRef = useRef(false);

  // Store resolve function for the promise
  const resolveRef = useRef<((result: { success: boolean; message: string }) => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const finalize = (result: { success: boolean; message: string }) => {
    if (!resolveRef.current) return;
    resolveRef.current(result);
    resolveRef.current = null;
    requestInFlightRef.current = false;
    currentRequestUrlRef.current = '';
    cleanup();
  };

  // Cleanup function
  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setUrl('about:blank');
  };

  // Expose openDoor method
  useImperativeHandle(ref, () => ({
    openDoor: (ip, door, username, password) => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;

        // Build URL with embedded credentials
        const controllerUrl = `http://${username}:${password}@${ip}/cdor.cgi?open=1&door=${door}`;
        currentRequestUrlRef.current = controllerUrl;
        requestInFlightRef.current = true;


        // Safety timeout - resolve after 5 seconds if no response
        timeoutRef.current = setTimeout(() => {
          console.log('Timeout reached - assuming success');
          finalize({ success: true, message: 'Door command sent' });
        }, 5000);

        // Navigate to controller
        setUrl(controllerUrl);
      });
    },
  }));

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // Check if navigation to controller completed
    if (navState.url.includes('cdor.cgi') && !navState.loading) {
      console.log('✅ Controller navigation completed');
    }
  };

  const handleLoadEnd = () => {
    // Inject script to check page content
    webViewRef.current?.injectJavaScript(`
      (function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          url: window.location.href,
          body: document.body ? document.body.innerText : '',
          bodyLength: document.body ? document.body.innerText.length : 0
        }));
      })();
      true;
    `);
  };

  const handleHttpError = (event: any) => {
    const statusCode = event.nativeEvent.statusCode;
    const url = event.nativeEvent.url;

    if (statusCode === 401 || statusCode === 403) {
      finalize({
        success: false,
        message: `HTTP Error: ${statusCode} - ${url}`,
      });
      return;
    }

    if (requestInFlightRef.current && currentRequestUrlRef.current.includes('cdor.cgi')) {
      finalize({ success: true, message: 'Door command sent' });
      return;
    }

    finalize({
      success: false,
      message: `HTTP Error: ${statusCode} - ${url}`,
    });
  };

  const handleError = (event: any) => {
    const description = String(event?.nativeEvent?.description || '').toLowerCase();
    const failingUrl = String(event?.nativeEvent?.url || '');

    const isSocketClose =
      description.includes('socket') ||
      description.includes('econnreset') ||
      description.includes('unexpected end of stream') ||
      description.includes('connection reset') ||
      description.includes('empty response');

    const isControllerCall =
      requestInFlightRef.current &&
      (currentRequestUrlRef.current.includes('cdor.cgi') || failingUrl.includes('cdor.cgi'));

    if (isSocketClose && isControllerCall) {
      finalize({ success: true, message: 'Door command sent' });
      return;
    }

    if (isControllerCall) {
      finalize({ success: false, message: 'No se pudo abrir la puerta' });
      return;
    }

    finalize({ success: false, message: 'Error de conexión con controlador' });
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // Check if we're on the controller URL
      if (data.url && data.url.includes('cdor.cgi')) {
        // Check for auth error in body
        if (data.body && (data.body.includes('401') || data.body.includes('Unauthorized'))) {
          resolveRef.current?.({ success: false, message: 'Authentication failed' });
        } else if (data.bodyLength === 0) {
          // Empty body = success!
          resolveRef.current?.({ success: true, message: 'Door opened!' });
        } else {
          resolveRef.current?.({ success: false, message: 'Unexpected response' });
        }

        resolveRef.current = null;
        cleanup();
      }
    } catch (e) {
      // Message parse error - ignore
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={handleLoadEnd}
        onHttpError={handleHttpError}
        onError={handleError}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        mixedContentMode="always"
        originWhitelist={['*']}
        sharedCookiesEnabled={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 0,
    height: 0,
    position: 'absolute',
    opacity: 0,
  },
});

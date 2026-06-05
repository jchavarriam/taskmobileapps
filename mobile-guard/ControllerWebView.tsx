// ControllerWebView.tsx
import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface ControllerWebViewRef {
  openDoor: (ip: string, door: string, username: string, password: string) => Promise<boolean>;
}

interface Props {
  onResult?: (success: boolean, message: string) => void;
}

export const ControllerWebView = forwardRef<ControllerWebViewRef, Props>(
  ({ onResult }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      openDoor: (ip: string, door: string, username: string, password: string): Promise<boolean> => {
        return new Promise((resolve) => {
          setResolvePromise(() => resolve);

          // URL with embedded credentials - browser handles Basic Auth this way
          const url = `http://${username}:${password}@${ip}/cdor.cgi?open=1&door=${door}`;

          console.log('=== WebView Door Open ===');
          console.log('URL:', url.replace(password, '****'));

          // Inject JavaScript to make the request
          const jsCode = `
            (function() {
              console.log('WebView: Starting request...');
              
              var xhr = new XMLHttpRequest();
              xhr.open('GET', '${url}', true);
              xhr.timeout = 5000;
              
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  console.log('WebView: Status = ' + xhr.status);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'result',
                    status: xhr.status,
                    response: xhr.responseText
                  }));
                }
              };
              
              xhr.onerror = function() {
                console.log('WebView: XHR Error');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: 'XHR Error'
                }));
              };
              
              xhr.ontimeout = function() {
                console.log('WebView: Timeout');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: 'Timeout'
                }));
              };
              
              xhr.send();
            })();
            true;
          `;

          webViewRef.current?.injectJavaScript(jsCode);
        });
      },
    }));

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        console.log('WebView message:', data);

        if (data.type === 'result') {
          const success = data.status === 200;
          console.log(success ? '🎉 WebView SUCCESS!' : '❌ WebView failed');
          
          onResult?.(success, success ? 'Door opened!' : `Status: ${data.status}`);
          resolvePromise?.(success);
        } else if (data.type === 'error') {
          console.log('❌ WebView error:', data.message);
          onResult?.(false, data.message);
          resolvePromise?.(false);
        }
      } catch (e) {
        console.log('WebView parse error:', e);
        resolvePromise?.(false);
      }
    };

    return (
      <View style={styles.hidden}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'about:blank' }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.webview}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    position: 'absolute',
    top: -1000,
    left: -1000,
  },
  webview: {
    width: 1,
    height: 1,
  },
});

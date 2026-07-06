// components/DoorController.tsx
import React, { useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface DoorControllerRef {
  openDoor: (
    ip: string,
    door: string,
    username: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
}

const DOOR_TIMEOUT_MS = 6000;

type DoorResult = { success: boolean; message: string };
type DoorRequest = {
  host: string;
  door: string;
  username: string;
  password: string;
  headerUrl: string;
  legacyUrl: string;
};

function normalizeControllerHost(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function encodeBase64(str: string): string {
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

function buildControllerUrls(ip: string, door: string, username: string, password: string) {
  const host = normalizeControllerHost(ip);
  const safeDoor = encodeURIComponent(String(door || '').trim());
  const path = `/cdor.cgi?open=1&door=${safeDoor}`;
  const authUsername = encodeURIComponent(String(username || '').trim());
  const authPassword = encodeURIComponent(String(password || '').trim());

  return {
    host,
    headerUrl: `http://${host}${path}`,
    legacyUrl: `http://${authUsername}:${authPassword}@${host}${path}`,
    debugUrl: `http://${host}${path}`,
    legacyDebugUrl: `http://${authUsername}:****@${host}${path}`,
  };
}

async function openWithHeaderAuth(request: DoorRequest): Promise<DoorResult> {
  const credentials = encodeBase64(`${request.username}:${request.password}`);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), DOOR_TIMEOUT_MS);

  try {
    const response = await fetch(request.headerUrl, {
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` },
      signal: abortController.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Credenciales incorrectas (${response.status}). URL: http://${request.host}/cdor.cgi?open=1&door=${encodeURIComponent(request.door)}`,
      };
    }

    return { success: true, message: 'Puerta abierta' };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const msg = String(error?.message || '').toLowerCase();

    if (error?.name === 'AbortError' || msg.includes('aborted') || msg.includes('abort')) {
      return { success: true, message: 'Comando enviado al controlador' };
    }

    if (
      msg.includes('econnreset') ||
      msg.includes('connection reset') ||
      msg.includes('empty response') ||
      msg.includes('unexpected end') ||
      msg.includes('socket')
    ) {
      return { success: true, message: 'Comando enviado al controlador' };
    }

    return { success: false, message: `No se pudo conectar al controlador (${error?.message || 'error de red'})` };
  }
}

export const DoorController = forwardRef<DoorControllerRef, {}>((_, ref) => {
  const [url, setUrl] = useState('about:blank');
  const webViewRef = useRef<WebView>(null);
  const requestRef = useRef<DoorRequest | null>(null);
  const resolveRef = useRef<((result: DoorResult) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryingAuthRef = useRef(false);

  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    requestRef.current = null;
    retryingAuthRef.current = false;
    setUrl('about:blank');
  };

  const finalize = (result: DoorResult) => {
    if (!resolveRef.current) return;
    const resolve = resolveRef.current;
    resolveRef.current = null;
    cleanup();
    resolve(result);
  };

  const fallbackToHeaderAuth = async () => {
    const request = requestRef.current;
    if (!request) return;
    retryingAuthRef.current = true;
    const result = await openWithHeaderAuth(request);
    finalize(result);
  };

  useImperativeHandle(ref, () => ({
    openDoor: (ip, door, username, password) => {
      const safeUsername = String(username || '').trim();
      const safePassword = String(password || '').trim();
      const safeDoor = String(door || '').trim();
      const { host, headerUrl, legacyUrl, debugUrl, legacyDebugUrl } = buildControllerUrls(
        ip,
        safeDoor,
        safeUsername,
        safePassword
      );

      return new Promise((resolve) => {
        console.log('Door controller URL:', debugUrl);
        console.log('Door controller legacy URL:', legacyDebugUrl);
        console.log('Door controller user:', safeUsername);

        resolveRef.current = resolve;
        requestRef.current = {
          host,
          door: safeDoor,
          username: safeUsername,
          password: safePassword,
          headerUrl,
          legacyUrl,
        };
        retryingAuthRef.current = false;
        timeoutRef.current = setTimeout(() => {
          finalize({ success: true, message: 'Comando enviado al controlador' });
        }, DOOR_TIMEOUT_MS);
        setUrl(legacyUrl);
      });
    },
  }));

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        onLoadEnd={() => {
          if (requestRef.current && !retryingAuthRef.current) {
            finalize({ success: true, message: 'Puerta abierta' });
          }
        }}
        onHttpError={(event) => {
          const statusCode = event.nativeEvent.statusCode;
          if (statusCode === 401 || statusCode === 403) {
            fallbackToHeaderAuth();
            return;
          }

          if (requestRef.current) {
            finalize({ success: true, message: 'Comando enviado al controlador' });
          }
        }}
        onError={(event) => {
          const description = String(event?.nativeEvent?.description || '').toLowerCase();
          const isControllerClose =
            description.includes('socket') ||
            description.includes('econnreset') ||
            description.includes('unexpected end') ||
            description.includes('connection reset') ||
            description.includes('empty response');

          if (isControllerClose) {
            finalize({ success: true, message: 'Comando enviado al controlador' });
            return;
          }

          fallbackToHeaderAuth();
        }}
        javaScriptEnabled
        mixedContentMode="always"
        originWhitelist={['*']}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  webview: {
    width: 1,
    height: 1,
  },
});

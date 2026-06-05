// mobile/app/(tabs)/index.tsx
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { getServerUrl } from '@/lib/storage';

function escapeForSingleQuoteJs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function normalizeServerUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return rawUrl;

  const lanHost = '192.168.1.51';
  const unreachableHosts = new Set(['localhost', '127.0.0.1', '179.63.252.22']);

  try {
    const parsed = new URL(rawUrl);
    if (unreachableHosts.has(parsed.hostname)) {
      parsed.hostname = lanHost;
      console.log('rewrote server host to LAN:', parsed.toString());
      return parsed.toString().replace(/\/$/, '');
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadServerUrl() {
      try {
        const storedUrl = await getServerUrl();
        console.log('loaded serverUrl from storage:', storedUrl);
        const url = normalizeServerUrl(storedUrl);
        if (!cancelled) {
          setServerUrl(url);
        }
      } catch (e) {
        console.error('error loading serverUrl', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadServerUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  const injectedStorage = useMemo(() => {
    if (!token || !user) return undefined;

    const tokenEscaped = escapeForSingleQuoteJs(token);
    const userJsonEscaped = escapeForSingleQuoteJs(JSON.stringify(user));

    return `
      (function() {
        try {
          var existing = document.querySelector('meta[name="viewport"]');
          if (!existing) {
            existing = document.createElement('meta');
            existing.setAttribute('name', 'viewport');
            document.head.appendChild(existing);
          }
          existing.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');

          var style = document.getElementById('tas-mobile-safearea');
          if (!style) {
            style = document.createElement('style');
            style.id = 'tas-mobile-safearea';
            style.innerHTML = '\n              html, body {\n                max-width: 100vw;\n                overflow-x: hidden;\n                -webkit-text-size-adjust: 100%;\n              }\n              body {\n                padding-top: max(10px, env(safe-area-inset-top));\n                padding-bottom: max(18px, env(safe-area-inset-bottom));\n              }\n              button, a, [role="button"], input, select, textarea {\n                min-height: 44px;\n              }\n            ';
            document.head.appendChild(style);
          }

          localStorage.setItem('resident_token', '${tokenEscaped}');
          localStorage.setItem('resident_user', '${userJsonEscaped}');
        } catch (e) {}
      })();
      true;
    `;
  }, [token, user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.helperText}>Cargando portal de residentes...</Text>
      </View>
    );
  }

  if (!serverUrl) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Servidor no configurado</Text>
        <Text style={styles.helperText}>Activa la cuenta para configurar la URL del servidor.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/activate')}>
          <Text style={styles.buttonText}>Ir a Activación</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // show the target URL in logs for debugging
  console.log('using serverUrl for WebView:', serverUrl);

  return (
    <View style={[styles.webContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <WebView
        source={{ uri: `${serverUrl}/resident` }}
        injectedJavaScriptBeforeContentLoaded={injectedStorage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error loading', nativeEvent);
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.helperText}>Abriendo /resident...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  helperText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

// mobile/lib/auth.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { getServerUrl, getAuthToken, getAuthMode, getUser, setServerUrl, setAuthToken, setAuthMode, setUser, clearAll, clearAuth, User } from './storage';
import { activate as apiActivate, login as apiLogin, fetchMe, setUnauthorizedHandler } from './api';
import { registerResidentPushToken, deactivateResidentPushTokens } from './push';
import { base64UrlDecode } from './utils';

interface AuthState {
  isLoading: boolean;
  isActivated: boolean;
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  activate: (activationCode: string, newPassword: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isActivated: false,
    isLoggedIn: false,
    user: null,
    token: null,
  });

  const sessionExpiredRef = useRef(false);
  const pushRegisteredRef = useRef(false);

  // Once per app process: ask permission (first time only) and register the
  // device's Expo push token with the backend. Safe to call repeatedly —
  // guarded here, and the backend upserts by token.
  const ensurePushRegistered = () => {
    if (pushRegisteredRef.current) return;
    pushRegisteredRef.current = true;
    registerResidentPushToken().catch((error) => {
      // Android without FCM config, denied permission, or offline — retry
      // next app launch rather than surfacing an error.
      pushRegisteredRef.current = false;
      console.warn('Push registration failed:', error);
    });
  };

  useEffect(() => {
    // Any authenticated request that gets a 401 (expired/revoked session)
    // logs out cleanly and routes to login — never a broken "logged in" state.
    setUnauthorizedHandler(handleSessionExpired);

    checkAuth().then(() => validateSession());

    // Re-validate (and renew) the session every time the app returns to the
    // foreground — this is what keeps active users logged in indefinitely.
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        validateSession();
      }
    });

    return () => {
      setUnauthorizedHandler(null);
      subscription.remove();
    };
  }, []);

  const handleSessionExpired = async () => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    try {
      await clearAuth(); // keeps serverUrl: back to login, not re-activation
    } catch (error) {
      console.error('Error clearing expired session:', error);
    }
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isLoggedIn: false,
      user: null,
      token: null,
    }));
    router.replace({ pathname: '/login', params: { expired: '1' } });
  };

  const validateSession = async () => {
    try {
      const user = await getUser();
      if (!user) return;
      // Valid session → server re-stamps the cookie (sliding renewal).
      // Dead session → 401 → unauthorized handler takes over.
      const response = await fetchMe();
      if (response?.user) {
        await setUser(response.user);
        setState((prev) => (prev.isLoggedIn ? { ...prev, user: response.user ?? prev.user } : prev));
        // Session confirmed valid — make sure this device receives pushes
        // (covers users who logged in before push support existed).
        ensurePushRegistered();
      }
    } catch {
      // Network/offline errors are ignored — the user stays logged in;
      // a real 401 is handled by the unauthorized handler.
    }
  };

  const checkAuth = async () => {
    try {
      const serverUrl = await getServerUrl();
      const token = await getAuthToken();
      const authMode = await getAuthMode();
      const user = await getUser();
      const isLoggedIn = !!user && (authMode === 'cookie' || !!token);

      setState({
        isLoading: false,
        isActivated: !!serverUrl,
        isLoggedIn,
        user,
        token,
      });
    } catch (error) {
      console.error('Error checking auth:', error);
      setState({
        isLoading: false,
        isActivated: false,
        isLoggedIn: false,
        user: null,
        token: null,
      });
    }
  };

  const activate = async (activationCode: string, newPassword: string) => {
    try {
      const response = await apiActivate(activationCode, newPassword);
      const authToken = response.token ?? null;

      // Extract server URL from activation code
      const [serverUrlPart] = activationCode.split(':');
      const serverUrl = base64UrlDecode(serverUrlPart);

      // Save all credentials
      await setServerUrl(serverUrl);
      await setAuthToken(authToken ?? '');
      await setAuthMode(authToken ? 'bearer' : 'cookie');
      await setUser(response.user);

      sessionExpiredRef.current = false;
      setState({
        isLoading: false,
        isActivated: true,
        isLoggedIn: true,
        user: response.user,
        token: authToken,
      });
      ensurePushRegistered();
    } catch (error) {
      console.error('Activation error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password);
      if (!response.user) {
        throw new Error('Login response missing user');
      }
      const authToken = response.token ?? null;

      await setAuthToken(authToken ?? '');
      await setAuthMode(authToken ? 'bearer' : 'cookie');
      await setUser(response.user);

      sessionExpiredRef.current = false;
      setState({
        ...state,
        isLoading: false,
        isLoggedIn: true,
        user: response.user,
        token: authToken,
      });
      ensurePushRegistered();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Best-effort: stop pushes to this device before dropping credentials.
      await deactivateResidentPushTokens().catch(() => {});
      pushRegisteredRef.current = false;
      await clearAll();
      setState({
        isLoading: false,
        isActivated: false,
        isLoggedIn: false,
        user: null,
        token: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, activate, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

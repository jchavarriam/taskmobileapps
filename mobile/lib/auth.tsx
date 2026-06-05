// mobile/lib/auth.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getServerUrl, getAuthToken, getUser, setServerUrl, setAuthToken, setUser, clearAll, User } from './storage';
import { activate as apiActivate, login as apiLogin } from './api';
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const serverUrl = await getServerUrl();
      const token = await getAuthToken();
      const user = await getUser();

      setState({
        isLoading: false,
        isActivated: !!serverUrl,
        isLoggedIn: !!token && !!user,
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

      // Extract server URL from activation code
      const [serverUrlPart] = activationCode.split(':');
      const serverUrl = base64UrlDecode(serverUrlPart);

      // Save all credentials
      await setServerUrl(serverUrl);
      await setAuthToken(response.token);
      await setUser(response.user);

      setState({
        isLoading: false,
        isActivated: true,
        isLoggedIn: true,
        user: response.user,
        token: response.token,
      });
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

      await setAuthToken(response.token);
      await setUser(response.user);

      setState({
        ...state,
        isLoading: false,
        isLoggedIn: true,
        user: response.user,
        token: response.token,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
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

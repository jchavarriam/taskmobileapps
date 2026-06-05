// mobile/lib/auth.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getServerUrl, getAuthToken, getUser, setAuthToken, setUser, clearAll, User } from './storage';
import { login as apiLogin } from './api';

interface AuthState {
  isLoading: boolean;
  isActivated: boolean;
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
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

  
  const clearAuthData = async () => {
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
      console.error('Error clearing auth data:', error);
    }
  };

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

  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin(username, password);
      
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
      await clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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

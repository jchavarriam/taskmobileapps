// mobile/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_URL: '@taskontrol/server_url',
  AUTH_TOKEN: '@taskontrol/auth_token',
  USER: '@taskontrol/user',
};

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  siteId: string | null;
  sectorId: string | null;
}

function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  return withProtocol.replace(/\/+$/, '');
}

export async function getServerUrl(): Promise<string | null> {
  try {
    const url = await AsyncStorage.getItem(KEYS.SERVER_URL);
    return url ? normalizeServerUrl(url) : null;
  } catch (error) {
    console.error('Error getting server URL:', error);
    return null;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  try {
    const normalized = normalizeServerUrl(url);
    await AsyncStorage.setItem(KEYS.SERVER_URL, normalized);
  } catch (error) {
    console.error('Error setting server URL:', error);
    throw error;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error('Error setting auth token:', error);
    throw error;
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const userJson = await AsyncStorage.getItem(KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function setUser(user: User | null | undefined): Promise<void> {
  try {
    if (!user) {
      await AsyncStorage.removeItem(KEYS.USER);
      return;
    }
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user:', error);
    throw error;
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.SERVER_URL,
      KEYS.AUTH_TOKEN,
      KEYS.USER,
    ]);
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
}

export async function isActivated(): Promise<boolean> {
  const serverUrl = await getServerUrl();
  return serverUrl !== null;
}

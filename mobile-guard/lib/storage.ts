// mobile/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_URL: '@taskontrol/server_url',
  AUTH_TOKEN: '@taskontrol/auth_token',
  USER: '@taskontrol/user',
  CONTROLLER_IP: '@taskgarita/controller_ip',
  DOOR_NUMBER: '@taskgarita/door_number',
  MODE: '@taskgarita/mode',
  APP_MODE: '@taskgarita/app_mode',
  CONTROLLER_USERNAME: '@taskgarita/controller_username',
  CONTROLLER_PASSWORD: '@taskgarita/controller_password',
  CONTROLLER_IP_2: '@taskgarita/controller_ip_2',
  DOOR_NUMBER_2: '@taskgarita/door_number_2',
  CONTROLLER_USERNAME_2: '@taskgarita/controller_username_2',
  CONTROLLER_PASSWORD_2: '@taskgarita/controller_password_2',
};

export type GaritaMode = 'ENTRY' | 'EXIT';
export type GuardAppMode = 'KIOSKO' | 'GUARDIA';

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  siteId: string | null;
  sectorId: string | null;
}

export async function getServerUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.SERVER_URL);
  } catch (error) {
    console.error('Error getting server URL:', error);
    return null;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url);
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

export async function setUser(user: User): Promise<void> {
  try {
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
      KEYS.CONTROLLER_IP,
      KEYS.DOOR_NUMBER,
      KEYS.MODE,
      KEYS.APP_MODE,
      KEYS.CONTROLLER_USERNAME,
      KEYS.CONTROLLER_PASSWORD,
      KEYS.CONTROLLER_IP_2,
      KEYS.DOOR_NUMBER_2,
      KEYS.CONTROLLER_USERNAME_2,
      KEYS.CONTROLLER_PASSWORD_2,
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

export async function getControllerIp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CONTROLLER_IP);
  } catch (error) {
    console.error('Error getting controller IP:', error);
    return null;
  }
}

export async function setControllerIp(ip: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTROLLER_IP, ip);
  } catch (error) {
    console.error('Error setting controller IP:', error);
    throw error;
  }
}

export async function getDoorNumber(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.DOOR_NUMBER);
  } catch (error) {
    console.error('Error getting door number:', error);
    return null;
  }
}

export async function setDoorNumber(door: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DOOR_NUMBER, door);
  } catch (error) {
    console.error('Error setting door number:', error);
    throw error;
  }
}

export async function getMode(): Promise<GaritaMode> {
  try {
    const mode = await AsyncStorage.getItem(KEYS.MODE);
    return mode === 'EXIT' ? 'EXIT' : 'ENTRY';
  } catch (error) {
    console.error('Error getting mode:', error);
    return 'ENTRY';
  }
}

export async function setMode(mode: GaritaMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.MODE, mode);
  } catch (error) {
    console.error('Error setting mode:', error);
    throw error;
  }
}

export async function getAppMode(): Promise<GuardAppMode> {
  try {
    const mode = await AsyncStorage.getItem(KEYS.APP_MODE);
    return mode === 'KIOSKO' ? 'KIOSKO' : 'GUARDIA';
  } catch (error) {
    console.error('Error getting app mode:', error);
    return 'GUARDIA';
  }
}

export async function setAppMode(mode: GuardAppMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.APP_MODE, mode);
  } catch (error) {
    console.error('Error setting app mode:', error);
    throw error;
  }
}

export async function getControllerUsername(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CONTROLLER_USERNAME);
  } catch (error) {
    console.error('Error getting controller username:', error);
    return null;
  }
}

export async function setControllerUsername(username: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTROLLER_USERNAME, username);
  } catch (error) {
    console.error('Error setting controller username:', error);
    throw error;
  }
}

export async function getControllerPassword(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CONTROLLER_PASSWORD);
  } catch (error) {
    console.error('Error getting controller password:', error);
    return null;
  }
}

export async function setControllerPassword(password: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTROLLER_PASSWORD, password);
  } catch (error) {
    console.error('Error setting controller password:', error);
    throw error;
  }
}

export async function getControllerIp2(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CONTROLLER_IP_2);
  } catch (error) {
    console.error('Error getting controller IP 2:', error);
    return null;
  }
}

export async function setControllerIp2(ip: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTROLLER_IP_2, ip);
  } catch (error) {
    console.error('Error setting controller IP 2:', error);
    throw error;
  }
}

export async function getDoorNumber2(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.DOOR_NUMBER_2);
  } catch (error) {
    console.error('Error getting door number 2:', error);
    return null;
  }
}

export async function setDoorNumber2(door: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DOOR_NUMBER_2, door);
  } catch (error) {
    console.error('Error setting door number 2:', error);
    throw error;
  }
}

export async function getControllerUsername2(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CONTROLLER_USERNAME_2);
  } catch (error) {
    console.error('Error getting controller username 2:', error);
    return null;
  }
}

export async function setControllerUsername2(username: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTROLLER_USERNAME_2, username);
  } catch (error) {
    console.error('Error setting controller username 2:', error);
    throw error;
  }
}

export async function getControllerPassword2(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CONTROLLER_PASSWORD_2);
  } catch (error) {
    console.error('Error getting controller password 2:', error);
    return null;
  }
}

export async function setControllerPassword2(password: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTROLLER_PASSWORD_2, password);
  } catch (error) {
    console.error('Error setting controller password 2:', error);
    throw error;
  }
}

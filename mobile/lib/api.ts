// mobile/lib/api.ts
import { getServerUrl, getAuthToken, User } from './storage';
import { base64UrlDecode } from './utils';

export async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const serverUrl = await getServerUrl();
  if (!serverUrl) {
    throw new Error('Server URL not configured');
  }

  const requestUrl = `${serverUrl}${path}`;

  const authToken = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Network request failed: ${requestUrl}. ${message}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return await response.json();
}

export interface ActivateResponse {
  success: boolean;
  token: string;
  user: User;
}

export async function activate(activationCode: string, newPassword: string): Promise<ActivateResponse> {
  // Extract server URL from activation code
  const [serverUrlPart] = activationCode.split(':');
  if (!serverUrlPart) {
    throw new Error('Invalid activation code');
  }

  // Decode server URL using base64 URL-safe decode
  const decodedServerUrl = base64UrlDecode(serverUrlPart).trim();
  const serverUrl = /^https?:\/\//i.test(decodedServerUrl)
    ? decodedServerUrl.replace(/\/+$/, '')
    : `http://${decodedServerUrl.replace(/\/+$/, '')}`;

  // Make activation request to the extracted server URL
  const requestUrl = `${serverUrl}/api/resident/activate`;
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activationCode, newPassword }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Activation request failed: ${requestUrl}. ${message}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Activation failed' }));
    throw new Error(errorData.message || 'Activation failed');
  }

  return await response.json();
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

interface RawLoginResponse {
  success: boolean;
  token: string;
  user?: User;
  guard?: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiCall<RawLoginResponse>('/api/resident/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const normalizedUser = response.user ?? response.guard;
  if (!normalizedUser) {
    throw new Error('Login response missing user data');
  }

  return {
    success: response.success,
    token: response.token,
    user: normalizedUser,
  };
}

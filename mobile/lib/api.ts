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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
      credentials: 'include',
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
  token?: string;
  user: User;
}

interface RawActivateResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  sessionToken?: string;
  user?: User;
}

function resolveAuthToken(payload: {
  token?: string;
  accessToken?: string;
  sessionToken?: string;
}): string | undefined {
  const candidates = [payload.token, payload.accessToken, payload.sessionToken];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
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
      credentials: 'include',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Activation request failed: ${requestUrl}. ${message}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Activation failed' }));
    throw new Error(errorData.message || 'Activation failed');
  }

  const data = await response.json() as RawActivateResponse;
  if (!data.user) {
    throw new Error('Activation response missing user data');
  }

  return {
    success: data.success,
    token: resolveAuthToken(data),
    user: data.user,
  };
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user: User;
}

interface RawLoginResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  sessionToken?: string;
  user?: User;
  guard?: User;
  resident?: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiCall<RawLoginResponse>('/api/resident/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const normalizedUser = response.user ?? response.resident ?? response.guard;
  if (!normalizedUser) {
    throw new Error('Login response missing user data');
  }

  return {
    success: response.success,
    token: resolveAuthToken(response),
    user: normalizedUser,
  };
}

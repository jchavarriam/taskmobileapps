// mobile/lib/api.ts
import { getServerUrl, getAuthToken, User, getControllerIp, getDoorNumber, getControllerUsername, getControllerPassword } from './storage';
import axios from 'axios';

let siteMapCache: any = null;
let siteMapCacheAt = 0;
const SITE_MAP_CACHE_MS = 15_000;
const MEDIA_UPLOAD_TIMEOUT_MS = 7000;
const DEFAULT_API_TIMEOUT_MS = 15000;
const ENTRY_EXIT_API_TIMEOUT_MS = 45000;

function getApiTimeoutMs(path: string): number {
  if (path === '/api/guard/exit/code' || path === '/api/guard/entry/code') {
    return ENTRY_EXIT_API_TIMEOUT_MS;
  }
  return DEFAULT_API_TIMEOUT_MS;
}


export function getCachedSiteMap() {
  const now = Date.now();
  if (siteMapCache && now - siteMapCacheAt < SITE_MAP_CACHE_MS) {
    return siteMapCache;
  }
  return null;
}

// React Native compatible base64 encoding
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

export async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  console.log('🌐 apiCall: Starting request to:', path);

  const serverUrl = await getServerUrl();
  if (!serverUrl) {
    console.log('❌ apiCall: Server URL not configured');
    throw new Error('Server URL not configured');
  }
  console.log('🌐 apiCall: Server URL configured:', serverUrl);

  const authToken = await getAuthToken();
  console.log('🌐 apiCall: Auth token available:', !!authToken);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.headers) {
    const incoming = options.headers as Record<string, string>;
    for (const [k, v] of Object.entries(incoming)) {
      if (typeof v === 'string') headers[k] = v;
    }
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
    console.log('🌐 apiCall: Authorization header added');
  }

  const fullUrl = serverUrl.startsWith('http') ? `${serverUrl}${path}` : `http://${serverUrl}${path}`;
  console.log('🌐 apiCall: Full URL:', fullUrl);
  console.log('🌐 apiCall: Headers:', headers);
  console.log('🌐 apiCall: Options:', options);

  // Enhanced debugging
  console.log('=== API Call Debug ===');
  console.log('Server URL:', serverUrl);
  console.log('Full URL:', fullUrl);
  console.log('Path:', path);
  console.log('Method:', options?.method || 'GET');
  console.log('Headers:', headers);
  console.log('Body:', options?.body);
  console.log('Auth Token:', authToken ? 'PRESENT' : 'MISSING');

  try {
    // Manual timeout implementation for React Native compatibility
    const controller = new AbortController();
    const timeoutMs = getApiTimeoutMs(path);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('=== API Response Debug ===');
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.log('Error Response Data:', errorData);
      } catch (e) {
        console.log('Failed to parse error response as JSON');
        const errorText = await response.text();
        console.log('Error Response Text:', errorText);
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      const apiError: any = new Error(errorData.message || `HTTP ${response.status}`);
      apiError.status = response.status;
      apiError.data = errorData;
      throw apiError;
    }

    const result = await response.json();
    console.log('=== API Success ===');
    console.log('Response Data:', result);
    return result;
  } catch (error: any) {
    console.log('=== API Error Details ===');
    console.log('Error:', error);
    console.log('Error Type:', error?.constructor?.name);
    console.log('Error Message:', error?.message);
    console.log('Error Stack:', error?.stack);

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Network request failed')) {
        console.log('🔍 Network failure detected');
        console.log('🔍 Checking connectivity...');

        // Try a simple connectivity test
        try {
          const testUrl = serverUrl.startsWith('http') ? `${serverUrl}/api/health` : `http://${serverUrl}/api/health`;
          const testController = new AbortController();
          const testTimeoutId = setTimeout(() => testController.abort(), 5000);

          const testResponse = await fetch(testUrl, {
            method: 'GET',
            signal: testController.signal,
          });

          clearTimeout(testTimeoutId);
          console.log('🔍 Connectivity test status:', testResponse.status);
          if (testResponse.ok) {
            console.log('🔍 Server is reachable but API endpoint failed');
          }
        } catch (testError) {
          console.log('🔍 Connectivity test failed:', testError);
        }

        throw new Error('Network request failed - unable to reach server');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timeout - server did not respond in time');
      } else if (error.message.toLowerCase().includes('abort')) {
        throw new Error('Request was aborted or timed out');
      } else {
        throw error;
      }
    }

    throw new Error('Unknown network error occurred');
  }
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

type MediaUploadContext = 'VISIT_ENTRY' | 'VISIT_EXIT' | 'APPROVAL_ENTRY' | 'APPROVAL_EXIT';

async function readUriAsUploadBody(uri: string, signal?: AbortSignal): Promise<{ body: Blob; bytes: number }> {
  const response = await fetch(uri, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error(`Failed reading local photo URI: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  return {
    body: blob,
    bytes: blob.size,
  };
}

async function uploadGuardMedia(params: {
  context: MediaUploadContext;
  photoUri: string;
  mime?: string;
  signal?: AbortSignal;
}) {
  const mime = String(params.mime || 'image/jpeg').toLowerCase();
  const readStartAt = Date.now();
  const uploadBody = await readUriAsUploadBody(params.photoUri, params.signal);
  const readMs = Date.now() - readStartAt;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

  const signed = await apiCall<{
    success: boolean;
    mediaKey: string;
    uploadUrl: string;
  }>('/api/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      context: params.context,
      mime,
      bytes: uploadBody.bytes,
      ext,
    }),
  });

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: {
      'x-upsert': 'false',
    },
    body: (() => {
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('file', {
        uri: params.photoUri,
        type: mime,
        name: `guard-photo.${ext}`,
      } as any);
      return form;
    })(),
    ...(params.signal ? { signal: params.signal } : {}),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Media upload failed: HTTP ${uploadResponse.status}`);
  }

  return {
    mediaKey: signed.mediaKey,
    mime,
    bytes: uploadBody.bytes,
    readMs,
  };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return await apiCall<LoginResponse>('/api/guard/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Starts a media upload in the background and returns a Promise<mediaKey | null>.
// Call this early (during user interaction) and await the result just before the API call.
export function startGuardMediaUpload(
  context: MediaUploadContext,
  photoUri: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MEDIA_UPLOAD_TIMEOUT_MS);
  return uploadGuardMedia({ context, photoUri, mime: 'image/jpeg', signal: controller.signal })
    .then((r) => r.mediaKey)
    .catch(() => null)
    .finally(() => clearTimeout(timeoutId));
}

export async function guardEntryWithCode(params: {
  qrCode: string;
  mediaKey?: string;
}) {
  const payload: Record<string, unknown> = { qrCode: params.qrCode };
  if (params.mediaKey) payload.photoKey = params.mediaKey;
  return await apiCall('/api/guard/entry/code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function guardExitWithCode(params: {
  qrCode: string;
  mediaKey?: string;
}) {
  const payload: Record<string, unknown> = { qrCode: params.qrCode };
  if (params.mediaKey) payload.photoKey = params.mediaKey;
  return await apiCall('/api/guard/exit/code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface EventGuest {
  id: string;
  firstName: string;
  lastName: string;
  checkedInAt: string | null;
}

export interface EventGuestsResponse {
  success: boolean;
  event: {
    visitId: string;
    eventName: string;
    guestCount: number | null;
    entriesUsed: number;
    exitsUsed: number;
    eventStartAt: string | null;
    eventEndAt: string | null;
  };
  guests: EventGuest[];
}

// Fetch the named roster for an event pass (resolved via the scanned QR).
export async function getEventGuests(params: { qrCode: string }): Promise<EventGuestsResponse> {
  const qs = new URLSearchParams({ qrCode: params.qrCode });
  return await apiCall<EventGuestsResponse>(`/api/guard/event/guests?${qs.toString()}`, {
    method: 'GET',
  });
}

// Check in a single named guest of an event pass: claims a slot against the
// shared cap and attaches the guest's ID photo. Throws on EVENT_ENTRY_LIMIT_REACHED.
export async function eventGuestCheckin(params: {
  qrCode?: string;
  eventVisitId?: string;
  guestId: string;
  mediaKey?: string;
}) {
  const payload: Record<string, unknown> = { guestId: params.guestId };
  if (params.qrCode) payload.qrCode = params.qrCode;
  if (params.eventVisitId) payload.eventVisitId = params.eventVisitId;
  if (params.mediaKey) payload.photoKey = params.mediaKey;
  return await apiCall('/api/guard/event/checkin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSiteMap(options?: { force?: boolean }) {
  const now = Date.now();
  if (!options?.force && siteMapCache && now - siteMapCacheAt < SITE_MAP_CACHE_MS) {
    return siteMapCache;
  }

  console.log('🌐 getSiteMap: Starting API call...');
  try {
    const serverUrl = await getServerUrl();
    console.log('🌐 getSiteMap: Server URL:', serverUrl);

    const authToken = await getAuthToken();
    console.log('🌐 getSiteMap: Auth token exists:', !!authToken);

    const result = await apiCall('/api/guard/site-map', { method: 'GET' });
    siteMapCache = result;
    siteMapCacheAt = Date.now();
    console.log('🌐 getSiteMap: API call successful');
    return result;
  } catch (error) {
    console.log('❌ getSiteMap: API call failed:', error);
    throw error;
  }
}

export async function createApprovalRequest(params: {
  flow: 'ENTRY' | 'EXIT';
  visitorName: string;
  sectorId: string;
  photoUri: string;
  mediaKey?: string;
  eventVisitId?: string;
}) {
  let resolvedMediaKey = params.mediaKey;

  if (!resolvedMediaKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEDIA_UPLOAD_TIMEOUT_MS);
    try {
      const uploaded = await uploadGuardMedia({
        context: params.flow === 'ENTRY' ? 'APPROVAL_ENTRY' : 'APPROVAL_EXIT',
        photoUri: params.photoUri,
        mime: 'image/jpeg',
        signal: controller.signal,
      });
      resolvedMediaKey = uploaded.mediaKey;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (!resolvedMediaKey) {
    throw new Error('No se pudo subir la foto del visitante. Intente nuevamente.');
  }

  return await apiCall('/api/guard/approval/request', {
    method: 'POST',
    body: JSON.stringify({
      flow: params.flow,
      visitorName: params.visitorName,
      sectorId: params.sectorId,
      photoKey: resolvedMediaKey,
      ...(params.eventVisitId ? { eventVisitId: params.eventVisitId } : {}),
    }),
  });
}

export async function getApprovalStatus(requestId: string) {
  const qs = new URLSearchParams({ requestId });
  return await apiCall(`/api/guard/approval/status?${qs.toString()}`, { method: 'GET' });
}

export async function openControllerDoor() {
  const [ipRaw, doorRaw, usernameRaw, passwordRaw] = await Promise.all([
    getControllerIp(),
    getDoorNumber(),
    getControllerUsername(),
    getControllerPassword(),
  ]);

  const ip = String(ipRaw || '').trim();
  const door = String(doorRaw || '').trim();
  const username = String(usernameRaw || '').trim();
  const password = String(passwordRaw || '').trim();

  if (!ip || !door || !username || !password) {
    throw new Error('Controller configuration incomplete');
  }

  const url = `http://${ip}/cdor.cgi?open=1&door=${encodeURIComponent(door)}`;

  // Create base64 encoded credentials for Basic Authentication
  const credentials = `${username}:${password}`;
  const encodedCredentials = encodeBase64(credentials);

  // Debug logging
  console.log('=== Controller Debug ===');
  console.log('URL:', url);
  console.log('Credentials:', credentials);
  console.log('Encoded:', encodedCredentials);
  console.log('Auth Header:', `Basic ${encodedCredentials}`);

  // Try multiple approaches for controller authentication
  console.log('=== Trying Multiple Controller Auth Methods ===');

  // Method 1: Standard XMLHttpRequest with Basic Auth
  const tryXHR = () => {
    return new Promise((resolve, reject) => {
      console.log('Method 1: XMLHttpRequest with Basic Auth');

      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true;
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Basic ${encodedCredentials}`);
      xhr.setRequestHeader('Accept', 'text/plain');
      xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      xhr.onload = function () {
        console.log('XHR Status:', xhr.status);
        console.log('XHR Response:', xhr.responseText);
        console.log('XHR Headers:', xhr.getAllResponseHeaders());

        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`XHR failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = function () {
        console.log('XHR Network Error');
        reject(new Error('XHR network error'));
      };

      xhr.timeout = 10000;
      xhr.ontimeout = () => reject(new Error('XHR timeout'));

      try {
        xhr.send();
      } catch (error) {
        reject(error);
      }
    });
  };

  // Method 2: Try without withCredentials
  const tryXHRNoCreds = () => {
    return new Promise((resolve, reject) => {
      console.log('Method 2: XMLHttpRequest without withCredentials');

      const xhr = new XMLHttpRequest();
      // Don't set withCredentials
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Basic ${encodedCredentials}`);
      xhr.setRequestHeader('Accept', 'text/plain');
      xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      xhr.onload = function () {
        console.log('XHR NoCreds Status:', xhr.status);
        console.log('XHR NoCreds Response:', xhr.responseText);

        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`XHR NoCreds failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('XHR NoCreds network error'));
      xhr.timeout = 10000;
      xhr.ontimeout = () => reject(new Error('XHR NoCreds timeout'));

      try {
        xhr.send();
      } catch (error) {
        reject(error);
      }
    });
  };

  // Method 3: Try different credential encoding
  const tryDifferentEncoding = () => {
    return new Promise((resolve, reject) => {
      console.log('Method 3: Different encoding approach');

      // Try using btoa if available
      let altCredentials = encodedCredentials;
      try {
        if (typeof btoa !== 'undefined') {
          altCredentials = btoa(`${username}:${password}`);
          console.log('Using btoa encoding:', altCredentials);
        }
      } catch (e) {
        console.log('btoa not available, using custom encoding');
      }

      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true;
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Basic ${altCredentials}`);
      xhr.setRequestHeader('Accept', 'text/plain');
      xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      xhr.onload = function () {
        console.log('XHR Alt Status:', xhr.status);
        console.log('XHR Alt Response:', xhr.responseText);

        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`XHR Alt failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('XHR Alt network error'));
      xhr.timeout = 10000;
      xhr.ontimeout = () => reject(new Error('XHR Alt timeout'));

      try {
        xhr.send();
      } catch (error) {
        reject(error);
      }
    });
  };

  // Method 5: New fetch-based approach with base-64 library
  const tryFetchWithBase64 = async () => {
    console.log('Method 5: Fetch with base-64 library');

    try {
      // Try to use base-64 library if available
      let credentials = encodedCredentials;
      try {
        // In React Native, base-64 might be available
        const base64 = require('base-64');
        credentials = base64.encode(`${username}:${password}`);
        console.log('Using base-64 library encoding:', credentials);
      } catch (e) {
        console.log('base-64 library not available, using custom encoding');
        credentials = encodedCredentials;
      }

      console.log('=== Fetch Test ===');
      console.log('URL:', url);
      console.log('Auth Header:', `Basic ${credentials}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': '*/*',
          'User-Agent': 'TASKontrol-Guard/1.0',
        },
        // Important: Don't send cookies, handle auth manually
        credentials: 'omit',
      });

      console.log('Fetch Status:', response.status);
      console.log('Fetch OK:', response.ok);
      console.log('Fetch Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseText = await response.text();
        console.log('Fetch Response:', responseText);
        return responseText;
      } else {
        const errorText = await response.text();
        console.log('Fetch Error Response:', errorText);
        throw new Error(`Fetch failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('Fetch Error:', error);
      throw error;
    }
  };

  // Try each method in sequence
  try {
    return await tryXHR();
  } catch (error1) {
    console.log('Method 1 failed:', error1 instanceof Error ? error1.message : 'Unknown');

    try {
      return await tryXHRNoCreds();
    } catch (error2) {
      console.log('Method 2 failed:', error2 instanceof Error ? error2.message : 'Unknown');

      try {
        return await tryDifferentEncoding();
      } catch (error3) {
        console.log('Method 3 failed:', error3 instanceof Error ? error3.message : 'Unknown');

        try {
          return await tryFetchWithBase64();
        } catch (error4) {
          console.log('Method 5 failed:', error4 instanceof Error ? error4.message : 'Unknown');

          // Method 6: Axios with built-in auth handling
          try {
            console.log('Method 6: Axios with built-in auth');

            const response = await axios.get(url, {
              auth: {
                username: username,
                password: password
              },
              timeout: 5000,
              maxRedirects: 0,
              validateStatus: (status) => status < 500,
            });

            console.log('Axios Status:', response.status);
            console.log('Axios Headers:', response.headers);
            console.log('Axios Response:', response.data);

            if (response.status === 200) {
              return response.data || '';
            }

            throw new Error(`Axios failed: HTTP ${response.status}`);
          } catch (error5) {
            console.log('Method 6 failed:', error5 instanceof Error ? error5.message : 'Unknown');

            // Final attempt: URL parameters as last resort
            console.log('Method 4: URL parameters (last resort)');
            const urlWithParams = `${url}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            console.log('URL with params:', urlWithParams);

            const response = await fetch(urlWithParams, { method: 'GET' });
            console.log('URL Params Status:', response.status);
            console.log('URL Params Response:', await response.text());

            if (response.ok) {
              return await response.text();
            }

            throw new Error(`All controller auth methods failed. Last status: ${response.status}`);
          }
        }
      }
    }
  }
}

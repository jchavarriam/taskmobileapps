// mobile/lib/utils.ts

/**
 * Decode a base64 URL-safe encoded string
 */
export function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  // Decode base64
  return atob(base64);
}

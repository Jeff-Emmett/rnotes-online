const TOKEN_KEY = 'encryptid_token';

function getCookieToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)encryptid_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Authenticated fetch wrapper.
 * Reads JWT from localStorage (primary) or domain cookie (fallback).
 * On 401, redirects to signin page.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem(TOKEN_KEY) || getCookieToken())
    : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/auth/signin?returnUrl=${returnUrl}`;
  }

  return res;
}

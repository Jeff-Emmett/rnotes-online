const TOKEN_KEY = 'encryptid_token';

/**
 * Authenticated fetch wrapper.
 * Reads JWT from localStorage and adds Authorization header.
 * On 401, redirects to signin page.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

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

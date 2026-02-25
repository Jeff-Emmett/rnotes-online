'use client';

import { useEffect } from 'react';

const TOKEN_KEY = 'encryptid_token';
const USER_KEY = 'encryptid_user';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Cross-subdomain session sync.
 *
 * The EncryptID SDK stores tokens in localStorage (per-origin) and sets
 * a cookie without a domain attribute (per-hostname). This means
 * jeff.rnotes.online can't access rnotes.online's session.
 *
 * This component bridges that gap by:
 * 1. Mirroring localStorage token to a cookie scoped to .rnotes.online
 * 2. On subdomain load, restoring from the domain-wide cookie to localStorage
 */
function isRnotesDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.rnotes.online') ||
         window.location.hostname === 'rnotes.online';
}

function getCookieDomain(): string {
  return '.rnotes.online';
}

function getDomainCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setDomainCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;domain=${getCookieDomain()};max-age=${COOKIE_MAX_AGE};SameSite=Lax;Secure`;
}

function clearDomainCookie(name: string): void {
  document.cookie = `${name}=;path=/;domain=${getCookieDomain()};max-age=0;SameSite=Lax;Secure`;
}

export function SubdomainSession() {
  useEffect(() => {
    if (!isRnotesDomain()) return;

    // On mount: sync localStorage <-> domain cookie
    const localToken = localStorage.getItem(TOKEN_KEY);
    const cookieToken = getDomainCookie(TOKEN_KEY);

    if (localToken && !cookieToken) {
      // Have localStorage token but no domain cookie — set it
      setDomainCookie(TOKEN_KEY, localToken);
    } else if (!localToken && cookieToken) {
      // On a subdomain with no localStorage but domain cookie exists — restore
      localStorage.setItem(TOKEN_KEY, cookieToken);
      // Also restore user info from cookie if available
      const cookieUser = getDomainCookie(USER_KEY);
      if (cookieUser) {
        localStorage.setItem(USER_KEY, cookieUser);
      }
      // Reload to let EncryptIDProvider pick up the restored token
      window.location.reload();
      return;
    } else if (localToken && cookieToken && localToken !== cookieToken) {
      // Both exist but differ — localStorage wins (it's more recent)
      setDomainCookie(TOKEN_KEY, localToken);
    }

    // Watch for localStorage changes (from EncryptID SDK login/logout)
    function handleStorage(e: StorageEvent) {
      if (e.key === TOKEN_KEY) {
        if (e.newValue) {
          setDomainCookie(TOKEN_KEY, e.newValue);
        } else {
          clearDomainCookie(TOKEN_KEY);
          clearDomainCookie(USER_KEY);
        }
      }
      if (e.key === USER_KEY && e.newValue) {
        setDomainCookie(USER_KEY, e.newValue);
      }
    }

    window.addEventListener('storage', handleStorage);

    // Also sync user data to domain cookie
    const localUser = localStorage.getItem(USER_KEY);
    if (localUser) {
      setDomainCookie(USER_KEY, localUser);
    }

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return null; // render nothing
}

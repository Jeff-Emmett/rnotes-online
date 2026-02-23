'use client';

import { useSyncExternalStore } from 'react';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribe(callback: () => void) {
  // Re-check on visibility change (covers navigation)
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

function getSnapshot(): string | null {
  return getCookie('rnotes-space');
}

function getServerSnapshot(): string | null {
  return null;
}

export function useSpaceContext(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getSpaceFromHeaders(headers: Headers): string | null {
  const host = headers.get('host') || '';
  const match = host.match(/^([a-z0-9-]+)\.rnotes\.online$/);
  if (match && !['www', 'opennotebook', 'api'].includes(match[1])) {
    return match[1];
  }
  return null;
}

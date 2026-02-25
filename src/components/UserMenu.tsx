'use client';

import { useState, useEffect } from 'react';

interface UserInfo {
  username?: string;
  did?: string;
}

export function UserMenu() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-6 h-6 rounded-full bg-slate-700 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <a
        href="https://auth.ridentity.online"
        className="px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors no-underline"
      >
        Sign In
      </a>
    );
  }

  const displayName = user.username || (user.did ? `${user.did.slice(0, 12)}...` : 'User');

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
          {(user.username || 'U')[0].toUpperCase()}
        </div>
        <span className="text-sm text-slate-300 hidden sm:inline">{displayName}</span>
      </div>
      <button
        onClick={() => {
          fetch('/api/auth/logout', { method: 'POST' })
            .catch(() => {})
            .finally(() => window.location.reload());
        }}
        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';

interface UserInfo {
  username?: string;
  did?: string;
}

export function UserMenu() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
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
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {(user.username || 'U')[0].toUpperCase()}
        </div>
        <span className="text-sm text-slate-300 hidden sm:inline">{displayName}</span>
        <span className="text-[0.7em] text-slate-500 hidden sm:inline">&#9662;</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 min-w-[180px] rounded-xl bg-slate-800 border border-white/10 shadow-xl shadow-black/30 z-[200]">
          <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
            <div className="text-sm font-medium text-white">{displayName}</div>
            {user.did && (
              <div className="text-[11px] text-slate-500 truncate mt-0.5">{user.did}</div>
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              fetch('/api/auth/logout', { method: 'POST' })
                .catch(() => {})
                .finally(() => window.location.reload());
            }}
            className="w-full text-left px-3.5 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

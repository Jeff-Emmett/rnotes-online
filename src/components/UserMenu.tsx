'use client';

import { useEncryptID } from '@encryptid/sdk/ui/react';
import Link from 'next/link';

export function UserMenu() {
  const { isAuthenticated, username, did, loading, logout } = useEncryptID();

  if (loading) {
    return (
      <div className="w-6 h-6 rounded-full bg-slate-700 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/signin"
        className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
      >
        Sign In
      </Link>
    );
  }

  const displayName = username || (did ? `${did.slice(0, 12)}...` : 'User');

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-black">
          {(username || 'U')[0].toUpperCase()}
        </div>
        <span className="text-sm text-slate-300 hidden sm:inline">{displayName}</span>
      </div>
      <button
        onClick={logout}
        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

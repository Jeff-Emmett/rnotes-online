'use client';

import { useState, useRef, useEffect } from 'react';
import { useEncryptID } from '@encryptid/sdk/ui/react';

interface SpaceInfo {
  slug: string;
  name: string;
  icon?: string;
  role?: string;
}

interface SpaceSwitcherProps {
  current?: string;
  name?: string;
}

export function SpaceSwitcher({ current = 'personal', name }: SpaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useEncryptID();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadSpaces = async () => {
    if (loaded) return;
    try {
      const res = await fetch('/api/spaces');
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
      }
    } catch {
      // API not available — show empty
    }
    setLoaded(true);
  };

  const handleOpen = async () => {
    const nowOpen = !open;
    setOpen(nowOpen);
    if (nowOpen && !loaded) {
      await loadSpaces();
    }
  };

  const displayName = name || current;

  const mySpaces = spaces.filter((s) => s.role);
  const publicSpaces = spaces.filter((s) => !s.role);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/[0.05] transition-colors"
      >
        <span className="opacity-40 font-light mr-0.5">/</span>
        <span className="max-w-[160px] truncate">{displayName}</span>
        <span className="text-[0.7em] opacity-50">&#9662;</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[240px] max-h-[400px] overflow-y-auto rounded-xl bg-slate-800 border border-white/10 shadow-xl shadow-black/30 z-[200]">
          {!loaded ? (
            <div className="px-4 py-4 text-center text-sm text-slate-400">Loading spaces...</div>
          ) : spaces.length === 0 ? (
            <>
              <div className="px-4 py-4 text-center text-sm text-slate-400">
                {isAuthenticated ? 'No spaces yet' : 'Sign in to see your spaces'}
              </div>
              <a
                href="https://rspace.online/new"
                className="flex items-center px-3.5 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/[0.08] transition-colors no-underline"
                onClick={() => setOpen(false)}
              >
                + Create new space
              </a>
            </>
          ) : (
            <>
              {mySpaces.length > 0 && (
                <>
                  <div className="px-3.5 pt-2.5 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 select-none">
                    Your spaces
                  </div>
                  {mySpaces.map((s) => (
                    <a
                      key={s.slug}
                      href={`https://rspace.online/${s.slug}/notes`}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-slate-200 no-underline transition-colors ${
                        s.slug === current ? 'bg-cyan-500/10' : 'hover:bg-white/[0.05]'
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="text-base">{s.icon || '🌐'}</span>
                      <span className="text-sm font-medium flex-1">{s.name}</span>
                      {s.role && (
                        <span className="text-[0.6rem] font-bold uppercase bg-cyan-500/15 text-cyan-300 px-1.5 py-0.5 rounded tracking-wide">
                          {s.role}
                        </span>
                      )}
                    </a>
                  ))}
                </>
              )}

              {publicSpaces.length > 0 && (
                <>
                  {mySpaces.length > 0 && <div className="h-px bg-white/[0.08] my-1" />}
                  <div className="px-3.5 pt-2.5 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 select-none">
                    Public spaces
                  </div>
                  {publicSpaces.map((s) => (
                    <a
                      key={s.slug}
                      href={`https://rspace.online/${s.slug}/notes`}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-slate-200 no-underline transition-colors ${
                        s.slug === current ? 'bg-cyan-500/10' : 'hover:bg-white/[0.05]'
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="text-base">{s.icon || '🌐'}</span>
                      <span className="text-sm font-medium flex-1">{s.name}</span>
                    </a>
                  ))}
                </>
              )}

              <div className="h-px bg-white/[0.08] my-1" />
              <a
                href="https://rspace.online/new"
                className="flex items-center px-3.5 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/[0.08] transition-colors no-underline"
                onClick={() => setOpen(false)}
              >
                + Create new space
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

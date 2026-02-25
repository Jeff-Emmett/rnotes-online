'use client';

import { useState, useRef, useEffect } from 'react';

export interface AppModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  domain?: string;
}

const MODULES: AppModule[] = [
  // Creating
  { id: 'canvas', name: 'Canvas', icon: '🎨', description: 'Collaborative workspace', domain: 'rspace.online' },
  { id: 'notes', name: 'Notes', icon: '📝', description: 'Rich note-taking', domain: 'rnotes.online' },
  { id: 'pubs', name: 'Pubs', icon: '📰', description: 'Publishing platform', domain: 'rpubs.online' },
  // Planning
  { id: 'cal', name: 'Calendar', icon: '📅', description: 'Scheduling & events', domain: 'rcal.online' },
  { id: 'trips', name: 'Trips', icon: '✈️', description: 'Travel planning', domain: 'rtrips.online' },
  { id: 'stack', name: 'Stack', icon: '📋', description: 'Task management', domain: 'rstack.online' },
  // Discussing & Deciding
  { id: 'inbox', name: 'Inbox', icon: '📬', description: 'Messaging & email', domain: 'rinbox.online' },
  { id: 'choices', name: 'Choices', icon: '🔀', description: 'Decision making', domain: 'rchoices.online' },
  { id: 'vote', name: 'Vote', icon: '🗳️', description: 'Polls & voting', domain: 'rvote.online' },
  // Funding & Commerce
  { id: 'funds', name: 'Funds', icon: '💰', description: 'Fundraising', domain: 'rfunds.online' },
  { id: 'wallet', name: 'Wallet', icon: '👛', description: 'Crypto wallet', domain: 'rwallet.online' },
  { id: 'cart', name: 'Cart', icon: '🛒', description: 'Shopping & commerce', domain: 'rcart.online' },
  { id: 'auctions', name: 'Auctions', icon: '🔨', description: 'Auction platform', domain: 'rauctions.online' },
  // Sharing & Media
  { id: 'files', name: 'Files', icon: '📁', description: 'File storage', domain: 'rfiles.online' },
  { id: 'tube', name: 'Tube', icon: '🎬', description: 'Video platform', domain: 'rtube.online' },
  { id: 'data', name: 'Data', icon: '📊', description: 'Analytics', domain: 'rdata.online' },
  { id: 'maps', name: 'Maps', icon: '🗺️', description: 'Mapping tool', domain: 'rmaps.online' },
  { id: 'network', name: 'Network', icon: '🌐', description: 'Social network', domain: 'rnetwork.online' },
];

const MODULE_CATEGORIES: Record<string, string> = {
  canvas: 'Creating',
  notes: 'Creating',
  pubs: 'Creating',
  cal: 'Planning',
  trips: 'Planning',
  stack: 'Planning',
  inbox: 'Discussing & Deciding',
  choices: 'Discussing & Deciding',
  vote: 'Discussing & Deciding',
  funds: 'Funding & Commerce',
  wallet: 'Funding & Commerce',
  cart: 'Funding & Commerce',
  auctions: 'Funding & Commerce',
  files: 'Sharing & Media',
  tube: 'Sharing & Media',
  data: 'Sharing & Media',
  maps: 'Sharing & Media',
  network: 'Sharing & Media',
};

const CATEGORY_ORDER = [
  'Creating',
  'Planning',
  'Discussing & Deciding',
  'Funding & Commerce',
  'Sharing & Media',
];

interface AppSwitcherProps {
  current?: string;
}

export function AppSwitcher({ current = 'notes' }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const currentMod = MODULES.find((m) => m.id === current);
  const label = currentMod ? `${currentMod.icon} ${currentMod.name}` : '📝 rNotes';

  // Group modules by category
  const groups = new Map<string, AppModule[]>();
  for (const m of MODULES) {
    const cat = MODULE_CATEGORIES[m.id] || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(m);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 transition-colors"
      >
        {label}
        <span className="text-[0.7em] opacity-60">&#9662;</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[260px] max-h-[70vh] overflow-y-auto rounded-xl bg-slate-800 border border-white/10 shadow-xl shadow-black/30 z-[200]">
          {CATEGORY_ORDER.map((cat) => {
            const items = groups.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="px-3.5 pt-2.5 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 select-none border-t border-white/[0.06] first:border-t-0">
                  {cat}
                </div>
                {items.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center group ${
                      m.id === current ? 'bg-cyan-500/10' : 'hover:bg-white/[0.05]'
                    } transition-colors`}
                  >
                    <a
                      href={m.domain ? `https://${m.domain}` : '#'}
                      className="flex items-center gap-3 flex-1 px-3.5 py-2.5 text-slate-200 no-underline"
                      onClick={() => setOpen(false)}
                    >
                      <span className="text-lg w-7 text-center flex-shrink-0">{m.icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold">{m.name}</span>
                        <span className="text-xs text-slate-400 truncate">{m.description}</span>
                      </div>
                    </a>
                    {m.domain && (
                      <a
                        href={`https://${m.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 flex items-center justify-center text-xs text-cyan-400 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity flex-shrink-0"
                        title={m.domain}
                        onClick={(e) => e.stopPropagation()}
                      >
                        &#8599;
                      </a>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

export interface AppModule {
  id: string;
  name: string;
  badge: string;       // favicon-style abbreviation: rS, rN, rP, etc.
  color: string;       // Tailwind bg class for the pastel badge
  emoji: string;       // function emoji shown right of title
  description: string;
  domain?: string;
}

const MODULES: AppModule[] = [
  // Creating
  { id: 'space',    name: 'rSpace',    badge: 'rS',  color: 'bg-teal-300',    emoji: '🎨', description: 'Real-time collaborative canvas',               domain: 'rspace.online' },
  { id: 'notes',    name: 'rNotes',    badge: 'rN',  color: 'bg-amber-300',   emoji: '📝', description: 'Group note-taking & knowledge capture',        domain: 'rnotes.online' },
  { id: 'pubs',     name: 'rPubs',     badge: 'rP',  color: 'bg-rose-300',    emoji: '📰', description: 'Community-run publishing platform',             domain: 'rpubs.online' },
  // Planning
  { id: 'cal',      name: 'rCal',      badge: 'rC',  color: 'bg-sky-300',     emoji: '📅', description: 'Collaborative scheduling & events',             domain: 'rcal.online' },
  { id: 'trips',    name: 'rTrips',    badge: 'rT',  color: 'bg-emerald-300', emoji: '✈️', description: 'Group travel planning in real time',            domain: 'rtrips.online' },
  // Discussing & Deciding
  { id: 'inbox',    name: 'rInbox',    badge: 'rI',  color: 'bg-indigo-300',  emoji: '📬', description: 'Self-hosted group messaging',                   domain: 'rinbox.online' },
  { id: 'choices',  name: 'rChoices',  badge: 'rCh', color: 'bg-fuchsia-300', emoji: '🔀', description: 'Collaborative decision making',                 domain: 'rchoices.online' },
  { id: 'vote',     name: 'rVote',     badge: 'rV',  color: 'bg-violet-300',  emoji: '🗳️', description: 'Real-time polls & community governance',        domain: 'rvote.online' },
  // Funding & Commerce
  { id: 'funds',    name: 'rFunds',    badge: 'rF',  color: 'bg-lime-300',    emoji: '💰', description: 'Community-run fundraising & grants',            domain: 'rfunds.online' },
  { id: 'wallet',   name: 'rWallet',   badge: 'rW',  color: 'bg-yellow-300',  emoji: '👛', description: 'Self-hosted crypto wallet',                     domain: 'rwallet.online' },
  { id: 'cart',     name: 'rCart',      badge: 'rCt', color: 'bg-orange-300',  emoji: '🛒', description: 'Group commerce & shared shopping',              domain: 'rcart.online' },
  { id: 'auctions', name: 'rAuctions', badge: 'rA',  color: 'bg-red-300',     emoji: '🔨', description: 'Community auction platform',                    domain: 'rauctions.online' },
  // Sharing & Media
  { id: 'files',    name: 'rFiles',    badge: 'rFi', color: 'bg-cyan-300',    emoji: '📁', description: 'Self-hosted collaborative file storage',        domain: 'rfiles.online' },
  { id: 'tube',     name: 'rTube',     badge: 'rTu', color: 'bg-pink-300',    emoji: '🎬', description: 'Community-run video platform',                  domain: 'rtube.online' },
  { id: 'data',     name: 'rData',     badge: 'rD',  color: 'bg-purple-300',  emoji: '📊', description: 'Self-hosted analytics & insights',              domain: 'rdata.online' },
  { id: 'maps',     name: 'rMaps',     badge: 'rM',  color: 'bg-green-300',   emoji: '🗺️', description: 'Collaborative real-time mapping',               domain: 'rmaps.online' },
  { id: 'network',  name: 'rNetwork',  badge: 'rNe', color: 'bg-blue-300',    emoji: '🌐', description: 'Self-hosted community network',                 domain: 'rnetwork.online' },
];

const MODULE_CATEGORIES: Record<string, string> = {
  space:   'Creating',
  notes:   'Creating',
  pubs:    'Creating',
  cal:     'Planning',
  trips:   'Planning',
  inbox:   'Discussing & Deciding',
  choices: 'Discussing & Deciding',
  vote:    'Discussing & Deciding',
  funds:   'Funding & Commerce',
  wallet:  'Funding & Commerce',
  cart:    'Funding & Commerce',
  auctions:'Funding & Commerce',
  files:   'Sharing & Media',
  tube:    'Sharing & Media',
  data:    'Sharing & Media',
  maps:    'Sharing & Media',
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

  // Group modules by category
  const groups = new Map<string, AppModule[]>();
  for (const m of MODULES) {
    const cat = MODULE_CATEGORIES[m.id] || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(m);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 transition-colors"
      >
        {currentMod && (
          <span className={`w-6 h-6 rounded-md ${currentMod.color} flex items-center justify-center text-[10px] font-black text-slate-900 leading-none flex-shrink-0`}>
            {currentMod.badge}
          </span>
        )}
        <span>{currentMod?.name || 'rStack'}</span>
        <span className="text-[0.7em] opacity-60">&#9662;</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[300px] max-h-[70vh] overflow-y-auto rounded-xl bg-slate-800 border border-white/10 shadow-xl shadow-black/30 z-[200]">
          {/* rStack header */}
          <div className="px-3.5 py-3 border-b border-white/[0.08] flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-300 via-violet-300 to-rose-300 flex items-center justify-center text-[11px] font-black text-slate-900 leading-none">
              r*
            </span>
            <div>
              <div className="text-sm font-bold text-white">rStack</div>
              <div className="text-[10px] text-slate-400">Self-hosted community app suite</div>
            </div>
          </div>

          {/* Categories */}
          {CATEGORY_ORDER.map((cat) => {
            const items = groups.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="px-3.5 pt-3 pb-1 text-[0.6rem] font-bold uppercase tracking-widest text-slate-500 select-none">
                  {cat}
                </div>
                {items.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center group ${
                      m.id === current ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                    } transition-colors`}
                  >
                    <a
                      href={m.domain ? `https://${m.domain}` : '#'}
                      className="flex items-center gap-2.5 flex-1 px-3.5 py-2 text-slate-200 no-underline min-w-0"
                      onClick={() => setOpen(false)}
                    >
                      {/* Pastel favicon badge */}
                      <span className={`w-7 h-7 rounded-md ${m.color} flex items-center justify-center text-[10px] font-black text-slate-900 leading-none flex-shrink-0`}>
                        {m.badge}
                      </span>
                      {/* Name + description */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold">{m.name}</span>
                          <span className="text-sm flex-shrink-0">{m.emoji}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate">{m.description}</span>
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

          {/* Footer */}
          <div className="px-3.5 py-2.5 border-t border-white/[0.08] text-center">
            <a
              href="https://rstack.online"
              className="text-[11px] text-slate-500 hover:text-cyan-400 transition-colors no-underline"
              onClick={() => setOpen(false)}
            >
              rstack.online — self-hosted, community-run
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

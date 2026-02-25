'use client';

const FOOTER_LINKS = [
  // Creating
  { name: 'rSpace', href: 'https://rspace.online' },
  { name: 'rNotes', href: 'https://rnotes.online' },
  { name: 'rPubs', href: 'https://rpubs.online' },
  { name: 'rTube', href: 'https://rtube.online' },
  { name: 'rSwag', href: 'https://rswag.online' },
  // Planning
  { name: 'rCal', href: 'https://rcal.online' },
  { name: 'rTrips', href: 'https://rtrips.online' },
  { name: 'rMaps', href: 'https://rmaps.online' },
  // Communicating
  { name: 'rChats', href: 'https://rchats.online' },
  { name: 'rInbox', href: 'https://rinbox.online' },
  { name: 'rMail', href: 'https://rmail.online' },
  { name: 'rForum', href: 'https://rforum.online' },
  // Deciding
  { name: 'rChoices', href: 'https://rchoices.online' },
  { name: 'rVote', href: 'https://rvote.online' },
  // Funding & Commerce
  { name: 'rFunds', href: 'https://rfunds.online' },
  { name: 'rWallet', href: 'https://rwallet.online' },
  { name: 'rCart', href: 'https://rcart.online' },
  { name: 'rAuctions', href: 'https://rauctions.online' },
  // Sharing
  { name: 'rPhotos', href: 'https://rphotos.online' },
  { name: 'rNetwork', href: 'https://rnetwork.online' },
  { name: 'rFiles', href: 'https://rfiles.online' },
  { name: 'rSocials', href: 'https://rsocials.online' },
  // Observing
  { name: 'rData', href: 'https://rdata.online' },
  // Work & Productivity
  { name: 'rWork', href: 'https://rwork.online' },
  // Identity & Infrastructure
  { name: 'rIDs', href: 'https://ridentity.online' },
  { name: 'rStack', href: 'https://rstack.online' },
];

interface EcosystemFooterProps {
  current?: string;
}

export function EcosystemFooter({ current }: EcosystemFooterProps) {
  return (
    <footer className="border-t border-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500 mb-4">
          <span className="font-medium text-slate-400">r* Ecosystem</span>
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`hover:text-slate-300 transition-colors ${
                current && link.name.toLowerCase() === current.toLowerCase()
                  ? 'font-medium text-slate-300'
                  : ''
              }`}
            >
              {link.name}
            </a>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600">
          Part of the <a href="https://rstack.online" className="hover:text-slate-400 transition-colors">r* ecosystem</a> — open source, self-hosted, community-owned
        </p>
      </div>
    </footer>
  );
}

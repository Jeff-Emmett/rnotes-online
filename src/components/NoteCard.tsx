'use client';

import Link from 'next/link';
import { TagBadge } from './TagBadge';

const TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-amber-500/20 text-amber-400',
  CLIP: 'bg-purple-500/20 text-purple-400',
  BOOKMARK: 'bg-blue-500/20 text-blue-400',
  CODE: 'bg-green-500/20 text-green-400',
  IMAGE: 'bg-pink-500/20 text-pink-400',
  FILE: 'bg-slate-500/20 text-slate-400',
  AUDIO: 'bg-red-500/20 text-red-400',
};

const CARD_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  note: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/20' },
  link: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/20' },
  file: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/20' },
  task: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/20' },
  person: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/20' },
  idea: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  reference: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/20' },
};

interface NoteCardProps {
  id: string;
  title: string;
  type: string;
  cardType?: string;
  contentPlain?: string | null;
  summary?: string | null;
  isPinned: boolean;
  updatedAt: string;
  tags: { id: string; name: string; color: string | null }[];
  url?: string | null;
  archiveUrl?: string | null;
  visibility?: string;
  children?: { id: string }[];
  properties?: Record<string, unknown>;
}

export function NoteCard({
  id, title, type, cardType = 'note', contentPlain, summary,
  isPinned, updatedAt, tags, url, archiveUrl, visibility, children, properties,
}: NoteCardProps) {
  const snippet = summary || (contentPlain || '').slice(0, 120);
  const cardStyle = CARD_TYPE_STYLES[cardType] || CARD_TYPE_STYLES.note;
  const childCount = children?.length || 0;
  const propertyEntries = properties ? Object.entries(properties).filter(([, v]) => v != null && v !== '') : [];

  return (
    <Link
      href={`/notes/${id}`}
      className={`block group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg p-4 transition-all`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${TYPE_COLORS[type] || TYPE_COLORS.NOTE}`}>
          {type}
        </span>
        {cardType !== 'note' && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cardStyle.bg} ${cardStyle.text}`}>
            {cardType}
          </span>
        )}
        {isPinned && (
          <span className="text-amber-400 text-xs" title="Pinned to canvas">
            &#9733;
          </span>
        )}
        {childCount > 0 && (
          <span className="text-[10px] text-slate-500" title={`${childCount} child note${childCount > 1 ? 's' : ''}`}>
            &#9661; {childCount}
          </span>
        )}
        {visibility && visibility !== 'private' && (
          <span className="text-[10px] text-slate-500 px-1 py-0.5 rounded bg-slate-700/30">
            {visibility}
          </span>
        )}
        {archiveUrl && (
          <span className="text-emerald-400 text-[10px] font-bold uppercase px-1 py-0.5 rounded bg-emerald-500/10" title="Unlocked article">
            unlocked
          </span>
        )}
        <span className="text-[10px] text-slate-500 ml-auto">
          {new Date(updatedAt).toLocaleDateString()}
        </span>
      </div>

      <h4 className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-1 mb-1">
        {title}
      </h4>

      {url && (
        <p className="text-xs text-slate-500 truncate mb-1">{url}</p>
      )}

      {snippet && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-2">{snippet}</p>
      )}

      {/* Property badges */}
      {propertyEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {propertyEntries.slice(0, 3).map(([key, value]) => (
            <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-500">
              {key}: {String(value)}
            </span>
          ))}
          {propertyEntries.length > 3 && (
            <span className="text-[9px] text-slate-500">+{propertyEntries.length - 3}</span>
          )}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} />
          ))}
          {tags.length > 4 && (
            <span className="text-[10px] text-slate-500">+{tags.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  );
}

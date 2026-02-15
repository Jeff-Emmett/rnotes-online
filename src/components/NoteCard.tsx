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

interface NoteCardProps {
  id: string;
  title: string;
  type: string;
  contentPlain?: string | null;
  isPinned: boolean;
  updatedAt: string;
  tags: { id: string; name: string; color: string | null }[];
  url?: string | null;
}

export function NoteCard({ id, title, type, contentPlain, isPinned, updatedAt, tags, url }: NoteCardProps) {
  const snippet = (contentPlain || '').slice(0, 120);

  return (
    <Link
      href={`/notes/${id}`}
      className="block group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg p-4 transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${TYPE_COLORS[type] || TYPE_COLORS.NOTE}`}>
          {type}
        </span>
        {isPinned && (
          <span className="text-amber-400 text-xs" title="Pinned to canvas">
            &#9733;
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

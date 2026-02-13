'use client';

import Link from 'next/link';

interface NotebookCardProps {
  id: string;
  title: string;
  description?: string | null;
  coverColor: string;
  noteCount: number;
  updatedAt: string;
}

export function NotebookCard({ id, title, description, coverColor, noteCount, updatedAt }: NotebookCardProps) {
  return (
    <Link
      href={`/notebooks/${id}`}
      className="block group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl p-5 transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: coverColor }}
        />
        <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
          {title}
        </h3>
      </div>

      {description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
        <span>{new Date(updatedAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

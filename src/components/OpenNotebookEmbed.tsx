'use client';

import { useState } from 'react';

interface OpenNotebookEmbedProps {
  className?: string;
}

export function OpenNotebookEmbed({ className = '' }: OpenNotebookEmbedProps) {
  const notebookUrl = 'https://opennotebook.rnotes.online';
  const [loading, setLoading] = useState(true);

  return (
    <div className={`relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-amber-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-slate-400">Loading Notebook...</span>
          </div>
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <a
          href={notebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-xs text-slate-300 backdrop-blur-sm transition-colors"
        >
          Open Full View
        </a>
      </div>
      <iframe
        src={notebookUrl}
        className="w-full h-full border-0"
        allow="clipboard-write; clipboard-read"
        title="OpenNotebook"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}

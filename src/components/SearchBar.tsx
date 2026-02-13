'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchResult } from '@/lib/types';

interface SearchBarProps {
  onResults?: (results: SearchResult[]) => void;
}

export function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      onResults?.([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/notes/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      onResults?.(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [onResults]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search notes..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        {loading && (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
      </div>

      {open && query && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <a
              key={result.id}
              href={`/notes/${result.id}`}
              className="block px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
              onClick={() => setOpen(false)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase text-amber-400">{result.type}</span>
                <span className="text-sm font-medium text-white truncate">{result.title}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">{result.snippet}</p>
              {result.notebookTitle && (
                <p className="text-[10px] text-slate-500 mt-1">in {result.notebookTitle}</p>
              )}
            </a>
          ))}
        </div>
      )}

      {open && query && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4 text-center text-sm text-slate-400">
          No results found
        </div>
      )}
    </div>
  );
}

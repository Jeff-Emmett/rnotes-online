'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NotebookCard } from '@/components/NotebookCard';
import { SearchBar } from '@/components/SearchBar';

interface NotebookData {
  id: string;
  title: string;
  description: string | null;
  coverColor: string;
  updatedAt: string;
  _count: { notes: number };
}

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notebooks')
      .then((res) => res.json())
      .then(setNotebooks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
                rN
              </div>
              <span className="text-lg font-semibold text-white">rNotes</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Notebooks</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <SearchBar />
            </div>
            <Link
              href="/notebooks/new"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-lg transition-colors"
            >
              New Notebook
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-amber-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : notebooks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-4">No notebooks yet. Create your first one!</p>
            <Link
              href="/notebooks/new"
              className="inline-flex px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
            >
              Create Notebook
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {notebooks.map((nb) => (
              <NotebookCard
                key={nb.id}
                id={nb.id}
                title={nb.title}
                description={nb.description}
                coverColor={nb.coverColor}
                noteCount={nb._count.notes}
                updatedAt={nb.updatedAt}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

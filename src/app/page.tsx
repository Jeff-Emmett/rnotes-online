'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NotebookCard } from '@/components/NotebookCard';
import { SearchBar } from '@/components/SearchBar';
import { UserMenu } from '@/components/UserMenu';

interface NotebookData {
  id: string;
  title: string;
  description: string | null;
  coverColor: string;
  updatedAt: string;
  _count: { notes: number };
}

export default function HomePage() {
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
      {/* Nav */}
      <nav className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
              rN
            </div>
            <span className="text-lg font-semibold text-white">rNotes</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block w-64">
              <SearchBar />
            </div>
            <Link
              href="/notebooks"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              Notebooks
            </Link>
            <Link
              href="/notes/new"
              className="px-3 md:px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">New Note</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Mobile search */}
      <div className="md:hidden px-4 py-3 border-b border-slate-800">
        <SearchBar />
      </div>

      {/* Hero */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Capture Everything
            </span>
            <br />
            <span className="text-white">Find Anything</span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 mb-6 md:mb-8 max-w-2xl mx-auto">
            Notes, clips, bookmarks, code, images, and files — all in one place.
            Organize in notebooks, tag freely, and collaborate on a visual canvas shared across r*Spaces.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/notebooks/new"
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-center"
            >
              Create Notebook
            </Link>
            <Link
              href="/notes/new"
              className="w-full sm:w-auto px-6 py-3 border border-slate-700 hover:border-slate-600 text-white rounded-lg transition-colors text-center"
            >
              Quick Note
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16 px-4 md:px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 md:mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Capture</h3>
              <p className="text-sm text-slate-400">Notes, web clips, bookmarks, code snippets, images, and files. Every type of content, one tool.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Organize</h3>
              <p className="text-sm text-slate-400">Notebooks for structure, tags for cross-cutting themes. Full-text search finds anything instantly.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Collaborate</h3>
              <p className="text-sm text-slate-400">Pin notes to a visual canvas. Share notebooks across r*Spaces for real-time collaboration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent notebooks */}
      {!loading && notebooks.length > 0 && (
        <section className="py-12 md:py-16 px-4 md:px-6 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-white">Recent Notebooks</h2>
              <Link href="/notebooks" className="text-sm text-amber-400 hover:text-amber-300">
                View all
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {notebooks.slice(0, 6).map((nb) => (
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
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <span>rNotes.online — Part of the r* ecosystem</span>
          <a href="https://rspace.online" className="hover:text-amber-400 transition-colors">
            rSpace.online
          </a>
        </div>
      </footer>
    </div>
  );
}

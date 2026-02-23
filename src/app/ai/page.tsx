'use client';

import Link from 'next/link';
import { OpenNotebookEmbed } from '@/components/OpenNotebookEmbed';
import { UserMenu } from '@/components/UserMenu';
import { SearchBar } from '@/components/SearchBar';

export default function AIPage() {
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <nav className="border-b border-slate-800 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
                rN
              </div>
            </Link>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-white font-semibold">AI Notebook</span>
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
              href="/demo"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              Demo
            </Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="flex-1 min-h-0">
        <OpenNotebookEmbed className="h-full rounded-none border-0" />
      </main>
    </div>
  );
}

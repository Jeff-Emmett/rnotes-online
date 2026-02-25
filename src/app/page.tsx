'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NotebookCard } from '@/components/NotebookCard';
import { SearchBar } from '@/components/SearchBar';
import { Header } from '@/components/Header';
import { TranscriptionDemo } from '@/components/TranscriptionDemo';

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
      <Header
        actions={
          <>
            <div className="hidden md:block w-64">
              <SearchBar />
            </div>
            <Link
              href="/demo"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              Demo
            </Link>
            <Link
              href="/notebooks/new"
              className="px-3 md:px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Create Notebook</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </Link>
          </>
        }
      />

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
            Notes, clips, voice recordings, and live transcription — all in one place.
            Speak and watch your words appear in real time, or drop in audio and video files to transcribe offline.
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

      {/* Try it — live transcription */}
      <section className="py-12 md:py-16 px-4 md:px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-3">Try Live Transcription</h2>
          <p className="text-sm text-slate-400 text-center mb-8 max-w-lg mx-auto">
            Hit the mic and start talking. Your speech is transcribed live in the browser — no account needed.
          </p>
          <TranscriptionDemo />
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16 px-4 md:px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 md:mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Live Transcribe</h3>
              <p className="text-sm text-slate-400">Speak and watch your words appear in real time. WebSocket streaming with live timestamps.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2a2 2 0 00-2 2v1a2 2 0 002 2h0a2 2 0 002-2V6a2 2 0 00-2-2zm0 8v2m0-2a2 2 0 01-2-2V9a2 2 0 012-2h0a2 2 0 012 2v1a2 2 0 01-2 2zm8-8V2m0 2a2 2 0 00-2 2v1a2 2 0 002 2h0a2 2 0 002-2V6a2 2 0 00-2-2zm0 8v2m0-2a2 2 0 01-2-2V9a2 2 0 012-2h0a2 2 0 012 2v1a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Audio & Video</h3>
              <p className="text-sm text-slate-400">Drop in audio or video files and get a full transcript. Powered by NVIDIA Parakeet — runs entirely in your browser.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Notebooks & Tags</h3>
              <p className="text-sm text-slate-400">Organize transcripts into notebooks alongside notes, clips, code, and files. Tag freely, search everything.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Private & Offline</h3>
              <p className="text-sm text-slate-400">Parakeet.js runs entirely in the browser. Your audio never leaves your device — full offline support.</p>
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
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 mb-4">
            <span className="font-medium text-slate-400">r* Ecosystem</span>
            <a href="https://rspace.online" className="hover:text-slate-300 transition-colors">rSpace</a>
            <a href="https://rmaps.online" className="hover:text-slate-300 transition-colors">rMaps</a>
            <a href="https://rnotes.online" className="hover:text-slate-300 transition-colors font-medium text-slate-300">rNotes</a>
            <a href="https://rvote.online" className="hover:text-slate-300 transition-colors">rVote</a>
            <a href="https://rfunds.online" className="hover:text-slate-300 transition-colors">rFunds</a>
            <a href="https://rtrips.online" className="hover:text-slate-300 transition-colors">rTrips</a>
            <a href="https://rcart.online" className="hover:text-slate-300 transition-colors">rCart</a>
            <a href="https://rchoices.online" className="hover:text-slate-300 transition-colors">rChoices</a>
            <a href="https://rwallet.online" className="hover:text-slate-300 transition-colors">rWallet</a>
            <a href="https://rfiles.online" className="hover:text-slate-300 transition-colors">rFiles</a>
            <a href="https://rtube.online" className="hover:text-slate-300 transition-colors">rTube</a>
            <a href="https://rcal.online" className="hover:text-slate-300 transition-colors">rCal</a>
            <a href="https://rnetwork.online" className="hover:text-slate-300 transition-colors">rNetwork</a>
            <a href="https://rinbox.online" className="hover:text-slate-300 transition-colors">rInbox</a>
            <a href="https://rstack.online" className="hover:text-slate-300 transition-colors">rStack</a>
            <a href="https://rauctions.online" className="hover:text-slate-300 transition-colors">rAuctions</a>
            <a href="https://rpubs.online" className="hover:text-slate-300 transition-colors">rPubs</a>
            <a href="https://rdata.online" className="hover:text-slate-300 transition-colors">rData</a>
          </div>
          <p className="text-center text-xs text-slate-600">
            Part of the r* ecosystem — collaborative tools for communities.
          </p>
        </div>
      </footer>
    </div>
  );
}

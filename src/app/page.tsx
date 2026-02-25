'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NotebookCard } from '@/components/NotebookCard';
import { SearchBar } from '@/components/SearchBar';
import { EcosystemFooter } from '@/components/EcosystemFooter';
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

      {/* Memory Cards */}
      <section className="py-12 md:py-16 px-4 md:px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-3">
            Memory Cards
          </h2>
          <p className="text-sm text-slate-400 text-center mb-8 md:mb-12 max-w-2xl mx-auto">
            Every note is a Memory Card — a typed, structured unit of knowledge with hierarchy,
            properties, and attachments. Designed for round-trip interoperability with Logseq.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Card Types */}
            <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">7 Card Types</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-500/20 text-amber-400 border-amber-500/30">note</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-blue-500/20 text-blue-400 border-blue-500/30">link</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-green-500/20 text-green-400 border-green-500/30">task</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">idea</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">person</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-pink-500/20 text-pink-400 border-pink-500/30">reference</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-slate-500/20 text-slate-400 border-slate-500/30">file</span>
              </div>
              <p className="text-xs text-slate-500">Each card type has distinct styling and behavior. Typed notes surface in filtered views and canvas visualizations.</p>
            </div>

            {/* Hierarchy & Properties */}
            <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Hierarchy & Properties</h3>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Nest cards under parents to build knowledge trees. Add structured <span className="font-mono text-amber-400/80">key:: value</span> properties — compatible with Logseq&apos;s property syntax.
              </p>
              <div className="space-y-1 text-xs font-mono text-slate-500">
                <div><span className="text-slate-400">type::</span> idea</div>
                <div><span className="text-slate-400">status::</span> doing</div>
                <div><span className="text-slate-400">tags::</span> #research, #web3</div>
              </div>
            </div>

            {/* Logseq Interop */}
            <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Logseq Import & Export</h3>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Export your notebooks as Logseq-compatible ZIP archives. Import a Logseq graph and keep your pages, properties, tags, and hierarchy intact.
              </p>
              <p className="text-xs text-slate-500">Round-trip fidelity: card types, tags, attachments, and parent-child structure all survive the journey.</p>
            </div>

            {/* Dual Format */}
            <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Dual Format Storage</h3>
              </div>
              <p className="text-sm text-slate-400">
                Every card stores rich TipTap JSON for editing and portable Markdown for search, export, and interoperability. Write once, read anywhere.
              </p>
            </div>

            {/* Attachments */}
            <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Structured Attachments</h3>
              </div>
              <p className="text-sm text-slate-400">
                Attach images, PDFs, audio, and files to any card with roles (primary, preview, supporting) and captions. Thumbnails render inline.
              </p>
            </div>

            {/* FUN Model */}
            <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">FUN, Not CRUD</h3>
              </div>
              <p className="text-sm text-slate-400">
                <span className="text-amber-400 font-medium">F</span>orget, <span className="text-amber-400 font-medium">U</span>pdate, <span className="text-amber-400 font-medium">N</span>ew — nothing is permanently destroyed. Forgotten cards are archived and can be remembered at any time.
              </p>
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

      <EcosystemFooter current="rNotes" />
    </div>
  );
}

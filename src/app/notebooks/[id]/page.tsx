'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { NoteCard } from '@/components/NoteCard';
import { CanvasEmbed } from '@/components/CanvasEmbed';

interface NoteData {
  id: string;
  title: string;
  type: string;
  contentPlain: string | null;
  isPinned: boolean;
  updatedAt: string;
  url: string | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
}

interface NotebookData {
  id: string;
  title: string;
  description: string | null;
  coverColor: string;
  canvasSlug: string | null;
  isPublic: boolean;
  notes: NoteData[];
  _count: { notes: number };
}

export default function NotebookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [notebook, setNotebook] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCanvas, setShowCanvas] = useState(false);
  const [creatingCanvas, setCreatingCanvas] = useState(false);
  const [tab, setTab] = useState<'notes' | 'pinned'>('notes');

  const fetchNotebook = useCallback(() => {
    fetch(`/api/notebooks/${params.id}`)
      .then((res) => res.json())
      .then(setNotebook)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetchNotebook();
  }, [fetchNotebook]);

  const handleCreateCanvas = async () => {
    if (creatingCanvas) return;
    setCreatingCanvas(true);
    try {
      const res = await fetch(`/api/notebooks/${params.id}/canvas`, { method: 'POST' });
      if (res.ok) {
        fetchNotebook();
        setShowCanvas(true);
      }
    } catch (error) {
      console.error('Failed to create canvas:', error);
    } finally {
      setCreatingCanvas(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this notebook and all its notes?')) return;
    await fetch(`/api/notebooks/${params.id}`, { method: 'DELETE' });
    router.push('/notebooks');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-amber-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        Notebook not found
      </div>
    );
  }

  const filteredNotes = tab === 'pinned'
    ? notebook.notes.filter((n) => n.isPinned)
    : notebook.notes;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
                rN
              </div>
            </Link>
            <span className="text-slate-600">/</span>
            <Link href="/notebooks" className="text-slate-400 hover:text-white transition-colors">Notebooks</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white">{notebook.title}</span>
          </div>
          <div className="flex items-center gap-3">
            {notebook.canvasSlug ? (
              <button
                onClick={() => setShowCanvas(!showCanvas)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showCanvas
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                {showCanvas ? 'Hide Canvas' : 'Show Canvas'}
              </button>
            ) : (
              <button
                onClick={handleCreateCanvas}
                disabled={creatingCanvas}
                className="px-3 py-1.5 text-sm bg-slate-800 text-slate-400 border border-slate-700 rounded-lg hover:text-white transition-colors"
              >
                {creatingCanvas ? 'Creating...' : 'Create Canvas'}
              </button>
            )}
            <Link
              href={`/notes/new?notebookId=${notebook.id}`}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-lg transition-colors"
            >
              Add Note
            </Link>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-800 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </nav>

      <div className={`flex ${showCanvas ? 'gap-0' : ''}`}>
        {/* Notes panel */}
        <main className={`${showCanvas ? 'w-3/5' : 'w-full'} max-w-6xl mx-auto px-6 py-8`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: notebook.coverColor }} />
              <h1 className="text-3xl font-bold text-white">{notebook.title}</h1>
            </div>
            {notebook.description && (
              <p className="text-slate-400 ml-7">{notebook.description}</p>
            )}
            <p className="text-sm text-slate-500 ml-7 mt-1">{notebook._count.notes} notes</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-800 mb-6">
            <button
              onClick={() => setTab('notes')}
              className={`pb-3 text-sm font-medium transition-colors ${
                tab === 'notes'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Notes
            </button>
            <button
              onClick={() => setTab('pinned')}
              className={`pb-3 text-sm font-medium transition-colors ${
                tab === 'pinned'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pinned
            </button>
          </div>

          {/* Notes grid */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {tab === 'pinned' ? 'No pinned notes' : 'No notes yet. Add one!'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  type={note.type}
                  contentPlain={note.contentPlain}
                  isPinned={note.isPinned}
                  updatedAt={note.updatedAt}
                  url={note.url}
                  tags={note.tags.map((nt) => ({
                    id: nt.tag.id,
                    name: nt.tag.name,
                    color: nt.tag.color,
                  }))}
                />
              ))}
            </div>
          )}
        </main>

        {/* Canvas sidebar */}
        {showCanvas && notebook.canvasSlug && (
          <div className="w-2/5 border-l border-slate-800 sticky top-0 h-screen">
            <CanvasEmbed canvasSlug={notebook.canvasSlug} className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
}

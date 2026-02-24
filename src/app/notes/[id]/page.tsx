'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { NoteEditor } from '@/components/NoteEditor';
import { TagBadge } from '@/components/TagBadge';
import { UserMenu } from '@/components/UserMenu';
import { authFetch } from '@/lib/authFetch';

const TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-amber-500/20 text-amber-400',
  CLIP: 'bg-purple-500/20 text-purple-400',
  BOOKMARK: 'bg-blue-500/20 text-blue-400',
  CODE: 'bg-green-500/20 text-green-400',
  IMAGE: 'bg-pink-500/20 text-pink-400',
  FILE: 'bg-slate-500/20 text-slate-400',
  AUDIO: 'bg-red-500/20 text-red-400',
};

interface NoteData {
  id: string;
  title: string;
  content: string;
  contentPlain: string | null;
  type: string;
  url: string | null;
  archiveUrl: string | null;
  language: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  duration: number | null;
  isPinned: boolean;
  canvasShapeId: string | null;
  createdAt: string;
  updatedAt: string;
  notebook: { id: string; title: string; slug: string } | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
}

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [diarizing, setDiarizing] = useState(false);
  const [speakers, setSpeakers] = useState<{ speaker: string; start: number; end: number }[] | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/notes/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setNote(data);
        setEditTitle(data.title);
        setEditContent(data.content);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/notes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNote(updated);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async () => {
    if (!note) return;
    const res = await authFetch(`/api/notes/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !note.isPinned }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNote(updated);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this note?')) return;
    await authFetch(`/api/notes/${params.id}`, { method: 'DELETE' });
    if (note?.notebook) {
      router.push(`/notebooks/${note.notebook.id}`);
    } else {
      router.push('/');
    }
  };

  const handleDiarize = async () => {
    if (!note?.fileUrl || diarizing) return;
    setDiarizing(true);
    try {
      // Fetch the audio file from the server
      const audioRes = await fetch(note.fileUrl);
      const audioBlob = await audioRes.blob();

      const form = new FormData();
      form.append('audio', audioBlob, 'recording.webm');

      const res = await authFetch('/api/voice/diarize', {
        method: 'POST',
        body: form,
      });

      if (res.ok) {
        const result = await res.json();
        setSpeakers(result.speakers || []);
      } else {
        console.error('Diarization failed');
      }
    } catch (error) {
      console.error('Diarization error:', error);
    } finally {
      setDiarizing(false);
    }
  };

  const handleUnlock = async () => {
    if (!note?.url || unlocking) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await authFetch('/api/articles/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: note.url, noteId: note.id }),
      });
      const result = await res.json();
      if (result.success && result.archiveUrl) {
        setNote({ ...note, archiveUrl: result.archiveUrl });
      } else {
        setUnlockError(result.error || 'No archived version found');
      }
    } catch (error) {
      setUnlockError('Failed to unlock article');
      console.error('Unlock error:', error);
    } finally {
      setUnlocking(false);
    }
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

  if (!note) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        Note not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Link href="/" className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
                rN
              </div>
            </Link>
            <span className="text-slate-600 hidden sm:inline">/</span>
            {note.notebook ? (
              <>
                <Link href={`/notebooks/${note.notebook.id}`} className="text-slate-400 hover:text-white transition-colors hidden sm:inline truncate max-w-[120px]">
                  {note.notebook.title}
                </Link>
                <span className="text-slate-600 hidden sm:inline">/</span>
              </>
            ) : null}
            <span className="text-white truncate max-w-[120px] md:max-w-[200px]">{note.title}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button
              onClick={handleTogglePin}
              className={`px-2 md:px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                note.isPinned
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{note.isPinned ? 'Unpin' : 'Pin to Canvas'}</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </button>
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-2 md:px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
                >
                  {saving ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditTitle(note.title);
                    setEditContent(note.content);
                  }}
                  className="px-2 md:px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:text-white transition-colors hidden sm:inline-flex"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-2 md:px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:text-white transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-2 md:px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Delete</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-6">
          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${TYPE_COLORS[note.type] || TYPE_COLORS.NOTE}`}>
            {note.type}
          </span>
          {note.tags.map((nt) => (
            <TagBadge key={nt.tag.id} name={nt.tag.name} color={nt.tag.color} />
          ))}
          <span className="text-xs text-slate-500 ml-auto">
            Created {new Date(note.createdAt).toLocaleDateString()} &middot; Updated {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* URL + Unlock */}
        {note.url && (
          <div className="mb-4 space-y-2">
            <a
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 block truncate"
            >
              {note.url}
            </a>

            {note.archiveUrl ? (
              <div className="flex items-center gap-2">
                <a
                  href={note.archiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  View Unlocked Article
                </a>
                <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{note.archiveUrl}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                >
                  {unlocking ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Unlock Article
                    </>
                  )}
                </button>
                {unlockError && (
                  <span className="text-[10px] text-red-400">{unlockError}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Uploaded file/image */}
        {note.fileUrl && note.type === 'IMAGE' && (
          <div className="mb-6 rounded-lg overflow-hidden border border-slate-700">
            <img
              src={note.fileUrl}
              alt={note.title}
              className="max-w-full max-h-[600px] object-contain mx-auto bg-slate-900"
            />
          </div>
        )}
        {note.fileUrl && note.type === 'FILE' && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <svg className="w-8 h-8 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{note.fileUrl.split('/').pop()}</p>
              {note.mimeType && <p className="text-xs text-slate-500">{note.mimeType}{note.fileSize ? ` · ${(note.fileSize / 1024).toFixed(1)} KB` : ''}</p>}
            </div>
            <a
              href={note.fileUrl}
              download
              className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Download
            </a>
          </div>
        )}
        {note.fileUrl && note.type === 'AUDIO' && (
          <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
            <audio controls src={note.fileUrl} className="w-full" />
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {note.duration != null && <span>{Math.floor(note.duration / 60)}:{(note.duration % 60).toString().padStart(2, '0')}</span>}
              {note.mimeType && <span>{note.mimeType}</span>}
              {note.fileSize && <span>{(note.fileSize / 1024).toFixed(1)} KB</span>}
              {!speakers && (
                <button
                  onClick={handleDiarize}
                  disabled={diarizing}
                  className="ml-auto px-3 py-1 text-xs rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
                >
                  {diarizing ? 'Identifying speakers...' : 'Identify speakers'}
                </button>
              )}
            </div>
            {speakers && speakers.length > 0 && (
              <div className="pt-2 border-t border-slate-700 space-y-1.5">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Speakers</div>
                {speakers.map((s, i) => {
                  const colors: Record<string, string> = {
                    SPEAKER_00: 'border-blue-500/50 text-blue-300',
                    SPEAKER_01: 'border-green-500/50 text-green-300',
                    SPEAKER_02: 'border-purple-500/50 text-purple-300',
                    SPEAKER_03: 'border-orange-500/50 text-orange-300',
                  };
                  const color = colors[s.speaker] || 'border-slate-500/50 text-slate-300';
                  return (
                    <div key={i} className={`text-xs px-2 py-1.5 rounded border-l-2 bg-slate-800/50 ${color}`}>
                      <span className="font-medium">{s.speaker.replace('SPEAKER_', 'Speaker ')}</span>
                      <span className="text-slate-500 ml-2">
                        {Math.floor(s.start / 60)}:{Math.floor(s.start % 60).toString().padStart(2, '0')}
                        &ndash;
                        {Math.floor(s.end / 60)}:{Math.floor(s.end % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {editing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-3xl font-bold bg-transparent text-white border-b border-slate-700 pb-2 focus:outline-none focus:border-amber-500/50"
            />
            <NoteEditor
              value={editContent}
              onChange={setEditContent}
              type={note.type}
            />
          </div>
        ) : (
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">{note.title}</h1>
            {note.type === 'CODE' ? (
              <pre className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                <code className="text-sm text-slate-200 font-mono">
                  {note.content}
                </code>
              </pre>
            ) : (
              <div
                className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

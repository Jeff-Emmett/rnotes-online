'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NoteEditor } from '@/components/NoteEditor';
import { FileUpload } from '@/components/FileUpload';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { UserMenu } from '@/components/UserMenu';
import { authFetch } from '@/lib/authFetch';

const NOTE_TYPES = [
  { value: 'NOTE', label: 'Note', desc: 'Rich text note' },
  { value: 'CLIP', label: 'Clip', desc: 'Web clipping' },
  { value: 'BOOKMARK', label: 'Bookmark', desc: 'Save a URL' },
  { value: 'CODE', label: 'Code', desc: 'Code snippet' },
  { value: 'IMAGE', label: 'Image', desc: 'Upload image' },
  { value: 'FILE', label: 'File', desc: 'Upload file' },
  { value: 'AUDIO', label: 'Audio', desc: 'Voice recording' },
];

interface NotebookOption {
  id: string;
  title: string;
}

export default function NewNotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-amber-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <NewNoteForm />
    </Suspense>
  );
}

function NewNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedNotebook = searchParams.get('notebookId');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bodyJson, setBodyJson] = useState<object | null>(null);
  const [type, setType] = useState('NOTE');
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('');
  const [tags, setTags] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notebookId, setNotebookId] = useState(preselectedNotebook || '');
  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/notebooks')
      .then((res) => res.json())
      .then((data) => setNotebooks(data.map((nb: NotebookOption) => ({ id: nb.id, title: nb.title }))))
      .catch(console.error);
  }, []);

  const handleContentChange = (html: string, json?: object) => {
    setContent(html);
    if (json) setBodyJson(json);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title,
        content,
        type,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (bodyJson) body.bodyJson = bodyJson;
      if (notebookId) body.notebookId = notebookId;
      if (url) body.url = url;
      if (language) body.language = language;
      if (fileUrl) body.fileUrl = fileUrl;
      if (mimeType) body.mimeType = mimeType;
      if (fileSize) body.fileSize = fileSize;
      if (duration) body.duration = duration;

      const endpoint = notebookId
        ? `/api/notebooks/${notebookId}/notes`
        : '/api/notes';

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const note = await res.json();
      if (res.ok) {
        router.push(`/notes/${note.id}`);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setSaving(false);
    }
  };

  const showUrl = ['CLIP', 'BOOKMARK'].includes(type);
  const showUpload = ['IMAGE', 'FILE'].includes(type);
  const showLanguage = type === 'CODE';
  const showRecorder = type === 'AUDIO';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
              rN
            </div>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white">New Note</span>
          <div className="ml-auto"><UserMenu /></div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Create Note</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    type === t.value
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>

          {/* URL field */}
          {showUrl && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          )}

          {/* File upload */}
          {showUpload && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {type === 'IMAGE' ? 'Upload Image' : 'Upload File'}
              </label>
              {fileUrl ? (
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  {type === 'IMAGE' && (
                    <img src={fileUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{fileUrl.split('/').pop()}</p>
                    <p className="text-xs text-slate-500">{mimeType} &middot; {(fileSize / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFileUrl(''); setMimeType(''); setFileSize(0); }}
                    className="text-slate-400 hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <FileUpload
                  accept={type === 'IMAGE' ? 'image/*' : undefined}
                  onUpload={(result) => {
                    setFileUrl(result.url);
                    setMimeType(result.mimeType);
                    setFileSize(result.size);
                    if (!title) setTitle(result.originalName);
                  }}
                />
              )}
              <div className="mt-2">
                <label className="block text-xs text-slate-500 mb-1">Or paste a URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          )}

          {/* Language field */}
          {showLanguage && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="typescript, python, rust..."
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          )}

          {/* Voice recorder */}
          {showRecorder && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Recording</label>
              <VoiceRecorder
                onResult={(result) => {
                  setFileUrl(result.fileUrl);
                  setMimeType(result.mimeType);
                  setFileSize(result.fileSize);
                  setDuration(result.duration);
                  setContent(result.transcript);
                  if (!title) setTitle(`Voice note ${new Date().toLocaleDateString()}`);
                }}
              />
              {content && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Transcript</label>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm leading-relaxed">
                    {content}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          {!showRecorder && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
              <NoteEditor
                value={content}
                onChange={handleContentChange}
                type={type}
                placeholder={type === 'CODE' ? 'Paste your code here...' : 'Write in Markdown...'}
              />
            </div>
          )}

          {/* Notebook */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notebook (optional)</label>
            <select
              value={notebookId}
              onChange={(e) => setNotebookId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="">No notebook (standalone)</option>
              {notebooks.map((nb) => (
                <option key={nb.id} value={nb.id}>{nb.title}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="research, web3, draft"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-black font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Note'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-slate-700 hover:border-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserMenu } from '@/components/UserMenu';
import { authFetch } from '@/lib/authFetch';

const COVER_COLORS = [
  '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6',
  '#10b981', '#ec4899', '#f97316', '#6366f1',
];

export default function NewNotebookPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState('#f59e0b');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    try {
      const res = await authFetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, coverColor }),
      });
      const notebook = await res.json();
      if (res.ok) {
        router.push(`/notebooks/${notebook.id}`);
      }
    } catch (error) {
      console.error('Failed to create notebook:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
              rN
            </div>
          </Link>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <Link href="/notebooks" className="text-slate-400 hover:text-white transition-colors hidden sm:inline">Notebooks</Link>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-white">New</span>
          <div className="ml-auto"><UserMenu /></div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Create Notebook</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Research Notes"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this notebook about?"
              rows={3}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Color</label>
            <div className="flex gap-3">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCoverColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    coverColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a] scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-black font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Notebook'}
            </button>
            <Link
              href="/notebooks"
              className="px-6 py-3 border border-slate-700 hover:border-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

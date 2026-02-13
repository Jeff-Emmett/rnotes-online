'use client';

import { useState } from 'react';

interface NoteEditorProps {
  value: string;
  onChange: (content: string) => void;
  type?: string;
  placeholder?: string;
}

export function NoteEditor({ value, onChange, type, placeholder }: NoteEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const isCode = type === 'CODE';

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700 bg-slate-800/50">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className={`px-4 py-2 text-sm transition-colors ${
            !showPreview ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className={`px-4 py-2 text-sm transition-colors ${
            showPreview ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Preview
        </button>
      </div>

      {showPreview ? (
        <div
          className="p-4 min-h-[300px] prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-slate-500">Nothing to preview</p>' }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Write your note in Markdown...'}
          className={`w-full min-h-[300px] p-4 bg-transparent text-slate-200 placeholder-slate-600 resize-y focus:outline-none ${
            isCode ? 'font-mono text-sm' : ''
          }`}
        />
      )}
    </div>
  );
}

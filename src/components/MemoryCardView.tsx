'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TagBadge } from './TagBadge';

const CARD_TYPE_COLORS: Record<string, string> = {
  note: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  link: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  file: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  task: 'bg-green-500/20 text-green-400 border-green-500/30',
  person: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  idea: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  reference: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const VISIBILITY_OPTIONS = ['private', 'space', 'public'] as const;

interface MemoryCardViewProps {
  noteId: string;
  cardType: string;
  visibility: string;
  summary: string | null;
  properties: Record<string, unknown>;
  parent: { id: string; title: string; cardType: string } | null;
  children: { id: string; title: string; cardType: string }[];
  tags: { tag: { id: string; name: string; color: string | null } }[];
  attachments: {
    id: string;
    role: string;
    caption: string | null;
    file: { id: string; filename: string; mimeType: string; sizeBytes: number; storageKey: string };
  }[];
  onUpdate?: (data: Record<string, unknown>) => void;
  editable?: boolean;
}

export function MemoryCardView({
  noteId,
  cardType,
  visibility,
  summary,
  properties,
  parent,
  children,
  tags,
  attachments,
  onUpdate,
  editable = false,
}: MemoryCardViewProps) {
  const [editingProps, setEditingProps] = useState(false);
  const [propEntries, setPropEntries] = useState<[string, string][]>(
    Object.entries(properties || {}).map(([k, v]) => [k, String(v)])
  );
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleSaveProps = () => {
    const updated: Record<string, string> = {};
    for (const [k, v] of propEntries) {
      if (k.trim()) updated[k.trim()] = v;
    }
    onUpdate?.({ properties: updated });
    setEditingProps(false);
  };

  const handleAddProp = () => {
    if (newKey.trim()) {
      setPropEntries([...propEntries, [newKey.trim(), newValue]]);
      setNewKey('');
      setNewValue('');
    }
  };

  const handleVisibilityChange = (v: string) => {
    onUpdate?.({ visibility: v });
  };

  const cardColor = CARD_TYPE_COLORS[cardType] || CARD_TYPE_COLORS.note;

  return (
    <div className="space-y-6">
      {/* Card Type & Visibility */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${cardColor}`}>
          {cardType}
        </span>
        {editable ? (
          <div className="flex gap-1">
            {VISIBILITY_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => handleVisibilityChange(v)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  visibility === v
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'text-slate-500 border-slate-700/50 hover:text-slate-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : visibility !== 'private' ? (
          <span className="text-[10px] px-2 py-1 rounded bg-slate-700/50 text-slate-400">
            {visibility}
          </span>
        ) : null}
      </div>

      {/* Summary */}
      {summary && (
        <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Summary</div>
          <p className="text-sm text-slate-300 italic">{summary}</p>
        </div>
      )}

      {/* Parent breadcrumb */}
      {parent && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Parent:</span>
          <Link
            href={`/notes/${parent.id}`}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            {parent.title}
          </Link>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${CARD_TYPE_COLORS[parent.cardType] || ''}`}>
            {parent.cardType}
          </span>
        </div>
      )}

      {/* Properties */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Properties</span>
          {editable && (
            <button
              onClick={() => editingProps ? handleSaveProps() : setEditingProps(true)}
              className="text-[10px] text-amber-400 hover:text-amber-300"
            >
              {editingProps ? 'Save' : 'Edit'}
            </button>
          )}
        </div>
        {editingProps ? (
          <div className="space-y-2">
            {propEntries.map(([key, value], i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={key}
                  onChange={(e) => {
                    const next = [...propEntries];
                    next[i] = [e.target.value, value];
                    setPropEntries(next);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
                  placeholder="key"
                />
                <span className="text-slate-600 text-xs self-center">::</span>
                <input
                  value={value}
                  onChange={(e) => {
                    const next = [...propEntries];
                    next[i] = [key, e.target.value];
                    setPropEntries(next);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
                  placeholder="value"
                />
                <button
                  onClick={() => setPropEntries(propEntries.filter((_, j) => j !== i))}
                  className="text-red-400 text-xs hover:text-red-300"
                >
                  x
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
                placeholder="new key"
                onKeyDown={(e) => e.key === 'Enter' && handleAddProp()}
              />
              <span className="text-slate-600 text-xs self-center">::</span>
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
                placeholder="value"
                onKeyDown={(e) => e.key === 'Enter' && handleAddProp()}
              />
              <button onClick={handleAddProp} className="text-amber-400 text-xs hover:text-amber-300">+</button>
            </div>
          </div>
        ) : propEntries.length > 0 ? (
          <div className="space-y-1">
            {propEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-slate-500 font-mono">{key}::</span>
                <span className="text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic">No properties set</p>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
            Child Notes ({children.length})
          </span>
          <div className="space-y-1">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/notes/${child.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 rounded-lg transition-colors"
              >
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CARD_TYPE_COLORS[child.cardType] || CARD_TYPE_COLORS.note}`}>
                  {child.cardType}
                </span>
                <span className="text-sm text-slate-300 hover:text-white truncate">{child.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((nt) => (
              <TagBadge key={nt.tag.id} name={nt.tag.name} color={nt.tag.color} />
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
            Attachments ({attachments.length})
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={`/api/uploads/${att.file.storageKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors"
              >
                {att.file.mimeType.startsWith('image/') ? (
                  <img
                    src={`/api/uploads/${att.file.storageKey}`}
                    alt={att.caption || att.file.filename}
                    className="w-full h-24 object-cover rounded mb-1"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-slate-800 rounded mb-1">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 truncate">{att.caption || att.file.filename}</p>
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <span>{att.role}</span>
                  <span>&middot;</span>
                  <span>{(att.file.sizeBytes / 1024).toFixed(0)} KB</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

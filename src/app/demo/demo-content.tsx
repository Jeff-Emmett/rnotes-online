'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import { useDemoSync, type DemoShape } from '@/lib/demo-sync'

/* --- Types -------------------------------------------------------------- */

interface NotebookData {
  notebookTitle: string
  description: string
  noteCount: number
  collaborators: string[]
}

interface NoteData {
  noteTitle: string
  content: string
  tags: string[]
  editor: string
  editedAt: string
}

interface PackingItem {
  name: string
  packed: boolean
  category: string
}

interface PackingListData {
  listTitle: string
  items: PackingItem[]
}

/* --- Markdown Renderer -------------------------------------------------- */

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Heading 3
    if (line.startsWith('### ')) {
      elements.push(
        <h5 key={i} className="text-sm font-semibold text-slate-300 mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h5>
      )
      i++
      continue
    }

    // Heading 2
    if (line.startsWith('## ')) {
      elements.push(
        <h4 key={i} className="text-base font-semibold text-slate-200 mt-4 mb-2">
          {renderInline(line.slice(3))}
        </h4>
      )
      i++
      continue
    }

    // Heading 1
    if (line.startsWith('# ')) {
      elements.push(
        <h3 key={i} className="text-lg font-bold text-white mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h3>
      )
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="bg-amber-500/10 border-l-2 border-amber-500 px-4 py-2 rounded-r-lg my-2">
          <p className="text-amber-200 text-sm">{renderInline(line.slice(2))}</p>
        </div>
      )
      i++
      continue
    }

    // Unordered list item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(
          <li key={i} className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">&#8226;</span>
            <span>{renderInline(lines[i].slice(2))}</span>
          </li>
        )
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 text-slate-300 text-sm my-2">
          {listItems}
        </ul>
      )
      continue
    }

    // Ordered list item
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, '')
        listItems.push(
          <li key={i} className="flex items-start gap-2">
            <span className="text-amber-400 font-medium min-w-[1.2em] text-right">
              {listItems.length + 1}.
            </span>
            <span>{renderInline(text)}</span>
          </li>
        )
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 text-slate-300 text-sm my-2">
          {listItems}
        </ol>
      )
      continue
    }

    // Code block (fenced)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <div key={`code-${i}`} className="bg-slate-950 rounded-lg border border-slate-700/50 overflow-hidden my-2">
          {lang && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
              <span className="text-xs text-slate-400 font-mono">{lang}</span>
            </div>
          )}
          <pre className="px-4 py-3 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-slate-300 text-sm my-1">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className="space-y-1">{elements}</div>
}

/** Render inline markdown: **bold**, *italic*, `code`, [links](url) */
function renderInline(text: string): React.ReactNode {
  // Split on bold, italic, code, and links
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*([\s\S]*)$/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>)
      parts.push(<strong key={key++} className="text-white font-medium">{boldMatch[2]}</strong>)
      remaining = boldMatch[3]
      continue
    }

    // Italic *text*
    const italicMatch = remaining.match(/^([\s\S]*?)\*([\s\S]+?)\*([\s\S]*)$/)
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>)
      parts.push(<em key={key++} className="text-slate-300 italic">{italicMatch[2]}</em>)
      remaining = italicMatch[3]
      continue
    }

    // Inline code `text`
    const codeMatch = remaining.match(/^([\s\S]*?)`([\s\S]+?)`([\s\S]*)$/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>)
      parts.push(
        <code key={key++} className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
          {codeMatch[2]}
        </code>
      )
      remaining = codeMatch[3]
      continue
    }

    // No more inline formatting
    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return <>{parts}</>
}

/* --- Editor Colors ------------------------------------------------------ */

const EDITOR_COLORS: Record<string, string> = {
  Maya: 'bg-teal-500',
  Liam: 'bg-cyan-500',
  Priya: 'bg-violet-500',
  Omar: 'bg-rose-500',
  Alex: 'bg-blue-500',
  Sam: 'bg-green-500',
}

function editorColor(name: string): string {
  return EDITOR_COLORS[name] || 'bg-slate-500'
}

/* --- Note Card Component ------------------------------------------------ */

function NoteCard({
  note,
  expanded,
  onToggle,
}: {
  note: NoteData & { id: string }
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden ${
        expanded ? 'ring-1 ring-amber-500/30' : 'hover:border-slate-600/50 cursor-pointer'
      } transition-colors`}
      onClick={!expanded ? onToggle : undefined}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3
            className={`font-semibold ${expanded ? 'text-lg text-white' : 'text-sm text-slate-200'} ${!expanded ? 'cursor-pointer hover:text-white' : ''}`}
            onClick={expanded ? onToggle : undefined}
          >
            {expanded && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggle() }}
                className="mr-2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Collapse note"
              >
                <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            {note.noteTitle}
          </h3>
          <span className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
            Synced to rSpace
          </span>
        </div>

        {/* Preview text (only for collapsed notes) */}
        {!expanded && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">{note.content.slice(0, 150)}...</p>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-2 text-sm">
            <RenderMarkdown content={note.content} />
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-md border border-slate-600/30"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer: editor info */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 ${editorColor(note.editor)} rounded-full flex items-center justify-center text-[10px] font-bold text-white`}
            >
              {note.editor[0]}
            </div>
            <span className="text-slate-400">{note.editor}</span>
          </div>
          <span>{note.editedAt}</span>
        </div>
      </div>
    </div>
  )
}

/* --- Packing List Component --------------------------------------------- */

function PackingList({
  packingList,
  shapeId,
  updateShape,
}: {
  packingList: PackingListData
  shapeId: string
  updateShape: (id: string, data: Partial<DemoShape>) => void
}) {
  const categories = useMemo(() => {
    const cats: Record<string, PackingItem[]> = {}
    for (const item of packingList.items) {
      if (!cats[item.category]) cats[item.category] = []
      cats[item.category].push(item)
    }
    return cats
  }, [packingList.items])

  const totalItems = packingList.items.length
  const packedCount = packingList.items.filter((i) => i.packed).length

  const toggleItem = useCallback(
    (itemName: string) => {
      const updatedItems = packingList.items.map((item) =>
        item.name === itemName ? { ...item, packed: !item.packed } : item
      )
      updateShape(shapeId, { items: updatedItems } as Partial<DemoShape>)
    },
    [packingList.items, shapeId, updateShape]
  )

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎒</span>
            <div>
              <h3 className="font-semibold text-white text-sm">{packingList.listTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {packedCount} of {totalItems} items packed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${totalItems > 0 ? (packedCount / totalItems) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 space-y-4">
        {Object.entries(categories).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
            <div className="space-y-1">
              {items.map((item) => (
                <label
                  key={item.name}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors group"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.packed
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-slate-600 group-hover:border-slate-500'
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      toggleItem(item.name)
                    }}
                  >
                    {item.packed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      item.packed ? 'text-slate-500 line-through' : 'text-slate-300'
                    }`}
                  >
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --- Sidebar Component -------------------------------------------------- */

function Sidebar({
  notebook,
  noteCount,
}: {
  notebook: NotebookData | null
  noteCount: number
}) {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Sidebar header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notebook</span>
          <span className="text-xs text-slate-500">{noteCount} notes</span>
        </div>
      </div>

      {/* Active notebook */}
      <div className="p-2">
        <div className="mb-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-amber-500/10 text-amber-300 transition-colors">
            <span>📓</span>
            <span className="font-medium">{notebook?.notebookTitle || 'Loading...'}</span>
          </div>
          <div className="ml-4 mt-0.5 space-y-0.5">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs bg-slate-700/40 text-white transition-colors">
              <span>Notes</span>
              <span className="text-slate-600">{noteCount}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/20 transition-colors">
              <span>Packing List</span>
              <span className="text-slate-600">1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick info */}
      <div className="px-4 py-3 border-t border-slate-700/50 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search notes...</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>Browse tags</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Recent edits</span>
        </div>
      </div>
    </div>
  )
}

/* --- Loading Skeleton --------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="h-4 bg-slate-700/50 rounded w-2/3 mb-3" />
          <div className="h-3 bg-slate-700/30 rounded w-full mb-2" />
          <div className="h-3 bg-slate-700/30 rounded w-4/5 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-slate-700/30 rounded w-16" />
            <div className="h-5 bg-slate-700/30 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* --- Main Demo Content -------------------------------------------------- */

export default function DemoContent() {
  const { shapes, updateShape, connected, resetDemo } = useDemoSync({
    filter: ['folk-note', 'folk-notebook', 'folk-packing-list'],
  })

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set(['demo-note-packing']))
  const [resetting, setResetting] = useState(false)

  // Extract data from shapes
  const notebook = useMemo<NotebookData | null>(() => {
    const shape = Object.values(shapes).find((s) => s.type === 'folk-notebook')
    if (!shape) return null
    return {
      notebookTitle: (shape.notebookTitle as string) || 'Untitled Notebook',
      description: (shape.description as string) || '',
      noteCount: (shape.noteCount as number) || 0,
      collaborators: (shape.collaborators as string[]) || [],
    }
  }, [shapes])

  const notes = useMemo(() => {
    return Object.entries(shapes)
      .filter(([, s]) => s.type === 'folk-note')
      .map(([id, s]) => ({
        id,
        noteTitle: (s.noteTitle as string) || 'Untitled Note',
        content: (s.content as string) || '',
        tags: (s.tags as string[]) || [],
        editor: (s.editor as string) || 'Unknown',
        editedAt: (s.editedAt as string) || '',
      }))
  }, [shapes])

  const packingList = useMemo<{ data: PackingListData; shapeId: string } | null>(() => {
    const entry = Object.entries(shapes).find(([, s]) => s.type === 'folk-packing-list')
    if (!entry) return null
    const [id, s] = entry
    return {
      shapeId: id,
      data: {
        listTitle: (s.listTitle as string) || 'Packing List',
        items: (s.items as PackingItem[]) || [],
      },
    }
  }, [shapes])

  const toggleNote = useCallback((id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleReset = useCallback(async () => {
    setResetting(true)
    try {
      await resetDemo()
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setTimeout(() => setResetting(false), 1000)
    }
  }, [resetDemo])

  const hasData = Object.keys(shapes).length > 0
  const collaborators = notebook?.collaborators || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-sm">
                rN
              </div>
              <span className="font-semibold text-lg">rNotes</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-400">Demo</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-400' : 'bg-red-400'
                }`}
              />
              <span className="hidden sm:inline">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              Home
            </Link>
            <Link
              href="/demo"
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors hidden sm:inline"
            >
              Demo
            </Link>
            <Link
              href="/notebooks/new"
              className="text-sm px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors font-medium text-slate-900"
            >
              Start Taking Notes
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm text-amber-300 mb-6">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-amber-400 animate-pulse'
              }`}
            />
            {connected ? 'Live Demo' : 'Interactive Demo'}
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
            See how rNotes works
          </h1>
          <p className="text-lg text-slate-300 mb-2">
            {notebook?.description || 'A collaborative knowledge base for your team'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400 mb-6">
            <span>Organized notebooks</span>
            <span>Flexible tagging</span>
            <span>Canvas sync</span>
            <span>Real-time collaboration</span>
          </div>

          {/* Collaborator avatars */}
          <div className="flex items-center justify-center gap-2">
            {(collaborators.length > 0 ? collaborators : ['...']).map((name, i) => {
              const colors = ['bg-teal-500', 'bg-cyan-500', 'bg-violet-500', 'bg-rose-500', 'bg-blue-500']
              return (
                <div
                  key={name}
                  className={`w-10 h-10 ${colors[i % colors.length]} rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-slate-800`}
                  title={name}
                >
                  {name[0]}
                </div>
              )
            })}
            {collaborators.length > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Context line + Reset button */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-center text-sm text-slate-400 max-w-2xl">
            This demo shows a <span className="text-slate-200 font-medium">Trip Planning Notebook</span> scenario
            with notes, a packing list, tags, and canvas sync -- all powered by the{' '}
            <span className="text-slate-200 font-medium">r* ecosystem</span> with live data from{' '}
            <span className="text-slate-200 font-medium">rSpace</span>.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex-shrink-0 text-xs px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-600/30"
          >
            {resetting ? 'Resetting...' : 'Reset Demo'}
          </button>
        </div>
      </section>

      {/* Demo Content: Sidebar + Notes + Packing List */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        {/* Notebook header card */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">📓</span>
              <span className="font-semibold text-sm">{notebook?.notebookTitle || 'Loading...'}</span>
              <span className="text-xs text-slate-500 ml-2">
                {notebook?.noteCount ?? notes.length} notes
              </span>
            </div>
            <a
              href="https://rnotes.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-slate-700/60 hover:bg-slate-600/60 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              Open in rNotes
            </a>
          </div>
          <div className="px-5 py-3">
            <p className="text-sm text-slate-400">{notebook?.description || 'Loading notebook data...'}</p>
          </div>
        </div>

        {/* Main layout: sidebar + notes + packing list */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar notebook={notebook} noteCount={notes.length} />
          </div>

          {/* Notes + Packing list */}
          <div className="lg:col-span-3 space-y-6">
            {/* Notes section */}
            <div>
              {/* Section header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-300">Notes</h2>
                  <span className="text-xs text-slate-500">{notes.length} notes</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Sort: Recently edited</span>
                </div>
              </div>

              {/* Note cards or loading */}
              {!hasData ? (
                <LoadingSkeleton />
              ) : notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      expanded={expandedNotes.has(note.id)}
                      onToggle={() => toggleNote(note.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
                  <p className="text-slate-400 text-sm">No notes found. Try resetting the demo.</p>
                </div>
              )}
            </div>

            {/* Packing List section */}
            {packingList && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-semibold text-slate-300">Packing List</h2>
                </div>
                <PackingList
                  packingList={packingList.data}
                  shapeId={packingList.shapeId}
                  updateShape={updateShape}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features showcase */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Everything you need to capture knowledge</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: 'rich-edit',
              title: 'Rich Editing',
              desc: 'Headings, lists, code blocks, highlights, images, and file attachments in every note.',
            },
            {
              icon: 'notebooks',
              title: 'Notebooks',
              desc: 'Organize notes into notebooks with sections. Nest as deep as you need.',
            },
            {
              icon: 'tags',
              title: 'Flexible Tags',
              desc: 'Cross-cutting tags let you find notes across all notebooks instantly.',
            },
            {
              icon: 'canvas',
              title: 'Canvas Sync',
              desc: 'Pin any note to your rSpace canvas for visual collaboration with your team.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5"
            >
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                {feature.icon === 'rich-edit' && (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
                {feature.icon === 'notebooks' && (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
                {feature.icon === 'tags' && (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                )}
                {feature.icon === 'canvas' && (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                  </svg>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-xs text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 pb-20 text-center">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-10">
          <h2 className="text-3xl font-bold mb-3">Ready to capture everything?</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            rNotes gives your team a shared knowledge base with rich editing, flexible organization,
            and deep integration with the r* ecosystem -- all on a collaborative canvas.
          </p>
          <Link
            href="/notebooks/new"
            className="inline-block px-8 py-4 bg-amber-500 hover:bg-amber-400 rounded-xl text-lg font-medium transition-all shadow-lg shadow-amber-900/30 text-slate-900"
          >
            Start Taking Notes
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8">
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
            <a href="https://rwallet.online" className="hover:text-slate-300 transition-colors">rWallet</a>
            <a href="https://rfiles.online" className="hover:text-slate-300 transition-colors">rFiles</a>
            <a href="https://rinbox.online" className="hover:text-slate-300 transition-colors">rInbox</a>
            <a href="https://rnetwork.online" className="hover:text-slate-300 transition-colors">rNetwork</a>
          </div>
          <p className="text-center text-xs text-slate-600">
            Part of the r* ecosystem -- collaborative tools for communities.
          </p>
        </div>
      </footer>
    </div>
  )
}

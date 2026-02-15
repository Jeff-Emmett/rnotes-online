import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'rNotes Demo - Team Knowledge Base',
  description: 'See how rNotes powers collaborative note-taking and knowledge management. A demo showcasing notebooks, rich notes, tags, canvas sync, and the full r* ecosystem.',
  openGraph: {
    title: 'rNotes Demo - Team Knowledge Base',
    description: 'See how rNotes powers collaborative note-taking and knowledge management with notebooks, rich notes, tags, and canvas sync.',
    type: 'website',
    url: 'https://rnotes.online/demo',
  },
}

/* --- Mock Data --------------------------------------------------------- */

const notebook = {
  name: 'Project Alpha',
  description: 'Engineering knowledge base for the Alpha product launch',
  color: 'from-amber-400 to-orange-500',
  noteCount: 12,
  collaborators: ['Maya', 'Liam', 'Priya', 'Omar'],
}

const sidebarCategories = [
  {
    name: 'Project Alpha',
    icon: '📓',
    active: true,
    children: [
      { name: 'Architecture', count: 4, active: true },
      { name: 'Meeting Notes', count: 3, active: false },
      { name: 'API Reference', count: 2, active: false },
      { name: 'Launch Checklist', count: 3, active: false },
    ],
  },
  {
    name: 'Design System',
    icon: '🎨',
    active: false,
    children: [
      { name: 'Components', count: 8, active: false },
      { name: 'Tokens', count: 2, active: false },
    ],
  },
  {
    name: 'Personal',
    icon: '📝',
    active: false,
    children: [
      { name: 'Ideas', count: 5, active: false },
      { name: 'Reading List', count: 7, active: false },
    ],
  },
]

const notes = [
  {
    id: 1,
    title: 'System Architecture Overview',
    preview: 'High-level architecture for Project Alpha including service boundaries, data flow, and deployment topology...',
    tags: ['architecture', 'backend', 'infrastructure'],
    editedAt: '2 hours ago',
    editor: 'Maya',
    editorColor: 'bg-teal-500',
    synced: true,
    expanded: true,
  },
  {
    id: 2,
    title: 'API Rate Limiting Strategy',
    preview: 'Token bucket algorithm with sliding window fallback. 100 req/min for free tier, 1000 req/min for pro...',
    tags: ['api', 'backend', 'security'],
    editedAt: '5 hours ago',
    editor: 'Liam',
    editorColor: 'bg-cyan-500',
    synced: false,
    expanded: false,
  },
  {
    id: 3,
    title: 'Sprint 14 Retro Notes',
    preview: 'What went well: deployment pipeline improvements, faster CI. What to improve: test coverage on auth module...',
    tags: ['meeting', 'retro', 'sprint-14'],
    editedAt: 'Yesterday',
    editor: 'Priya',
    editorColor: 'bg-violet-500',
    synced: false,
    expanded: false,
  },
  {
    id: 4,
    title: 'Database Migration Plan',
    preview: 'Step-by-step plan for migrating from PostgreSQL 14 to 16 with zero downtime. Includes rollback procedures...',
    tags: ['database', 'migration', 'ops'],
    editedAt: '2 days ago',
    editor: 'Omar',
    editorColor: 'bg-rose-500',
    synced: false,
    expanded: false,
  },
  {
    id: 5,
    title: 'Feature Flag Conventions',
    preview: 'Naming: feature.<team>.<name>. Lifecycle: dev -> staging -> canary -> GA. Cleanup policy: remove after 30 days GA...',
    tags: ['conventions', 'feature-flags', 'dx'],
    editedAt: '3 days ago',
    editor: 'Maya',
    editorColor: 'bg-teal-500',
    synced: false,
    expanded: false,
  },
]

/* --- Expanded Note Content ---------------------------------------------- */

function ExpandedNoteContent() {
  return (
    <div className="mt-4 space-y-4 text-sm">
      {/* Heading 1 */}
      <div>
        <h3 className="text-lg font-bold text-white mb-2">System Architecture Overview</h3>
        <p className="text-slate-400 text-xs">
          Last updated by <span className="text-teal-400">Maya</span> on Feb 15, 2026
        </p>
      </div>

      {/* Highlight block */}
      <div className="bg-amber-500/10 border-l-2 border-amber-500 px-4 py-3 rounded-r-lg">
        <p className="text-amber-200 text-sm">
          Key Decision: We are adopting an event-driven microservices architecture with a shared message bus (NATS) for inter-service communication.
        </p>
      </div>

      {/* Heading 2 */}
      <div>
        <h4 className="text-base font-semibold text-slate-200 mb-2">Service Boundaries</h4>
        <ul className="space-y-1.5 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">&#8226;</span>
            <span><span className="text-white font-medium">Auth Service</span> -- JWT issuance, OAuth2 providers, session management</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">&#8226;</span>
            <span><span className="text-white font-medium">Content Service</span> -- CRUD for notebooks, notes, attachments, and tags</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">&#8226;</span>
            <span><span className="text-white font-medium">Search Service</span> -- Full-text indexing via Meilisearch, faceted filters</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">&#8226;</span>
            <span><span className="text-white font-medium">Canvas Sync</span> -- WebSocket bridge to rSpace for real-time collaboration</span>
          </li>
        </ul>
      </div>

      {/* Heading 2 */}
      <div>
        <h4 className="text-base font-semibold text-slate-200 mb-2">Deployment Topology</h4>
        <p className="text-slate-300 mb-3">
          All services are containerized and orchestrated via Docker Compose in development, with Kubernetes for production.
        </p>
      </div>

      {/* Code block */}
      <div className="bg-slate-950 rounded-lg border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
          <span className="text-xs text-slate-400 font-mono">docker-compose.yml</span>
          <span className="text-xs text-slate-500">yaml</span>
        </div>
        <pre className="px-4 py-3 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`services:
  api-gateway:
    image: alpha/gateway:latest
    ports: ["8080:8080"]
    depends_on: [auth, content, search]

  auth:
    image: alpha/auth:latest
    environment:
      JWT_SECRET: \${JWT_SECRET}
      OAUTH_GITHUB_ID: \${GITHUB_ID}

  content:
    image: alpha/content:latest
    volumes: ["./data:/app/data"]

  search:
    image: meilisearch/meilisearch:v1.6
    environment:
      MEILI_MASTER_KEY: \${SEARCH_KEY}`}
        </pre>
      </div>

      {/* Another heading */}
      <div>
        <h4 className="text-base font-semibold text-slate-200 mb-2">Data Flow</h4>
        <p className="text-slate-300">
          Client requests hit the API gateway, which routes to the appropriate service. All mutations publish events to NATS, which the search service consumes for real-time index updates.
        </p>
      </div>
    </div>
  )
}

/* --- Note Card Component ------------------------------------------------ */

function NoteCard({
  note,
}: {
  note: (typeof notes)[0]
}) {
  return (
    <div
      className={`bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden ${
        note.expanded ? 'ring-1 ring-amber-500/30' : 'hover:border-slate-600/50'
      } transition-colors`}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className={`font-semibold ${note.expanded ? 'text-lg text-white' : 'text-sm text-slate-200'}`}>
            {note.title}
          </h3>
          {note.synced && (
            <span className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
              </svg>
              Synced to rSpace canvas
            </span>
          )}
        </div>

        {/* Preview text (only for collapsed notes) */}
        {!note.expanded && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">{note.preview}</p>
        )}

        {/* Expanded content */}
        {note.expanded && <ExpandedNoteContent />}

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
              className={`w-5 h-5 ${note.editorColor} rounded-full flex items-center justify-center text-[10px] font-bold text-white`}
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

/* --- Sidebar Component -------------------------------------------------- */

function Sidebar() {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Sidebar header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notebooks</span>
          <span className="text-xs text-slate-500">3 notebooks</span>
        </div>
      </div>

      {/* Notebook tree */}
      <div className="p-2">
        {sidebarCategories.map((cat) => (
          <div key={cat.name} className="mb-1">
            {/* Notebook name */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                cat.active
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              } transition-colors`}
            >
              <span>{cat.icon}</span>
              <span className={cat.active ? 'font-medium' : ''}>{cat.name}</span>
            </div>

            {/* Children / categories */}
            {cat.active && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {cat.children.map((child) => (
                  <div
                    key={child.name}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs ${
                      child.active
                        ? 'bg-slate-700/40 text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/20'
                    } transition-colors`}
                  >
                    <span>{child.name}</span>
                    <span className="text-slate-600">{child.count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Collapsed children indicator */}
            {!cat.active && (
              <div className="ml-8 py-0.5">
                <span className="text-xs text-slate-600">
                  {cat.children.length} sections
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
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

/* --- Page --------------------------------------------------------------- */

export default function DemoPage() {
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
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Interactive Demo
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
            See how rNotes works
          </h1>
          <p className="text-lg text-slate-300 mb-2">
            A collaborative knowledge base for your team
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400 mb-6">
            <span>📓 Organized notebooks</span>
            <span>🏷️ Flexible tagging</span>
            <span>🔗 Canvas sync</span>
            <span>👥 Real-time collaboration</span>
          </div>

          {/* Collaborator avatars */}
          <div className="flex items-center justify-center gap-2">
            {notebook.collaborators.map((name, i) => {
              const colors = ['bg-teal-500', 'bg-cyan-500', 'bg-violet-500', 'bg-rose-500']
              return (
                <div
                  key={name}
                  className={`w-10 h-10 ${colors[i]} rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-slate-800`}
                  title={name}
                >
                  {name[0]}
                </div>
              )
            })}
            <span className="text-sm text-slate-400 ml-2">4 collaborators</span>
          </div>
        </div>
      </section>

      {/* Context line */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <p className="text-center text-sm text-slate-400 max-w-2xl mx-auto">
          This demo shows a <span className="text-slate-200 font-medium">Team Knowledge Base</span> scenario
          with notebooks, rich notes, tags, and canvas sync -- all powered by the{' '}
          <span className="text-slate-200 font-medium">r* ecosystem</span>.
        </p>
      </section>

      {/* Demo Content: Sidebar + Notes */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        {/* Notebook header card */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">📓</span>
              <span className="font-semibold text-sm">{notebook.name}</span>
              <span className="text-xs text-slate-500 ml-2">{notebook.noteCount} notes</span>
            </div>
            <a
              href="https://rnotes.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-slate-700/60 hover:bg-slate-600/60 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              Open in rNotes ↗
            </a>
          </div>
          <div className="px-5 py-3">
            <p className="text-sm text-slate-400">{notebook.description}</p>
          </div>
        </div>

        {/* Main layout: sidebar + notes grid */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar />
          </div>

          {/* Notes list */}
          <div className="lg:col-span-3 space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-300">Architecture</h2>
                <span className="text-xs text-slate-500">4 notes</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Sort: Recently edited</span>
              </div>
            </div>

            {/* Note cards */}
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      </section>

      {/* Features showcase */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Everything you need to capture knowledge</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: '📝',
              title: 'Rich Editing',
              desc: 'Headings, lists, code blocks, highlights, images, and file attachments in every note.',
            },
            {
              icon: '📓',
              title: 'Notebooks',
              desc: 'Organize notes into notebooks with sections. Nest as deep as you need.',
            },
            {
              icon: '🏷️',
              title: 'Flexible Tags',
              desc: 'Cross-cutting tags let you find notes across all notebooks instantly.',
            },
            {
              icon: '🔗',
              title: 'Canvas Sync',
              desc: 'Pin any note to your rSpace canvas for visual collaboration with your team.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5"
            >
              <span className="text-2xl mb-3 block">{feature.icon}</span>
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
            <a href="https://rspace.online" className="hover:text-slate-300 transition-colors">🌌 rSpace</a>
            <a href="https://rmaps.online" className="hover:text-slate-300 transition-colors">🗺️ rMaps</a>
            <a href="https://rnotes.online" className="hover:text-slate-300 transition-colors font-medium text-slate-300">📝 rNotes</a>
            <a href="https://rvote.online" className="hover:text-slate-300 transition-colors">🗳️ rVote</a>
            <a href="https://rfunds.online" className="hover:text-slate-300 transition-colors">💰 rFunds</a>
            <a href="https://rtrips.online" className="hover:text-slate-300 transition-colors">✈️ rTrips</a>
            <a href="https://rcart.online" className="hover:text-slate-300 transition-colors">🛒 rCart</a>
            <a href="https://rwallet.online" className="hover:text-slate-300 transition-colors">💼 rWallet</a>
            <a href="https://rfiles.online" className="hover:text-slate-300 transition-colors">📁 rFiles</a>
            <a href="https://rnetwork.online" className="hover:text-slate-300 transition-colors">🌐 rNetwork</a>
          </div>
          <p className="text-center text-xs text-slate-600">
            Part of the r* ecosystem -- collaborative tools for communities.
          </p>
        </div>
      </footer>
    </div>
  )
}

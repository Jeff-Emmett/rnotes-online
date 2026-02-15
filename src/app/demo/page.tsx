import type { Metadata } from 'next'
import DemoContent from './demo-content'

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

export default function DemoPage() {
  return <DemoContent />
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'rNotes - Universal Knowledge Capture',
  description: 'Capture notes, clips, bookmarks, code, and files. Organize in notebooks, tag freely, and collaborate on a visual canvas shared across r*Spaces.',
  openGraph: {
    title: 'rNotes - Universal Knowledge Capture',
    description: 'Capture notes, clips, bookmarks, code, and files with a collaborative canvas.',
    type: 'website',
    url: 'https://rnotes.online',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}

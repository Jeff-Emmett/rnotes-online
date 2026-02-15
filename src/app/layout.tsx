import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { PWAInstall } from '@/components/PWAInstall'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'rNotes - Universal Knowledge Capture',
  description: 'Capture notes, clips, bookmarks, code, and files. Organize in notebooks, tag freely, and collaborate on a visual canvas shared across r*Spaces.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'rNotes',
  },
  openGraph: {
    title: 'rNotes - Universal Knowledge Capture',
    description: 'Capture notes, clips, bookmarks, code, and files with a collaborative canvas.',
    type: 'website',
    url: 'https://rnotes.online',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <PWAInstall />
        </AuthProvider>
      </body>
    </html>
  )
}

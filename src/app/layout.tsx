import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { PWAInstall } from '@/components/PWAInstall'
import { SubdomainSession } from '@/components/SubdomainSession'
import { Header } from '@/components/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'rNotes - Universal Knowledge Capture',
  description: 'Capture notes, clips, bookmarks, code, and files. Organize in notebooks, tag freely, and collaborate on a visual canvas shared across r*Spaces.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>",
  },
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
        <script defer src="https://rdata.online/collect.js" data-website-id="5ca0ec67-ed51-4907-b064-413e20b1d947" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <SubdomainSession />
          <Header current="notes" />
          {children}
          <PWAInstall />
        </AuthProvider>
      </body>
    </html>
  )
}

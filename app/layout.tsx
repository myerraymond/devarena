import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { SessionProvider } from './components/SessionProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const geistSans = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "DevArena — Who's Building?",
  description:
    "A verified leaderboard of the world's hardest working developers.",
  openGraph: {
    title: "DevArena — Who's Building?",
    description:
      "A verified leaderboard of the world's hardest working developers.",
    siteName: 'DevArena',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "DevArena — Who's Building?",
    description:
      "A verified leaderboard of the world's hardest working developers.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${ibmPlexMono.variable} font-sans antialiased overflow-x-hidden`}
      >
        <SessionProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-8rem)]">
            {children}
          </main>
          <Footer />
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

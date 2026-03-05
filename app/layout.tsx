import type { Metadata } from 'next'
import { Archivo, DM_Sans } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import { SessionProvider } from './components/SessionProvider'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'DevArena - Verified Coding Leaderboard',
  description: 'A verified coding leaderboard that shows who\'s building the hardest in real time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${dmSans.variable} font-sans antialiased`}>
        <SessionProvider>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}

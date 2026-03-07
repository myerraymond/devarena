import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — DevArena',
  description: 'How DevArena collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <header>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 2026</p>
        </header>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What we collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            When you sign in with GitHub, we collect the following data from your GitHub account:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">GitHub username</strong> and <strong className="text-foreground">display name</strong></li>
            <li><strong className="text-foreground">Avatar URL</strong> — your GitHub profile picture</li>
            <li><strong className="text-foreground">Contribution data</strong> — commits, pull requests, active days, streak, and repositories contributed to</li>
            <li><strong className="text-foreground">Top programming languages</strong> — derived from your public repositories</li>
            <li><strong className="text-foreground">GitHub OAuth access token</strong> — used to fetch your contribution data, stored encrypted, never shared</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How we use it</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Calculate your Builder Score and rank you on the leaderboard</li>
            <li>Display your public profile at <span className="font-mono text-foreground">/u/your-username</span></li>
            <li>Generate your README card and OG image</li>
            <li>Assign your league tier each season</li>
            <li>Determine language kingdom rankings</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We <strong className="text-foreground">never</strong> read your private repositories, source code, issues, or any data beyond what the GitHub Contributions API provides. We do not sell, share, or monetize your data in any way.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Where it&apos;s stored</h2>
          <p className="text-muted-foreground leading-relaxed">
            All data is stored in a secure PostgreSQL database hosted on trusted cloud providers with
            row-level security enabled. Your GitHub access token is stored server-side and is never
            exposed to the browser. We use HTTPS everywhere and follow security best practices for
            authentication and data handling.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use a single HTTP-only session cookie to keep you signed in. No third-party tracking cookies are used.
            Vercel Analytics collects anonymous, aggregated page view data — no personal information is tracked.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Make your profile private</strong> — toggle visibility from your dashboard. Private profiles are hidden from the leaderboard and search.</li>
            <li><strong className="text-foreground">Delete your account</strong> — permanently remove all your data from DevArena from your dashboard settings. This deletes your profile, stats, feed events, and league memberships.</li>
            <li><strong className="text-foreground">Revoke access</strong> — remove DevArena from your GitHub authorized apps at any time at <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-foreground/80">github.com/settings/applications</a>.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about your data or this policy, reach out to Akira on{' '}
            <a href="https://www.linkedin.com/company/akiraai/" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-foreground/80">
              LinkedIn
            </a>.
          </p>
        </section>

        <Separator />

        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline hover:text-foreground">← Back to leaderboard</Link>
        </p>
      </div>
    </div>
  )
}

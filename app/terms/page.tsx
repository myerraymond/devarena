import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — DevArena',
  description: 'Terms and conditions for using DevArena.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <header>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 2026</p>
        </header>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. What DevArena is</h2>
          <p className="text-muted-foreground leading-relaxed">
            DevArena is a free developer leaderboard that ranks builders by their GitHub contribution
            activity. By signing in, you agree to these terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Your account</h2>
          <p className="text-muted-foreground leading-relaxed">
            You sign in using your GitHub account. You are responsible for your GitHub account&apos;s
            security. DevArena does not store passwords. Your profile is public by default but can
            be made private from your dashboard at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Fair use</h2>
          <p className="text-muted-foreground leading-relaxed">
            DevArena ranks developers based on genuine contribution activity. The following are prohibited:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Artificially inflating your score with bot commits, empty commits, or automated tools</li>
            <li>Creating multiple accounts to manipulate rankings</li>
            <li>Abusing the API or scraping data at scale</li>
            <li>Impersonating other developers</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to flag or remove accounts that show suspicious activity patterns.
            Flagged accounts are excluded from the leaderboard.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Your data</h2>
          <p className="text-muted-foreground leading-relaxed">
            We collect and display your public GitHub contribution data. See our{' '}
            <Link href="/privacy" className="underline text-foreground hover:text-foreground/80">
              Privacy Policy
            </Link>{' '}
            for full details. You can delete your account and all associated data at any time from
            your dashboard.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Content and rankings</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rankings, scores, and league placements are calculated automatically based on publicly
            available GitHub data. DevArena does not guarantee the accuracy of any score or ranking.
            Rankings reset on a weekly and seasonal basis.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Availability</h2>
          <p className="text-muted-foreground leading-relaxed">
            DevArena is provided &quot;as is&quot; without warranty. We aim for high availability but do not
            guarantee uninterrupted service. We may modify, suspend, or discontinue any part of the
            service at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7. Changes to these terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these terms from time to time. Continued use of DevArena after changes
            constitutes acceptance of the new terms.
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

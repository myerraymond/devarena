import Link from 'next/link'
import Logo from '@/components/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import LeagueBadge from '@/components/league-badge'
import InfoTooltip from '@/components/info-tooltip'
import type { LeagueTier } from '@/components/league-badge'

const leagueTiers: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

export default function HowPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-12">
          <Link href="/" className="inline-block mb-8">
            <Logo size="md" />
          </Link>
          <h1 className="text-3xl font-bold mb-2">How DevArena works</h1>
          <p className="text-muted-foreground">
            Verified builds. Real scores. No vanity metrics.
          </p>
        </header>

        {/* Step cards */}
        <div className="space-y-4">
          {/* Step 1 — Connect GitHub */}
          <Card>
            <CardHeader>
              <p className="font-mono text-sm text-muted-foreground">01</p>
              <CardTitle>Connect your GitHub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in with GitHub in one click. We pull your commits,
                pull requests, and contribution streak directly from the
                GitHub API. No manual input, no self-reporting.
              </p>
              <Badge variant="secondary">Takes 30 seconds</Badge>
            </CardContent>
          </Card>

          {/* Step 2 — Builder Score */}
          <Card>
            <CardHeader>
              <p className="font-mono text-sm text-muted-foreground">02</p>
              <CardTitle>Your builder score is calculated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We combine commits, PRs merged, active days, and consistency
                into a single score. Updated every hour. A 14-day streak beats
                a one-day commit dump every time.
              </p>
              <div className="bg-muted rounded-md px-4 py-3 text-sm font-mono overflow-x-auto">
                <span>score = (</span>
                <InfoTooltip label="commits" explanation="Only counts commits with 5+ lines changed." />
                <span> × 1) + (</span>
                <InfoTooltip label="PRs" explanation="Pull requests merged into any repository." />
                <span> × 4) + (</span>
                <InfoTooltip label="active days" explanation="Days with at least one qualifying commit." />
                <span> × 3) + (</span>
                <InfoTooltip label="repos" explanation="Distinct repositories contributed to." />
                <span> × 5)</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — Leagues */}
          <Card>
            <CardHeader>
              <p className="font-mono text-sm text-muted-foreground">03</p>
              <CardTitle>Compete in seasonal leagues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every month is a new season. Based on your score you are placed
                into Bronze, Silver, Gold, Platinum, or Diamond. Get promoted by
                outbuilding your division. Get relegated by going quiet. Seasons
                reset on the 1st of every month.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {leagueTiers.map((tier) => (
                  <LeagueBadge key={tier} tier={tier} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 4 — Cracked */}
          <Card>
            <CardHeader>
              <p className="font-mono text-sm text-muted-foreground">04</p>
              <CardTitle>Get cracked in your language</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The #1 ranked developer for each programming language earns a 👑
                crown on their profile. Rankings update hourly. The spot can be
                taken — stay active or lose your crown.
              </p>
              <Button variant="ghost" size="sm" className="px-0 text-sm" asChild>
                <Link href="/cracked">View the cracked devs →</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Step 5 — README Card */}
          <Card>
            <CardHeader>
              <p className="font-mono text-sm text-muted-foreground">05</p>
              <CardTitle>Show the world you&apos;re building</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add a live card to your GitHub profile README. Displays your
                rank, streak, league, and cracked status. Updates
                automatically. Configurable from your dashboard.
              </p>
              <pre className="bg-muted rounded-md px-4 py-3 text-xs font-mono overflow-x-auto">
                <code>{'[![DevArena](https://devarena.so/readme/username?stats=rank,streak,league)](https://devarena.so)'}</code>
              </pre>
              <Button variant="ghost" size="sm" className="px-0 text-sm" asChild>
                <Link href="/dashboard/readme">Configure your card →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12">
          <Separator className="mb-8" />
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">Ready to see where you rank?</p>
            <Button asChild>
              <Link href="/">View the leaderboard →</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

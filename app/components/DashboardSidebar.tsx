'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import InfoTooltip from '@/components/info-tooltip'
import LeagueBadge, { getTierLabel, getTierEmoji } from '@/components/league-badge'
import type { LeagueTier } from '@/components/league-badge'

interface DashboardSidebarProps {
  username: string
  isPublic: boolean
  ranks: { week: number | null; month: number | null; allTime: number | null }
  league: {
    tier: LeagueTier
    promoted: boolean | null
    relegated: boolean | null
    previousTier: string | null
  } | null
  season: {
    name: string
    ends_at: string
  } | null
  nextTier: {
    nextTier: LeagueTier
    minScore: number
  } | null
  userScore: number
  lastSyncedAt: string | null
}

// Cron runs at 0:00, 6:00, 12:00, 18:00 UTC
const SYNC_HOURS_UTC = [0, 6, 12, 18]

function getNextSyncTime(now: number): number {
  const date = new Date(now)
  const currentHourUTC = date.getUTCHours()
  const currentMinUTC = date.getUTCMinutes()

  // Find the next sync hour
  for (const hour of SYNC_HOURS_UTC) {
    if (hour > currentHourUTC || (hour === currentHourUTC && currentMinUTC === 0)) {
      const next = new Date(date)
      next.setUTCHours(hour, 0, 0, 0)
      return next.getTime()
    }
  }

  // Next sync is tomorrow at 00:00 UTC
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCHours(0, 0, 0, 0)
  return next.getTime()
}

function SyncCountdown({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (now === null) {
    return (
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground block opacity-0">—</span>
        <span className="text-xs text-muted-foreground block font-mono opacity-0">—</span>
      </div>
    )
  }

  // "Last synced" label
  let lastSyncLabel = 'Never synced'
  if (lastSyncedAt) {
    const diffMs = now - new Date(lastSyncedAt).getTime()
    const minutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      lastSyncLabel = `Last synced ${hours}h ${minutes % 60}m ago`
    } else if (minutes > 0) {
      lastSyncLabel = `Last synced ${minutes}m ago`
    } else {
      lastSyncLabel = 'Just synced'
    }
  }

  // "Next sync" countdown
  const nextSyncMs = getNextSyncTime(now)
  const untilNext = Math.max(0, nextSyncMs - now)
  const nextHours = Math.floor(untilNext / (1000 * 60 * 60))
  const nextMinutes = Math.floor((untilNext % (1000 * 60 * 60)) / (1000 * 60))
  const nextSeconds = Math.floor((untilNext % (1000 * 60)) / 1000)

  const nextSyncLabel = nextHours > 0
    ? `${nextHours}h ${nextMinutes}m ${nextSeconds}s`
    : nextMinutes > 0
      ? `${nextMinutes}m ${nextSeconds}s`
      : `${nextSeconds}s`

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground block">{lastSyncLabel}</span>
      <span className="text-xs text-muted-foreground block font-mono">
        Next auto-sync in {nextSyncLabel}
      </span>
    </div>
  )
}

function SeasonCountdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (now === null) {
    return <span className="text-xs text-muted-foreground opacity-0">—</span>
  }

  const end = new Date(endsAt).getTime()
  const diffMs = Math.max(0, end - now)
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return (
    <span className="text-xs text-muted-foreground">
      Ends in {days}d {hours}h
    </span>
  )
}

export default function DashboardSidebar({
  username,
  isPublic,
  ranks,
  league,
  season,
  nextTier,
  userScore,
  lastSyncedAt,
}: DashboardSidebarProps) {
  const [isPublicState, setIsPublicState] = useState(isPublic)
  const [isToggling, setIsToggling] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/u/${username}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }, [username])

  const handleTogglePublic = useCallback(async () => {
    setIsToggling(true)
    try {
      const response = await fetch('/api/user/toggle-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublicState }),
      })
      if (response.ok) {
        setIsPublicState(!isPublicState)
        router.refresh()
      }
    } catch {
      // Toggle failed
    } finally {
      setIsToggling(false)
    }
  }, [isPublicState, router])

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setSyncDone(true)
        setTimeout(() => setSyncDone(false), 3000)
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Sync failed: ${err.error || 'Unknown error'}`)
      }
    } catch {
      alert('Sync failed. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }, [router])

  const pointsToNext = nextTier ? Math.max(0, nextTier.minScore - userScore) : 0
  const progressPct = nextTier && nextTier.minScore > 0
    ? Math.min(100, (userScore / nextTier.minScore) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Your Rank */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground/80">
            <InfoTooltip
              label="Your Rank"
              explanation="Your current position on the global leaderboard, ranked by Builder Score. Updates every 6 hours."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranks.week ? (
            <>
              <div className="font-mono text-4xl font-bold">#{ranks.week}</div>
              <div className="mt-2 space-y-1 text-sm">
                {ranks.month && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="font-mono font-semibold">#{ranks.month}</span>
                  </div>
                )}
                {ranks.allTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">All Time</span>
                    <span className="font-mono font-semibold">#{ranks.allTime}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No rank yet — sync your stats</div>
          )}
        </CardContent>
      </Card>

      {/* League Status */}
      {league && season && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground/80">
              <InfoTooltip
                label="League"
                explanation="Monthly seasons where builders compete for tier placement. Tiers are assigned based on your percentile rank."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTierEmoji(league.tier)}</span>
              <div>
                <div className="text-lg font-bold">{getTierLabel(league.tier)}</div>
                <LeagueBadge tier={league.tier} className="mt-0.5" />
              </div>
            </div>

            {/* Promotion / Relegation */}
            {league.promoted && (
              <div className="px-3 py-1.5 rounded-md bg-green-50 border border-green-200 text-green-700 text-xs">
                ↑ Promoted to {getTierLabel(league.tier)} this season
              </div>
            )}
            {league.relegated && (
              <div className="px-3 py-1.5 rounded-md bg-muted border text-muted-foreground text-xs">
                ↓ Relegated from {league.previousTier || 'higher tier'}
              </div>
            )}

            {/* Progress to next tier */}
            {nextTier && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {getTierEmoji(league.tier)} → {getTierEmoji(nextTier.nextTier)}
                  </span>
                  <span className="font-mono">{userScore} / {nextTier.minScore}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {pointsToNext > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {pointsToNext.toLocaleString()} pts to {getTierEmoji(nextTier.nextTier)} {getTierLabel(nextTier.nextTier)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">You&apos;re at the top. Stay there.</p>
                )}
              </div>
            )}

            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{season.name}</span>
              <SeasonCountdown endsAt={season.ends_at} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground/80">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Share */}
          <Button
            variant="outline"
            className="w-full justify-start h-10 cursor-pointer"
            onClick={handleShare}
          >
            <span className="mr-2">{copied ? '✓' : '🔗'}</span>
            {copied ? 'Link copied!' : 'Share profile'}
          </Button>

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2 min-h-[44px]">
            <div className="flex items-center gap-2">
              <span>{isPublicState ? '🌐' : '🔒'}</span>
              <span className="text-sm">{isPublicState ? 'Public' : 'Private'}</span>
            </div>
            <Switch
              checked={isPublicState}
              onCheckedChange={handleTogglePublic}
              disabled={isToggling}
            />
          </div>

          {/* Sync */}
          <Button
            variant="outline"
            className="w-full justify-start min-h-[48px] h-12 cursor-pointer"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <span className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}>
              {syncDone ? '✓' : isSyncing ? '⟳' : '🔄'}
            </span>
            {syncDone ? 'Synced!' : isSyncing ? 'Syncing…' : 'Sync now'}
          </Button>
          <SyncCountdown lastSyncedAt={lastSyncedAt} />

          {/* README Card */}
          <Separator />
          <Button variant="outline" className="w-full h-10 cursor-pointer" asChild>
            <Link href="/dashboard/readme">Configure README card →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

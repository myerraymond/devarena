'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import LeagueBadge, { getTierLabel, getTierEmoji } from '@/components/league-badge'
import type { LeagueTier } from '@/components/league-badge'
import StreakBadge from '@/components/streak-badge'
import InfoTooltip from '@/components/info-tooltip'

interface MemberData {
  username: string
  display_name: string | null
  avatar_url: string | null
  week_score: number | null
  streak: number | null
  end_rank: number | null
  promoted: boolean | null
  relegated: boolean | null
}

interface SeasonData {
  id: string
  name: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

interface LeaguesClientProps {
  members: Record<string, MemberData[]>
  season: SeasonData | null
  currentUsername: string | null
  currentUserTier: string | null
}

const TIER_ORDER: LeagueTier[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze']

const TIER_TOOLTIPS: Record<LeagueTier, string> = {
  diamond: 'Top 1% of builders this season.',
  platinum: 'Top 5% of builders this season.',
  gold: 'Top 15% of builders this season.',
  silver: 'Top 35% of builders this season.',
  bronze: 'Everyone else — keep building to rank up.',
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!targetDate) return

    function update() {
      const now = Date.now()
      const end = new Date(targetDate!).getTime()
      const diff = Math.max(0, end - now)

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

export default function LeaguesClient({
  members,
  season,
  currentUsername,
  currentUserTier,
}: LeaguesClientProps) {
  // Expand user's tier by default, collapse others
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const tier of TIER_ORDER) {
      initial[tier] = tier === currentUserTier
    }
    // If user has no tier, expand diamond by default
    if (!currentUserTier) initial.diamond = true
    return initial
  })

  const countdown = useCountdown(season?.ends_at || null)

  const toggleTier = (tier: string) => {
    setExpanded((prev) => ({ ...prev, [tier]: !prev[tier] }))
  }

  const totalMembers = TIER_ORDER.reduce(
    (sum, tier) => sum + (members[tier]?.length || 0),
    0
  )

  if (!season) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Leagues</h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">
                No active season yet. Leagues will be assigned at the start of next month.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <InfoTooltip
              label="Leagues"
              explanation="Monthly seasons where builders compete for tier placement. Tiers are assigned based on percentile rank at the end of each season."
            />
          </h1>
          <p className="text-muted-foreground mb-4">{season.name}</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="px-4 py-2 rounded-md bg-muted text-sm font-mono">
              <InfoTooltip
                label={`Season resets in ${countdown || '—'}`}
                explanation="At the end of each season, tiers are assigned based on final rank. Builders are promoted or relegated based on how they performed vs the previous season."
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {totalMembers} builder{totalMembers !== 1 ? 's' : ''} ranked
            </span>
          </div>
        </header>

        <div className="space-y-4">
          {TIER_ORDER.map((tier) => {
            const tierMembers = members[tier] || []
            const isExpanded = expanded[tier]
            const isUserTier = tier === currentUserTier

            return (
              <Card
                key={tier}
                className={isUserTier ? 'border-primary/30 bg-primary/5' : ''}
              >
                <CardHeader className="pb-2">
                  <button
                    onClick={() => toggleTier(tier)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-2xl">{getTierEmoji(tier)}</span>
                      <CardTitle className="text-lg">
                        <InfoTooltip
                          label={getTierLabel(tier)}
                          explanation={TIER_TOOLTIPS[tier]}
                        />
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {tierMembers.length}
                      </Badge>
                      {isUserTier && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          Your tier
                        </Badge>
                      )}
                    </div>
                  </button>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    {tierMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No builders in this tier yet
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Builder</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Streak</TableHead>
                            <TableHead className="w-20">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tierMembers.map((member) => {
                            const isCurrentUser = member.username === currentUsername

                            return (
                              <TableRow
                                key={member.username}
                                className={
                                  isCurrentUser
                                    ? 'bg-muted/50'
                                    : 'cursor-pointer hover:bg-muted/50'
                                }
                              >
                                <TableCell className="font-mono">
                                  {member.end_rank || '—'}
                                </TableCell>
                                <TableCell>
                                  <Link
                                    href={`/u/${member.username}`}
                                    className="flex items-center gap-3"
                                  >
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={
                                          member.avatar_url ||
                                          `https://github.com/${member.username}.png`
                                        }
                                        alt={member.username}
                                      />
                                      <AvatarFallback>
                                        {member.username[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {member.display_name || member.username}
                                        </span>
                                        {isCurrentUser && (
                                          <Badge variant="secondary" className="text-xs">
                                            You
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        @{member.username}
                                      </div>
                                    </div>
                                  </Link>
                                </TableCell>
                                <TableCell className="font-mono">
                                  {member.week_score?.toLocaleString() || '—'}
                                </TableCell>
                                <TableCell>
                                  {member.streak && member.streak > 0 ? (
                                    <StreakBadge days={member.streak} size="sm" />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {member.promoted && (
                                    <InfoTooltip
                                      label="↑ Promoted"
                                      explanation="This builder moved up a tier from last season."
                                      className="text-xs text-green-700"
                                    />
                                  )}
                                  {member.relegated && (
                                    <InfoTooltip
                                      label="↓ Relegated"
                                      explanation="This builder dropped a tier from last season."
                                      className="text-xs text-red-600"
                                    />
                                  )}
                                  {!member.promoted && !member.relegated && (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

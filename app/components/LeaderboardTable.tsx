'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'

interface LeaderboardRow {
  rank: number
  username: string
  display_name: string | null
  hours: number
  commits: number | null
  streak: number | null
  top_language: string | null
  followers: number | null
  stars: number | null
  publicRepos: number | null
  is_active: boolean
  score: number | null
}

interface LeaderboardTableProps {
  data: LeaderboardRow[]
}

export default function LeaderboardTable({ data }: LeaderboardTableProps) {
  const router = useRouter()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Builder</TableHead>
          <TableHead>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button className="hover:underline underline-offset-2">
                  Score
                </button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Builder Score</h4>
                  <p className="text-sm text-muted-foreground">
                    Weighted calculation: (commits × 1) + (PRs × 2) + (merged PRs × 4) + (active days × 3) + (repos × 5)
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </TableHead>
          <TableHead>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button className="hover:underline underline-offset-2">
                  Commits
                </button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">GitHub Commits</h4>
                  <p className="text-sm text-muted-foreground">
                    Total commits for the selected timeframe (week, month, or all time).
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </TableHead>
          <TableHead>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button className="hover:underline underline-offset-2">
                  Streak
                </button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Contribution Streak</h4>
                  <p className="text-sm text-muted-foreground">
                    Consecutive days with at least one GitHub contribution. Streaks longer than 7 days are highlighted in green.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </TableHead>
          <TableHead>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button className="hover:underline underline-offset-2">
                  Status
                </button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Activity Status</h4>
                  <p className="text-sm text-muted-foreground">
                    "Live" indicates the user has contributed in the last 24 hours. Stats are synced hourly from GitHub.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const rankClass = row.rank <= 3 ? 'font-bold' : ''
          
          return (
            <TableRow 
              key={row.username}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/u/${row.username}`)}
            >
              <TableCell className={cn('font-mono', rankClass)}>
                {row.rank}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://github.com/${row.username}.png`} alt={row.username} />
                    <AvatarFallback>{row.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{row.username}</div>
                    <div className="text-sm text-foreground/70">@{row.username}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono font-medium" onClick={(e) => e.stopPropagation()}>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button className="hover:underline underline-offset-2">
                      {row.score?.toLocaleString() || '—'}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Score Breakdown</h4>
                      <p className="text-xs text-foreground/80">
                        This score is calculated from GitHub activity and determines ranking position.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
              <TableCell className="font-mono text-foreground/80">
                {row.commits?.toLocaleString() || '—'}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {row.streak && row.streak > 0 ? (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div>
                        <Badge variant="outline" className={cn(row.streak > 7 && "border-green-500 text-green-700")}>
                          🔥 {row.streak}d
                        </Badge>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{row.streak} Day Streak</h4>
                        <p className="text-sm text-muted-foreground">
                          {row.streak > 7 
                            ? "Impressive! This builder has maintained a streak longer than a week."
                            : "Keep it up! Maintain daily contributions to grow your streak."}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ) : (
                  <span className="text-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {row.is_active ? (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div>
                        <Badge variant="outline" className="border-green-500 text-green-700">
                          <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                          Live
                        </Badge>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Active Now</h4>
                        <p className="text-sm text-foreground/80">
                          This builder has contributed to GitHub in the last 24 hours.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ) : (
                  <span className="text-foreground/50">—</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

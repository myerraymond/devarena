'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import StreakBadge from '@/components/streak-badge'
import LeagueBadge from '@/components/league-badge'
import InfoTooltip from '@/components/info-tooltip'
import type { LeagueTier } from '@/components/league-badge'
import type { LeaderboardData } from '../page'

interface LeaderboardTableProps {
  data: LeaderboardData[]
  currentUsername?: string | null
  appendedUserRow?: LeaderboardData
  emptyMessage?: string
  languageKings?: Record<string, string[]>
  leagueTiers?: Record<string, string>
}

export default function LeaderboardTable({
  data,
  currentUsername,
  appendedUserRow,
  emptyMessage,
  languageKings = {},
  leagueTiers = {},
}: LeaderboardTableProps) {
  const router = useRouter()

  const renderRow = (
    row: LeaderboardData,
    isCurrentUser: boolean,
    rowId?: string
  ) => {
    const rankClass = row.rank <= 3 ? 'font-bold' : ''

    return (
      <TableRow
        key={`${row.username}-${rowId || 'main'}`}
        id={rowId}
        className={cn(
          'cursor-pointer transition-colors',
          isCurrentUser
            ? 'bg-muted/50 hover:bg-muted/70'
            : 'hover:bg-muted/50'
        )}
        onClick={() => router.push(`/u/${row.username}`)}
      >
        {/* Rank */}
        <TableCell className={cn('font-mono', rankClass)}>{row.rank}</TableCell>

        {/* Builder */}
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage
                src={`https://github.com/${row.username}.png`}
                alt={row.username}
              />
              <AvatarFallback>
                {row.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium whitespace-nowrap">{row.username}</span>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
                {leagueTiers[row.username] && (
                  <LeagueBadge tier={leagueTiers[row.username] as LeagueTier} />
                )}
                {languageKings[row.username] && (() => {
                  const langs = languageKings[row.username]
                  const show = langs.slice(0, 2)
                  const extra = langs.length - 2
                  return (
                    <TooltipProvider>
                      {show.map((lang) => (
                        <Tooltip key={lang}>
                          <TooltipTrigger asChild>
                            <div>
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700"
                              >
                                👑 {lang}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cracked — #1 {lang} developer on DevArena this week</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {extra > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700"
                              >
                                +{extra} more
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Also #1 in: {langs.slice(2).join(', ')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  )
                })()}
              </div>
              <div className="text-sm text-foreground/70 whitespace-nowrap">
                @{row.username}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Score */}
        <TableCell
          className="font-mono font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="hover:underline underline-offset-2 cursor-pointer">
                {(row.score ?? row.weekScore)?.toLocaleString() || '—'}
              </button>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Score Breakdown</h4>
                <p className="text-xs text-foreground/80">
                  This score is calculated from GitHub activity and determines
                  ranking position.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </TableCell>

        {/* Commits */}
        <TableCell className="font-mono text-foreground/80">
          {row.commits?.toLocaleString() || '—'}
        </TableCell>

        {/* Streak */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          {row.streak && row.streak > 0 ? (
            <StreakBadge days={row.streak} size="sm" />
          ) : (
            <span className="text-foreground/50">—</span>
          )}
        </TableCell>

        {/* Language */}
        <TableCell className="text-sm text-foreground/80">
          {row.top_language || '—'}
        </TableCell>

        {/* Status */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          {row.is_active ? (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-700"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
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
  }

  return (
    <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <InfoTooltip
                label="Rank"
                explanation="Position on the leaderboard this week, ranked by Builder Score. Resets every Monday."
              />
            </TableHead>
            <TableHead>Builder</TableHead>
            <TableHead>
              <InfoTooltip
                label="Score"
                explanation="Calculated as: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5). Updated every 6 hours."
              />
            </TableHead>
            <TableHead>
              <InfoTooltip
                label="Commits"
                explanation="Total commits pushed this week. Only counts commits with more than 5 lines changed to filter out empty commits."
              />
            </TableHead>
            <TableHead>
              <InfoTooltip
                label="Streak"
                explanation="Consecutive days with at least one commit. Missing a day resets the streak to zero."
              />
            </TableHead>
            <TableHead>Language</TableHead>
            <TableHead>
              <InfoTooltip
                label="Status"
                explanation="Shows ● Live if the builder has pushed code in the last 24 hours."
              />
            </TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        {data.length === 0 && emptyMessage ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={7}
              className="text-center py-8 text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          <>
            {data.map((row) =>
              renderRow(
                row,
                row.username === currentUsername,
                row.username === currentUsername ? 'my-row' : undefined
              )
            )}

            {appendedUserRow && (
              <>
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={7} className="pb-1 pt-4">
                    <Separator className="mb-3" />
                    <span className="text-xs text-muted-foreground">
                      Your position
                    </span>
                  </TableCell>
                </TableRow>
                {renderRow(appendedUserRow, true, 'my-row')}
              </>
            )}
          </>
        )}
      </TableBody>
    </Table>
    </div>
  )
}

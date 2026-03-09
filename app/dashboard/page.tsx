import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabase, createServerClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import InfoTooltip from '@/components/info-tooltip'
import DashboardControls from '@/app/components/DashboardControls'
import StatCard from '@/app/components/StatCard'
import StreakBadge from '@/components/streak-badge'
import LeagueBadge, { getTierLabel, getTierEmoji } from '@/components/league-badge'
import type { LeagueTier } from '@/components/league-badge'
import ContributionBarChart from '@/app/components/charts/ContributionBarChart'
import LanguageDonutChart from '@/app/components/charts/LanguageDonutChart'
import { getUserLeagueMembership, getUserPreviousLeagueMembership, getActiveSeason, getNextTierThreshold } from '@/lib/leagues'

export const revalidate = 60

async function getUserRanks(userId: string): Promise<{ week: number | null; month: number | null; allTime: number | null }> {
  const { data: userStats } = await supabase
    .from('stats_snapshots')
    .select('week_score, month_score')
    .eq('user_id', userId)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!userStats) {
    return { week: null, month: null, allTime: null }
  }

  const { data: allSnapshots } = await supabase
    .from('stats_snapshots')
    .select(`
      week_score,
      month_score,
      users!inner (
        id,
        is_public
      )
    `)
    .eq('users.is_public', true)
    .order('snapshotted_at', { ascending: false })

  if (!allSnapshots) {
    return { week: null, month: null, allTime: null }
  }

  const userWeekScores = new Map<string, number>()
  const userMonthScores = new Map<string, number>()

  for (const snapshot of allSnapshots) {
    const uid = (snapshot.users as any).id
    if (!userWeekScores.has(uid)) {
      userWeekScores.set(uid, snapshot.week_score || 0)
      userMonthScores.set(uid, snapshot.month_score || 0)
    }
  }

  const weekSorted = Array.from(userWeekScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)

  const weekRank = weekSorted.findIndex(([uid]) => uid === userId) + 1

  const monthSorted = Array.from(userMonthScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)

  const monthRank = monthSorted.findIndex(([uid]) => uid === userId) + 1
  const allTimeRank = monthRank

  return {
    week: weekRank > 0 ? weekRank : null,
    month: monthRank > 0 ? monthRank : null,
    allTime: allTimeRank > 0 ? allTimeRank : null,
  }
}

async function getUserDashboardData(userId: string) {
  const serverClient = createServerClient()

  const { data: user, error } = await serverClient
    .from('users')
    .select('id, username, github_username, display_name, avatar_url, joined_at, is_public, user_number')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return null
  }

  const { data: latestStats } = await supabase
    .from('stats_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    user: {
      id: user.id,
      username: user.github_username || user.username || 'unknown',
      github_username: user.github_username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      joined_at: user.joined_at,
      is_public: user.is_public,
      user_number: (user as any).user_number ?? null,
    },
    stats: latestStats || null,
  }
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  const [dashboardData, ranks, leagueMembership, previousMembership, activeSeason] = await Promise.all([
    getUserDashboardData(session.userId),
    getUserRanks(session.userId),
    getUserLeagueMembership(session.userId),
    getUserPreviousLeagueMembership(session.userId),
    getActiveSeason(),
  ])

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center text-muted-foreground">
            Error loading dashboard data.
          </div>
        </div>
      </div>
    )
  }

  const { user, stats } = dashboardData
  const hasGitHub = stats && stats.github_commits !== null

  const nextTierInfo = leagueMembership
    ? await getNextTierThreshold(leagueMembership.tier)
    : null
  const userScore = stats?.week_score || 0
  const pointsToNext = nextTierInfo ? Math.max(0, nextTierInfo.minScore - userScore) : 0

  const dailyData = stats?.daily_breakdown && Array.isArray(stats.daily_breakdown)
    ? stats.daily_breakdown.slice(-7)
    : []

  const languageData = stats?.language_breakdown && Array.isArray(stats.language_breakdown)
    ? stats.language_breakdown
    : []

  const totalContributions = stats?.week_contributions || 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Profile Header */}
        <div className="flex items-center gap-3 mb-6">
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-10 h-10 rounded-full border border-border shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">
              {user.display_name || user.username}
            </h1>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
          {user.user_number && (
            <Badge variant="secondary" className="text-xs shrink-0">
              #{user.user_number}
            </Badge>
          )}
        </div>

        {/* Hero: Score | Rank | League — 3 columns */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Builder Score */}
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-sm">
            <div className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-1">
              <InfoTooltip
                label="Builder Score"
                explanation="Calculated as: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5)."
              />
            </div>
            <div className="font-mono text-4xl font-bold tracking-tight">
              {(stats?.week_score ?? 0).toLocaleString()}
            </div>
            {stats?.month_score != null && (
              <div className="mt-3 pt-3 border-t border-blue-500/30 text-xs text-blue-200">
                Month: <span className="text-white font-mono font-semibold">{stats.month_score.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Rank */}
          <div className={`rounded-xl p-5 shadow-sm ${ranks.week ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'border-2 border-dashed border-border'}`}>
            {ranks.week ? (
              <>
                <div className="text-xs font-medium text-amber-100 uppercase tracking-wider mb-1">
                  <InfoTooltip
                    label="Global Rank"
                    explanation="Your position on the leaderboard by Builder Score. Updates every 6 hours."
                  />
                </div>
                <div className="font-mono text-4xl font-bold tracking-tight">#{ranks.week}</div>
                <div className="mt-3 pt-3 border-t border-amber-400/30 text-xs text-amber-100">
                  Month: <span className="text-white font-mono font-semibold">#{ranks.month ?? '—'}</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs text-center">
                Keep building to appear on the leaderboard
              </div>
            )}
          </div>

          {/* League */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <InfoTooltip
                label="League"
                explanation="Monthly seasons where builders compete for tier placement based on percentile rank."
              />
            </div>
            {leagueMembership ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getTierEmoji(leagueMembership.tier)}</span>
                  <div>
                    <div className="text-base font-bold leading-tight">{getTierLabel(leagueMembership.tier)}</div>
                    <LeagueBadge tier={leagueMembership.tier} className="mt-0.5" />
                  </div>
                </div>
                {leagueMembership.promoted && (
                  <div className="mb-2 px-2 py-1 rounded text-xs bg-green-50 border border-green-200 text-green-700">
                    ↑ Promoted this season
                  </div>
                )}
                {leagueMembership.relegated && (
                  <div className="mb-2 px-2 py-1 rounded text-xs bg-muted border text-muted-foreground">
                    ↓ Relegated this season
                  </div>
                )}
                {nextTierInfo && (
                  <div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, nextTierInfo.minScore > 0 ? (userScore / nextTierInfo.minScore) * 100 : 0)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pointsToNext > 0
                        ? `${pointsToNext.toLocaleString()} pts to ${getTierLabel(nextTierInfo.nextTier)}`
                        : 'Top tier'}
                    </div>
                  </div>
                )}
                {activeSeason && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {activeSeason.name} · {Math.max(0, Math.ceil((new Date(activeSeason.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d left
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground text-xs">No league yet</div>
            )}
          </div>
        </div>

        {/* This Week — single horizontal strip */}
        {hasGitHub && (stats?.week_contributions || stats?.week_commits || stats?.week_prs) && (
          <Card className="mb-4 overflow-hidden">
            <div className="flex divide-x divide-border">
              {[
                { label: 'Commits', value: stats.week_commits || 0 },
                { label: 'Pull Requests', value: stats.week_prs || 0 },
                { label: 'PR Reviews', value: stats.week_pr_reviews || 0 },
                { label: 'Issues', value: stats.week_issues || 0 },
                { label: 'Total', value: stats.week_contributions || 0 },
              ].map(({ label, value }, i, arr) => (
                <div key={label} className={`flex-1 px-4 py-4 text-center ${i === arr.length - 1 ? 'bg-muted/40' : ''}`}>
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className={`font-mono text-2xl font-bold ${i === arr.length - 1 ? 'text-indigo-600' : 'text-foreground'}`}>{value}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Commits list + Activity chart side by side */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            {/* Commit counts with relative bars */}
            <div className="col-span-2 rounded-xl border bg-card p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Commits</h2>
              <div className="space-y-3">
                {[
                  { label: 'This Week', value: stats.week_commits },
                  { label: 'This Month', value: stats.month_commits },
                  { label: 'This Year', value: stats.year_commits },
                  { label: 'All Time', value: stats.all_time_commits },
                ].map(({ label, value }, i) => {
                  const max = stats.all_time_commits || 1
                  const pct = Math.min(100, ((value || 0) / max) * 100)
                  const opacity = ['opacity-100', 'opacity-80', 'opacity-60', 'opacity-40'][i]
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="font-mono text-sm font-bold">{(value || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-500 ${opacity} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activity bar chart */}
            <div className="col-span-3">
              {dailyData.length > 0 ? (
                <ContributionBarChart data={dailyData.map((day: { date: string; count: number }) => ({
                  date: day.date,
                  count: day.count,
                }))} />
              ) : (
                <div className="h-full rounded-xl border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                  No activity data
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile stats + Language chart side by side */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            {/* Profile stats */}
            <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
              {stats.github_followers !== null && (
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-xs text-muted-foreground font-medium mb-1">👥 Followers</div>
                  <div className="font-mono text-xl font-bold">{stats.github_followers.toLocaleString()}</div>
                </div>
              )}
              {stats.github_stars !== null && (
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-xs text-muted-foreground font-medium mb-1">⭐ Stars</div>
                  <div className="font-mono text-xl font-bold">{stats.github_stars.toLocaleString()}</div>
                </div>
              )}
              {(stats.streak_days !== null || stats.github_streak_days !== null) && (
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-xs text-muted-foreground font-medium mb-1">
                    <InfoTooltip
                      label="🔥 Streak"
                      explanation="Consecutive days with at least one qualifying commit (5+ lines changed)."
                    />
                  </div>
                  <StreakBadge days={stats.streak_days || stats.github_streak_days || 0} size="md" />
                </div>
              )}
              {(stats.top_language || stats.github_top_language) && (
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-xs text-muted-foreground font-medium mb-1">💻 Language</div>
                  <div className="font-mono text-sm font-bold truncate">
                    {stats.top_language || stats.github_top_language}
                  </div>
                </div>
              )}
            </div>

            {/* Language donut */}
            <div className="col-span-3">
              {languageData.length > 0 ? (
                <LanguageDonutChart
                  languages={languageData.map((lang: { name: string; size: number; percentage: number }) => ({
                    name: lang.name,
                    size: lang.size,
                    percentage: lang.percentage,
                  }))}
                  totalContributions={totalContributions}
                />
              ) : (
                <div className="h-full rounded-xl border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                  No language data
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls + Danger Zone */}
        <DashboardControls
          username={user.github_username || user.username || 'unknown'}
          isPublic={user.is_public}
          rank={ranks.week}
          streak={stats?.streak_days || stats?.github_streak_days || null}
          league={leagueMembership ? `${getTierEmoji(leagueMembership.tier)} ${getTierLabel(leagueMembership.tier)}` : null}
          score={stats?.week_score || null}
        />
      </div>
    </div>
  )
}

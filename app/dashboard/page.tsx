import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabase, createServerClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import InfoTooltip from '@/components/info-tooltip'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import DeleteAccountCard from '@/app/components/DeleteAccountCard'
import StreakBadge, { getStreakMotivation } from '@/components/streak-badge'
import LeagueBadge, { getTierLabel, getTierEmoji } from '@/components/league-badge'
import type { LeagueTier } from '@/components/league-badge'
import ContributionBarChart from '@/app/components/charts/ContributionBarChart'
import LanguageDonutChart from '@/app/components/charts/LanguageDonutChart'
import { getUserLeagueMembership, getUserPreviousLeagueMembership, getActiveSeason, getNextTierThreshold } from '@/lib/leagues'
import { getUserLanguageKingdoms, getUserLanguageRank } from '@/lib/language-kings'

export const revalidate = 60

// ── Data fetching ──────────────────────────────────────────

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

  if (error || !user) return null

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

async function getUserFeedEvents(userId: string) {
  const { data, error } = await supabase
    .from('feed_events')
    .select('id, event_type, payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !data) return []
  return data
}

// ── Language color map ─────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  Python: 'bg-yellow-500',
  JavaScript: 'bg-yellow-400',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-500',
  Swift: 'bg-orange-400',
  'C#': 'bg-purple-500',
  'C++': 'bg-blue-600',
  Ruby: 'bg-red-500',
  Java: 'bg-red-400',
  Kotlin: 'bg-green-500',
  Dart: 'bg-blue-400',
  PHP: 'bg-indigo-400',
  Elixir: 'bg-purple-400',
  Haskell: 'bg-slate-500',
  Zig: 'bg-amber-500',
}

// ── Feed event formatting ──────────────────────────────────

function formatFeedEvent(event: { event_type: string; payload: any; created_at: string }) {
  const ago = getTimeAgo(event.created_at)
  switch (event.event_type) {
    case 'streak_milestone':
      return { icon: '🔥', text: `Hit a ${event.payload?.streak_days}-day streak`, ago }
    case 'language_king':
      return { icon: '👑', text: `Became #1 in ${event.payload?.language}`, ago }
    case 'rank_milestone':
      return { icon: '🏆', text: `Entered top ${event.payload?.rank}`, ago }
    case 'first_commit':
      return { icon: '🚀', text: 'Joined DevArena', ago }
    case 'league_promoted':
      return { icon: '⬆️', text: `Promoted to ${event.payload?.tier}`, ago }
    default:
      return { icon: '📌', text: event.event_type, ago }
  }
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

// ── Page component ─────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  const [dashboardData, ranks, leagueMembership, previousMembership, activeSeason, userKingdoms, feedEvents] = await Promise.all([
    getUserDashboardData(session.userId),
    getUserRanks(session.userId),
    getUserLeagueMembership(session.userId),
    getUserPreviousLeagueMembership(session.userId),
    getActiveSeason(),
    getUserLanguageKingdoms(session.userId),
    getUserFeedEvents(session.userId),
  ])

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="text-center text-muted-foreground">
            Error loading dashboard data.
          </div>
        </div>
      </div>
    )
  }

  const { user, stats } = dashboardData

  const nextTierInfo = leagueMembership
    ? await getNextTierThreshold(leagueMembership.tier)
    : null
  const userScore = stats?.week_score || 0
  const topLanguage = stats?.top_language || stats?.github_top_language || null

  // Language rank for non-kings
  const languageRank = !userKingdoms.length && topLanguage
    ? await getUserLanguageRank(session.userId, topLanguage)
    : null

  const dailyData = stats?.daily_breakdown && Array.isArray(stats.daily_breakdown)
    ? stats.daily_breakdown.slice(-7)
    : []

  const languageData = stats?.language_breakdown && Array.isArray(stats.language_breakdown)
    ? stats.language_breakdown
    : []

  const totalContributions = stats?.week_contributions || 0
  const streakDays = stats?.streak_days || stats?.github_streak_days || 0
  const streakMotivation = getStreakMotivation(streakDays)

  // Check if user was active today
  const isActiveToday = dailyData.length > 0 && (() => {
    const today = new Date().toISOString().split('T')[0]
    return dailyData.some((d: any) => d.date === today && d.count > 0)
  })()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

        {/* ── Top Header ─────────────────────────────────── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-2xl font-bold">
              Welcome back, {user.display_name || user.username}
            </h1>
            {user.user_number && (
              <span className="text-sm text-muted-foreground font-mono">
                User #{user.user_number}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {leagueMembership && (
              <LeagueBadge tier={leagueMembership.tier} />
            )}
            {userKingdoms.map((lang) => (
              <Badge
                key={lang}
                variant="outline"
                className="bg-yellow-50 border-yellow-300 text-yellow-700 text-xs"
              >
                👑 {lang}
              </Badge>
            ))}
            {isActiveToday && (
              <Badge variant="secondary" className="text-xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                Live
              </Badge>
            )}
          </div>
        </div>

        {/* ── Two-column layout ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* ── Sidebar on mobile (rank + league first) ──── */}
          <div className="lg:hidden space-y-4">
            <DashboardSidebar
              username={user.github_username || user.username || 'unknown'}
              isPublic={user.is_public}
              ranks={ranks}
              league={leagueMembership ? {
                tier: leagueMembership.tier,
                promoted: leagueMembership.promoted,
                relegated: leagueMembership.relegated,
                previousTier: previousMembership ? getTierLabel(previousMembership.tier) : null,
              } : null}
              season={activeSeason ? {
                name: activeSeason.name,
                ends_at: activeSeason.ends_at,
              } : null}
              nextTier={nextTierInfo}
              userScore={userScore}
              lastSyncedAt={stats?.snapshotted_at || null}
            />
          </div>

          {/* ── Main column (left, 2/3) ──────────────────── */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* Section 1 — Builder Score */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs text-foreground/70 uppercase tracking-wide">
                    <InfoTooltip
                      label="This Week"
                      explanation="Your Builder Score for the last 7 days. Calculated as: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5)."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="font-mono text-2xl sm:text-3xl font-bold">
                    {(stats?.week_score ?? 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs text-foreground/70 uppercase tracking-wide">
                    <InfoTooltip
                      label="This Month"
                      explanation="Your cumulative Builder Score since the 1st of this month."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="font-mono text-2xl sm:text-3xl font-bold">
                    {(stats?.month_score ?? 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs text-foreground/70 uppercase tracking-wide">
                    <InfoTooltip
                      label="All Time"
                      explanation="Your total Builder Score since joining DevArena."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="font-mono text-2xl sm:text-3xl font-bold">
                    {(stats?.all_time_score ?? stats?.month_score ?? 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs text-foreground/70 uppercase tracking-wide">
                    <InfoTooltip
                      label="Daily Avg"
                      explanation="Your average daily Builder Score over the last 30 days."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="font-mono text-2xl sm:text-3xl font-bold">
                    {stats?.month_score ? Math.round(stats.month_score / 30).toLocaleString() : '0'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2 — Activity Breakdown */}
            <Card>
              <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
                <CardTitle className="text-sm">
                  <InfoTooltip
                    label="This Week Breakdown"
                    explanation="Your contribution breakdown for the past 7 days. Only counts commits with 5+ lines changed."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'COMMITS', value: stats?.week_commits || 0, bold: false },
                    { label: 'PRs', value: stats?.week_prs || 0, bold: false },
                    { label: 'REVIEWS', value: stats?.week_pr_reviews || 0, bold: false },
                    { label: 'REPOS', value: stats?.week_repos || stats?.repos || 0, bold: false },
                    { label: 'SCORE', value: stats?.week_score || 0, bold: true },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        {item.label}
                      </div>
                      <div className={`font-mono text-base sm:text-lg ${item.bold ? 'font-bold' : 'font-semibold'}`}>
                        {item.value.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Streak */}
            <Card>
              <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm">
                  <InfoTooltip
                    label="Current Streak"
                    explanation="Consecutive days where you pushed at least one qualifying commit (5+ lines changed)."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="flex flex-col items-center py-3 sm:py-4 gap-3">
                  <StreakBadge days={streakDays} size="lg" />
                  {streakMotivation && (
                    <p className="text-sm text-muted-foreground text-center">
                      {streakMotivation}
                    </p>
                  )}
                </div>

                {/* Mini 7-day activity chart */}
                {dailyData.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex items-end justify-between gap-1 h-16">
                      {dailyData.map((day: { date: string; count: number }, i: number) => {
                        const maxCount = Math.max(...dailyData.map((d: { count: number }) => d.count), 1)
                        const heightPct = Math.max(4, (day.count / maxCount) * 100)
                        const isToday = day.date === new Date().toISOString().split('T')[0]
                        const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <div
                              className={`w-full rounded-sm transition-all ${isToday ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                              style={{ height: `${heightPct}%` }}
                            />
                            <span className={`text-[9px] ${isToday ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                              {dayLabel}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Section 4 — GitHub Stats */}
            {stats && (
              <Card>
                <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
                  <CardTitle className="text-sm">GitHub</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 sm:gap-x-6">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">This Year</div>
                      <div className="font-mono font-bold">{stats.year_commits?.toLocaleString() || '0'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">All Time</div>
                      <div className="font-mono font-bold">{stats.all_time_commits?.toLocaleString() || '0'}</div>
                    </div>
                    {stats.github_followers !== null && stats.github_followers !== undefined && (
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Followers</div>
                        <div className="font-mono font-bold">{stats.github_followers.toLocaleString()}</div>
                      </div>
                    )}
                    {stats.github_stars !== null && stats.github_stars !== undefined && (
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Stars</div>
                        <div className="font-mono font-bold">{stats.github_stars.toLocaleString()}</div>
                      </div>
                    )}
                    {topLanguage && (
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Top Language</div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${LANG_COLORS[topLanguage] || 'bg-gray-400'}`} />
                          <span className="font-mono font-bold">{topLanguage}</span>
                        </div>
                      </div>
                    )}
                    {user.joined_at && (
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Member Since</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(user.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 5 — Charts */}
            {dailyData.length > 0 && (
              <ContributionBarChart data={dailyData.map((day: { date: string; count: number }) => ({
                date: day.date,
                count: day.count,
              }))} />
            )}

            {languageData.length > 0 && (
              <LanguageDonutChart
                languages={languageData.map((lang: { name: string; size: number; percentage: number }) => ({
                  name: lang.name,
                  size: lang.size,
                  percentage: lang.percentage,
                }))}
                totalContributions={totalContributions}
              />
            )}

            {/* Section 6 — Language King Status */}
            {userKingdoms.length > 0 ? (
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm">
                    <InfoTooltip
                      label="👑 Language Kingdoms"
                      explanation="You are the #1 ranked developer for these languages this week. Stay active or someone can take your crown."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-2">
                    {userKingdoms.map((lang) => (
                      <div key={lang} className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">👑</span>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">#1 in the world</div>
                            <div className="text-xs text-muted-foreground">{lang} · This week</div>
                          </div>
                        </div>
                        <Link
                          href="/cracked"
                          className="text-xs text-amber-700 hover:underline shrink-0 ml-2"
                        >
                          View →
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : languageRank ? (
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm">
                    <InfoTooltip
                      label="Your Closest Kingdom"
                      explanation="Your current rank for your top language. Keep building to reach #1."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${LANG_COLORS[languageRank.language] || 'bg-gray-400'}`} />
                        <span className="font-semibold">{languageRank.language}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        You are #{languageRank.rank}
                        {languageRank.gap > 0 && (
                          <> · {languageRank.gap.toLocaleString()} pts behind #1</>
                        )}
                      </p>
                    </div>
                    <Link
                      href="/cracked"
                      className="text-xs text-muted-foreground hover:underline shrink-0 ml-2"
                    >
                      View all →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Section 7 — Recent Milestones */}
            <Card>
              <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm">Your Milestones</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                {feedEvents.length > 0 ? (
                  <div className="space-y-2">
                    {feedEvents.map((event: any) => {
                      const { icon, text, ago } = formatFeedEvent(event)
                      return (
                        <div key={event.id} className="flex items-center justify-between py-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">{icon}</span>
                            <span className="text-sm truncate">{text}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{ago}</span>
                        </div>
                      )
                    })}
                    <Separator className="my-1" />
                    <Link href="/feed" className="text-xs text-muted-foreground hover:underline">
                      View global feed →
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your milestones will appear here as you build.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Section 8 — README Card Preview */}
            {user.is_public && (
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm">
                    <InfoTooltip
                      label="README Card"
                      explanation="A live SVG card you can embed in your GitHub profile README. Updates automatically whenever your stats sync."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/readme/${user.username}`}
                    alt="DevArena README Card"
                    className="rounded-md border w-full max-w-sm"
                    width={400}
                    height={120}
                  />
                  <div className="mt-3">
                    <Link
                      href="/dashboard/readme"
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      Configure →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Sidebar (right, 1/3) — desktop only ──────── */}
          <div className="hidden lg:block lg:col-span-1">
            <DashboardSidebar
              username={user.github_username || user.username || 'unknown'}
              isPublic={user.is_public}
              ranks={ranks}
              league={leagueMembership ? {
                tier: leagueMembership.tier,
                promoted: leagueMembership.promoted,
                relegated: leagueMembership.relegated,
                previousTier: previousMembership ? getTierLabel(previousMembership.tier) : null,
              } : null}
              season={activeSeason ? {
                name: activeSeason.name,
                ends_at: activeSeason.ends_at,
              } : null}
              nextTier={nextTierInfo}
              userScore={userScore}
              lastSyncedAt={stats?.snapshotted_at || null}
            />
          </div>
        </div>

        {/* ── Danger Zone ────────────────────────────────── */}
        <Separator className="my-8 sm:my-10" />
        <DeleteAccountCard username={user.github_username || user.username || 'unknown'} />
      </div>
    </div>
  )
}

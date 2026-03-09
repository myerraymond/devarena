import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import StreakBadge, { getStreakMotivation } from '@/components/streak-badge'
import LeagueBadge from '@/components/league-badge'
import { getUserLanguageKingdoms, getUserLanguageRank } from '@/lib/language-kings'
import { getUserLeagueMembership, getActiveSeason } from '@/lib/leagues'
import { getSession } from '@/lib/session'
import { getProfileTooltips } from '@/lib/profile-context'
import { isActive } from '@/lib/utils'
import { isValidUsername } from '@/lib/validation'
import InfoTooltip from '@/components/info-tooltip'
import type { Metadata } from 'next'

export const revalidate = 60

// ─── Types ────────────────────────────────────────────────

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  joined_at: string
  is_public: boolean
}

interface UserStats {
  streak_days: number | null
  top_language: string | null
  snapshotted_at: string | null
  week_score: number | null
  month_score: number | null
  week_commits: number | null
  month_commits: number | null
  year_commits: number | null
  all_time_commits: number | null
  week_prs: number | null
  week_pr_reviews: number | null
  week_issues: number | null
  week_contributions: number | null
  github_followers: number | null
  github_stars: number | null
  github_public_repos: number | null
  github_streak_days: number | null
  github_top_language: string | null
  daily_breakdown: any
  language_breakdown: any
}

// ─── Data fetching ────────────────────────────────────────

async function getUserProfile(
  username: string
): Promise<{ user: UserProfile; stats: UserStats | null } | null> {
  const supabase = createServerClient()

  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select(
      'id, username, github_username, display_name, avatar_url, joined_at, is_public'
    )
    .or(`github_username.eq.${username},username.eq.${username}`)
    .eq('is_public', true)
    .single()

  if (publicError || !publicUser) return null

  const { data: latestStats } = await supabase
    .from('stats_snapshots')
    .select('*')
    .eq('user_id', publicUser.id)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    user: {
      id: publicUser.id,
      username:
        (publicUser as any).github_username || publicUser.username,
      display_name: publicUser.display_name,
      avatar_url: publicUser.avatar_url,
      joined_at: publicUser.joined_at,
      is_public: publicUser.is_public,
    },
    stats: latestStats || null,
  }
}

async function getUserRanks(
  userId: string
): Promise<{ week: number | null; month: number | null; allTime: number | null }> {
  const supabase = createServerClient()

  const { data: userStats } = await supabase
    .from('stats_snapshots')
    .select('week_score, month_score')
    .eq('user_id', userId)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!userStats) return { week: null, month: null, allTime: null }

  const { data: allSnapshots } = await supabase
    .from('stats_snapshots')
    .select(`week_score, month_score, users!inner ( id, is_public )`)
    .eq('users.is_public', true)
    .order('snapshotted_at', { ascending: false })

  if (!allSnapshots) return { week: null, month: null, allTime: null }

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
    .filter(([, score]) => score > 0)
  const weekRank = weekSorted.findIndex(([uid]) => uid === userId) + 1

  const monthSorted = Array.from(userMonthScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
  const monthRank = monthSorted.findIndex(([uid]) => uid === userId) + 1

  return {
    week: weekRank > 0 ? weekRank : null,
    month: monthRank > 0 ? monthRank : null,
    allTime: monthRank > 0 ? monthRank : null,
  }
}

// ─── Metadata ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { username: string }
}): Promise<Metadata> {
  const profile = await getUserProfile(params.username)
  if (!profile) {
    return { title: `@${params.username} — DevArena` }
  }

  const { user, stats } = profile
  const name = user.display_name || user.username

  // We'll compute a quick rank + streak for the description
  const ranks = await getUserRanks(user.id)
  const streak = stats?.streak_days || stats?.github_streak_days || 0
  const rankStr = ranks.week ? `ranked #${ranks.week} this week` : 'on DevArena'
  const streakStr = streak > 0 ? ` with a ${streak} day streak` : ''

  return {
    title: `${name} on DevArena`,
    description: `${name} is ${rankStr}${streakStr}`,
    openGraph: {
      title: `${name} on DevArena`,
      description: `${name} is ${rankStr}${streakStr}`,
      url: `${process.env.NEXTAUTH_URL}/u/${params.username}`,
      siteName: 'DevArena',
      images: [
        {
          url: `${process.env.NEXTAUTH_URL}/u/${params.username}/og`,
          width: 1200,
          height: 630,
          alt: `${name}'s DevArena profile`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} on DevArena`,
      description: `${name} is ${rankStr}${streakStr}`,
      images: [`${process.env.NEXTAUTH_URL}/u/${params.username}/og`],
    },
  }
}

// ─── Page ─────────────────────────────────────────────────

export default async function UserProfilePage({
  params,
}: {
  params: { username: string }
}) {
  // Validate username format before querying database
  if (!isValidUsername(params.username)) notFound()

  const profile = await getUserProfile(params.username)
  if (!profile) notFound()

  const { user, stats } = profile
  const topLanguage = stats?.top_language || stats?.github_top_language || null

  // Determine if the viewer is looking at their own profile
  const session = await getSession()
  const isOwnProfile = session?.userId === user.id
  const displayName = user.display_name || user.username
  const tooltips = getProfileTooltips(isOwnProfile, displayName)

  const [
    ranks,
    kingdoms,
    languageRank,
    leagueMembership,
    activeSeason,
  ] = await Promise.all([
    getUserRanks(user.id),
    getUserLanguageKingdoms(user.id),
    getUserLanguageRank(user.id, topLanguage),
    getUserLeagueMembership(user.id),
    getActiveSeason(),
  ])

  // Computed values
  const joinedDate = new Date(user.joined_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const currentStreak =
    stats?.streak_days || stats?.github_streak_days || 0
  const motivation = getStreakMotivation(currentStreak)
  const live = isActive(stats?.snapshotted_at || null)

  // Daily breakdown for activity chart
  const dailyData: { date: string; count: number }[] =
    stats?.daily_breakdown && Array.isArray(stats.daily_breakdown)
      ? stats.daily_breakdown.slice(-7)
      : []

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8">

        {/* ── HEADER SECTION ──────────────────────────────── */}
        <div className="flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-start gap-4 sm:gap-6">
          <Avatar className="h-20 w-20 sm:h-16 sm:w-16 shrink-0">
            <AvatarImage
              src={`https://github.com/${user.username}.png`}
              alt={user.username}
            />
            <AvatarFallback className="text-xl">
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start mb-1">
              <h1 className="text-2xl font-bold">
                {user.display_name || user.username}
              </h1>
              {live && (
                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                  ● Live
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground mb-1">@{user.username}</p>
            <p className="text-sm text-muted-foreground mb-3">
              Joined {joinedDate}
            </p>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start mb-4">
              {leagueMembership && (
                <LeagueBadge tier={leagueMembership.tier} />
              )}
              {kingdoms.map((lang) => (
                <Badge
                  key={lang}
                  variant="outline"
                  className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700"
                >
                  👑 {lang}
                </Badge>
              ))}
            </div>

            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <a
                href={`https://github.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub →
              </a>
            </Button>
          </div>

          {/* Ranks — right aligned on desktop, below header on mobile */}
          {(ranks.week || ranks.month) && (
            <div className="text-center sm:text-right shrink-0 space-y-1">
              {ranks.week && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Week </span>
                  <span className="font-mono font-bold text-lg">
                    #{ranks.week}
                  </span>
                </div>
              )}
              {ranks.month && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Month </span>
                  <span className="font-mono font-semibold">
                    #{ranks.month}
                  </span>
                </div>
              )}
              {ranks.allTime && (
                <div className="text-sm">
                  <span className="text-muted-foreground">All Time </span>
                  <span className="font-mono font-semibold">
                    #{ranks.allTime}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* ── WORLD RANKINGS ──────────────────────────────── */}
        {kingdoms.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">
                <InfoTooltip
                  label="World Rankings"
                  explanation={tooltips.worldRanking}
                />
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {kingdoms.map((lang) => (
                <div
                  key={lang}
                  className="relative overflow-hidden bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-5"
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="text-3xl mb-1">👑</div>
                    <p className="text-sm text-muted-foreground">
                      #1 in the world
                    </p>
                    <p className="text-xl font-bold font-mono mt-1">
                      {lang}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This week · Updated hourly
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : languageRank && languageRank.rank > 1 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Language Ranking</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {tooltips.languageRankText(languageRank.rank, languageRank.language)}{' '}
                <span className="font-mono font-semibold text-foreground">
                  #{languageRank.rank}
                </span>{' '}
                in{' '}
                <span className="font-semibold text-foreground">
                  {languageRank.language}
                </span>{' '}
                this week
              </p>
              {languageRank.gap > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {languageRank.gap.toLocaleString()} more points to reach #1
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 px-0 text-sm"
                asChild
              >
                <Link
                  href={`/?language=${encodeURIComponent(languageRank.language)}`}
                >
                  View {languageRank.language} leaderboard →
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* ── STATS GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs text-muted-foreground tracking-wide">
                <InfoTooltip
                  label="This Week"
                  explanation={tooltips.weekScore}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="font-mono text-2xl sm:text-3xl font-bold">
                {(stats?.week_score ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.week_commits?.toLocaleString() || '0'} commits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs text-muted-foreground tracking-wide">
                <InfoTooltip
                  label="This Month"
                  explanation={tooltips.monthScore}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="font-mono text-2xl sm:text-3xl font-bold">
                {(stats?.month_score ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.month_commits?.toLocaleString() || '0'} commits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs text-muted-foreground tracking-wide">
                <InfoTooltip
                  label="All Time"
                  explanation={tooltips.allTimeScore}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="font-mono text-2xl sm:text-3xl font-bold">
                {(
                  stats?.all_time_commits ||
                  stats?.year_commits ||
                  0
                ).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">commits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs text-muted-foreground tracking-wide">
                <InfoTooltip
                  label="Daily Avg"
                  explanation={tooltips.dailyAverage}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="font-mono text-2xl sm:text-3xl font-bold">
                {stats?.week_commits
                  ? Math.round(stats.week_commits / 7)
                  : '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                commits/day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── STREAK CARD ──────────────────────────────────── */}
        {currentStreak > 0 && (
          <Card className={currentStreak >= 100 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground tracking-wide">
                <InfoTooltip
                  label="Current Streak"
                  explanation={tooltips.streak}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className={currentStreak >= 100 ? 'flex flex-col items-center py-6' : ''}>
              <StreakBadge days={currentStreak} size="lg" />
              {motivation && (
                <p className={`text-sm mt-3 ${currentStreak >= 100 ? 'font-medium text-orange-700' : 'text-muted-foreground'}`}>
                  {motivation}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── ACTIVITY CHART ──────────────────────────────── */}
        {dailyData.length > 0 && <ActivityChart data={dailyData} activityTooltip={tooltips.activity} />}

        {/* ── LEAGUE SECTION ──────────────────────────────── */}
        {leagueMembership && activeSeason && (() => {
          const daysLeft = Math.max(
            0,
            Math.ceil(
              (new Date(activeSeason.ends_at).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          )
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <LeagueBadge tier={leagueMembership.tier} className="text-sm" />
                    <span className="text-sm text-muted-foreground">
                      {activeSeason.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Season ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* ── EXTRA STATS ROW ──────────────────────────────── */}
        {stats &&
          (stats.github_followers !== null ||
            stats.github_stars !== null ||
            stats.github_public_repos !== null ||
            topLanguage) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {stats.github_followers !== null && (
                <Card>
                  <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Followers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="font-mono text-xl sm:text-2xl font-bold">
                      {stats.github_followers.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.github_stars !== null && (
                <Card>
                  <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Stars
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="font-mono text-xl sm:text-2xl font-bold">
                      {stats.github_stars.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.github_public_repos !== null && (
                <Card>
                  <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Public Repos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="font-mono text-xl sm:text-2xl font-bold">
                      {stats.github_public_repos.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              )}
              {topLanguage && (
                <Card>
                  <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Top Language
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <Badge variant="secondary" className="text-sm sm:text-base">
                      {topLanguage}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
      </div>
    </div>
  )
}

// ─── Activity Chart (pure CSS/Tailwind bars) ──────────────

function ActivityChart({
  data,
  activityTooltip,
}: {
  data: { date: string; count: number }[]
  activityTooltip: string
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const today = new Date().toDateString()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            <InfoTooltip
              label="Activity"
              explanation={activityTooltip}
            />
          </CardTitle>
          <span className="text-xs font-mono text-muted-foreground">
            {data.reduce((s, d) => s + d.count, 0).toLocaleString()} total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 sm:gap-2 h-28 sm:h-32">
          {data.map((day) => {
            const date = new Date(day.date)
            const isToday = date.toDateString() === today
            const pct = maxCount > 0 ? (day.count / maxCount) * 100 : 0
            // Shorter day labels on mobile
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' })
            const shortLabel = dayLabel.charAt(0)

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <div className="w-full flex items-end h-20 sm:h-24">
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      day.count === 0
                        ? 'bg-muted h-1'
                        : isToday
                          ? 'bg-foreground'
                          : 'bg-primary'
                    }`}
                    style={{
                      height: day.count > 0 ? `${Math.max(pct, 8)}%` : '4px',
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] ${
                    isToday
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{dayLabel}</span>
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

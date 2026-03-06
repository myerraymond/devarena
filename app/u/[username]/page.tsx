import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import StatCard from '@/app/components/StatCard'
import ContributionBarChart from '@/app/components/charts/ContributionBarChart'
import LanguageDonutChart from '@/app/components/charts/LanguageDonutChart'
import type { Metadata } from 'next'

export const revalidate = 60

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  joined_at: string
  is_public: boolean
}

interface UserStats {
  week_total_seconds: number | null
  month_total_seconds: number | null
  all_time_seconds: number | null
  daily_average_seconds: number | null
  streak_days: number | null
  top_language: string | null
  top_project: string | null
  snapshotted_at: string | null
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

async function getUserJoinOrder(userId: string): Promise<number | null> {
  // Fetch all users ordered by joined_at and id to get accurate join order
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, joined_at')
    .order('joined_at', { ascending: true })
    .order('id', { ascending: true })

  if (error || !allUsers) {
    return null
  }

  // Find the index of the current user
  const userIndex = allUsers.findIndex(u => u.id === userId)
  
  if (userIndex === -1) {
    return null
  }

  return userIndex + 1
}

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

async function getUserProfile(username: string): Promise<{ user: UserProfile; stats: UserStats | null } | null> {
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('id, username, github_username, display_name, avatar_url, joined_at, is_public')
    .or(`github_username.eq.${username},username.eq.${username}`)
    .eq('is_public', true)
    .single()

  if (publicError || !publicUser) {
    return null
  }

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
      username: (publicUser as any).github_username || publicUser.username,
      display_name: publicUser.display_name,
      avatar_url: publicUser.avatar_url,
      joined_at: publicUser.joined_at,
      is_public: publicUser.is_public,
    },
    stats: latestStats || null,
  }
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await getUserProfile(params.username)

  if (!profile || !profile.stats) {
    return {
      title: `@${params.username} - DevArena`,
    }
  }

  const commits = profile.stats.all_time_commits || 0
  const username = profile.user.username

  return {
    title: `@${username} - DevArena`,
    description: `View @${username}'s coding stats and leaderboard ranking on DevArena`,
    openGraph: {
      title: `@${username} - DevArena`,
      description: `View @${username}'s coding stats and leaderboard ranking on DevArena`,
      url: `${process.env.NEXTAUTH_URL}/u/${params.username}`,
      siteName: 'DevArena',
      images: [
        {
          url: `${process.env.NEXTAUTH_URL}/u/${params.username}/og`,
          width: 1200,
          height: 630,
          alt: `@${username}'s DevArena profile`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `@${username} - DevArena`,
      description: `View @${username}'s coding stats and leaderboard ranking on DevArena`,
      images: [`${process.env.NEXTAUTH_URL}/u/${params.username}/og`],
    },
  }
}

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const profile = await getUserProfile(params.username)

  if (!profile) {
    notFound()
  }

  const { user, stats } = profile
  const ranks = await getUserRanks(user.id)
  const joinOrder = await getUserJoinOrder(user.id)

  const joinedDate = new Date(user.joined_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Get daily breakdown for activity chart
  const dailyData = stats?.daily_breakdown && Array.isArray(stats.daily_breakdown) 
    ? stats.daily_breakdown.slice(-7) 
    : []

  // Get language breakdown for language chart
  const languageData = stats?.language_breakdown && Array.isArray(stats.language_breakdown)
    ? stats.language_breakdown
    : []

  const totalContributions = stats?.week_contributions || 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User Info */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center lg:items-start mb-6">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarImage src={user.avatar_url || `https://github.com/${user.username}.png`} alt={user.username} />
                  <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-1">{user.username}</h1>
                <div className="text-sm text-foreground/70 mb-4">@{user.username}</div>
                <div className="text-xs text-foreground/70 mb-4">
                  {joinOrder && `User #${joinOrder} • `}
                  Joined {joinedDate}
                </div>
                <Button variant="outline" asChild>
                  <a
                    href={`https://github.com/${user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub →
                  </a>
                </Button>
              </div>

              {(ranks.week || ranks.month || ranks.allTime) && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    {ranks.week && (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="text-sm cursor-help">
                            <span className="text-foreground/70">This Week: </span>
                            <span className="font-mono font-semibold">#{ranks.week}</span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Weekly Rank</h4>
                            <p className="text-sm text-foreground/80">
                              Your position among all builders this week, ranked by builder score.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                    {ranks.month && (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="text-sm cursor-help">
                            <span className="text-foreground/70">This Month: </span>
                            <span className="font-mono font-semibold">#{ranks.month}</span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Monthly Rank</h4>
                            <p className="text-sm text-foreground/80">
                              Your position among all builders this month, ranked by builder score.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                    {ranks.allTime && (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="text-sm cursor-help">
                            <span className="text-foreground/70">All Time: </span>
                            <span className="font-mono font-semibold">#{ranks.allTime}</span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">All-Time Rank</h4>
                            <p className="text-sm text-foreground/80">
                              Your position among all builders across all time, ranked by builder score.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Stats */}
          <div className="lg:col-span-2 space-y-8">
            {/* Big Stat Card */}
            {stats && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground/80">Total Commits This Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-5xl font-bold">
                    {stats.year_commits?.toLocaleString() || stats.all_time_commits?.toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contribution Breakdown - This Week */}
            {stats && (stats.week_contributions || stats.week_commits || stats.week_prs) && (
              <Card>
                <CardHeader>
                  <CardTitle>This Week Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="COMMITS" value={`${stats.week_commits || 0}`} />
                    <StatCard label="PRs" value={`${stats.week_prs || 0}`} />
                    <StatCard label="PR REVIEWS" value={`${stats.week_pr_reviews || 0}`} />
                    <StatCard label="ISSUES" value={`${stats.week_issues || 0}`} />
                    <StatCard label="TOTAL" value={`${stats.week_contributions || 0}`} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Stats */}
            {stats && (stats.github_followers !== null || stats.github_stars !== null || stats.streak_days !== null || stats.github_streak_days !== null) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.github_followers !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">Followers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-2xl font-bold">{stats.github_followers.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                )}
                {stats.github_stars !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">Stars</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-2xl font-bold">{stats.github_stars.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                )}
                {(stats.streak_days !== null || stats.github_streak_days !== null) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">Streak</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="text-lg">
                        🔥 {(stats.streak_days || stats.github_streak_days || 0)}d
                      </Badge>
                    </CardContent>
                  </Card>
                )}
                {(stats.top_language || stats.github_top_language) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">Top Language</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="text-lg">
                        {stats.top_language || stats.github_top_language}
                      </Badge>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Stat Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Card className="cursor-help">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-mono font-bold">{stats?.week_commits?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">This Week</h4>
                    <p className="text-sm text-foreground/80">
                      Total GitHub commits from the last 7 days. This is the primary metric for weekly rankings.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Card className="cursor-help">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-mono font-bold">{stats?.month_commits?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">This Month</h4>
                    <p className="text-sm text-foreground/80">
                      Total GitHub commits from the last 30 days. Used for monthly and all-time rankings.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Card className="cursor-help">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">This Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-mono font-bold">{stats?.year_commits?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">This Year</h4>
                    <p className="text-sm text-foreground/80">
                      Total GitHub commits since January 1st of the current year. Shows annual contribution activity.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Card className="cursor-help">
                    <CardHeader>
                      <CardTitle className="text-sm text-foreground/80">All Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-mono font-bold">{stats?.all_time_commits?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">All Time</h4>
                    <p className="text-sm text-foreground/80">
                      Total GitHub commits across your entire GitHub history. This is your lifetime contribution count.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>

            {/* Charts */}
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
          </div>
        </div>
      </div>
    </div>
  )
}

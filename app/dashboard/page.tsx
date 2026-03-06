import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabase, createServerClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import DashboardControls from '@/app/components/DashboardControls'
import StatCard from '@/app/components/StatCard'
import ContributionBarChart from '@/app/components/charts/ContributionBarChart'
import LanguageDonutChart from '@/app/components/charts/LanguageDonutChart'

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
    .select('id, username, github_username, display_name, avatar_url, joined_at, is_public')
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
    },
    stats: latestStats || null,
  }
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

  const dashboardData = await getUserDashboardData(session.userId)
  const ranks = await getUserRanks(session.userId)
  const joinOrder = await getUserJoinOrder(session.userId)

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            Welcome back, {user.display_name || user.username}
          </h1>
          {joinOrder && (
            <Badge variant="secondary" className="text-sm">
              User #{joinOrder}
            </Badge>
          )}
        </div>

        {/* Rank Card */}
        {ranks.week && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm text-foreground/80">Your Rank This Week</CardTitle>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">How Rankings Work</h4>
                      <p className="text-sm text-muted-foreground">
                        Your rank is calculated by comparing your builder score against all public profiles. Rankings update hourly as new GitHub activity is synced.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold">#{ranks.week}</div>
              {(ranks.month || ranks.allTime) && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2 text-sm">
                    {ranks.month && (
                      <div>
                        <span className="text-foreground/70">This Month: </span>
                        <span className="font-mono font-semibold">#{ranks.month}</span>
                      </div>
                    )}
                    {ranks.allTime && (
                      <div>
                        <span className="text-foreground/70">All Time: </span>
                        <span className="font-mono font-semibold">#{ranks.allTime}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <DashboardControls 
          username={user.github_username || user.username || 'unknown'}
          isPublic={user.is_public}
        />

        {/* Big Stat Card */}
        {stats && (
          <Card className="mb-8 bg-primary/5 border-primary/20">
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
        {hasGitHub && (stats?.week_contributions || stats?.week_commits || stats?.week_prs) && (
          <Card className="mb-8">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Card className="cursor-help">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground/80">Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-3xl font-bold">{stats?.week_commits?.toLocaleString() || '0'}</div>
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
                  <CardTitle className="text-sm text-foreground/80">Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-3xl font-bold">{stats?.month_commits?.toLocaleString() || '0'}</div>
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
                  <div className="font-mono text-3xl font-bold">{stats?.year_commits?.toLocaleString() || '0'}</div>
                </CardContent>
              </Card>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">This Year</h4>
                <p className="text-sm text-foreground/80">
                  Total GitHub commits since January 1st of the current year. Shows your annual contribution activity.
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
                  <div className="font-mono text-3xl font-bold">{stats?.all_time_commits?.toLocaleString() || '0'}</div>
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
          <div className="mb-8">
            <ContributionBarChart data={dailyData.map((day: { date: string; count: number }) => ({
              date: day.date,
              count: day.count,
            }))} />
          </div>
        )}

        {languageData.length > 0 && (
          <div className="mb-8">
            <LanguageDonutChart 
              languages={languageData.map((lang: { name: string; size: number; percentage: number }) => ({
                name: lang.name,
                size: lang.size,
                percentage: lang.percentage,
              }))}
              totalContributions={totalContributions}
            />
          </div>
        )}
      </div>
    </div>
  )
}

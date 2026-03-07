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

  // Fetch next tier threshold if user has a league membership
  const nextTierInfo = leagueMembership
    ? await getNextTierThreshold(leagueMembership.tier)
    : null
  const userScore = stats?.week_score || 0
  const pointsToNext = nextTierInfo ? Math.max(0, nextTierInfo.minScore - userScore) : 0

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
          {user.user_number && (
            <Badge variant="secondary" className="text-sm">
              User #{user.user_number}
            </Badge>
          )}
        </div>

        {/* Score + Rank Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Builder Score */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="Builder Score This Week"
                  explanation="Calculated as: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5)."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-5xl font-bold">
                {(stats?.week_score ?? 0).toLocaleString()}
              </div>
              {stats?.month_score != null && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-foreground/70">This Month: </span>
                      <span className="font-mono font-semibold">{stats.month_score.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Rank */}
          {ranks.week && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground/80">
                  <InfoTooltip
                    label="Your Rank This Week"
                    explanation="Your current position on the global leaderboard, ranked by Builder Score. Updates every 6 hours."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-5xl font-bold">#{ranks.week}</div>
                {(ranks.month || ranks.allTime) && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-1 text-sm">
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
        </div>

        {/* League Tier */}
        {leagueMembership && activeSeason && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="Your League"
                  explanation="Monthly seasons where builders compete for tier placement. Tiers are assigned based on your percentile rank at the end of each season."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{getTierEmoji(leagueMembership.tier)}</span>
                <div>
                  <div className="text-2xl font-bold">{getTierLabel(leagueMembership.tier)}</div>
                  <LeagueBadge tier={leagueMembership.tier} className="mt-1" />
                </div>
              </div>

              {/* Promotion / Relegation banner */}
              {leagueMembership.promoted && (
                <div className="mb-4 px-4 py-2 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
                  ↑ Promoted to {getTierLabel(leagueMembership.tier)} this season
                </div>
              )}
              {leagueMembership.relegated && (
                <div className="mb-4 px-4 py-2 rounded-md bg-muted border text-muted-foreground text-sm">
                  ↓ Relegated from {previousMembership ? getTierLabel(previousMembership.tier) : 'higher tier'}
                </div>
              )}

              {/* Progress bar to next tier */}
              {nextTierInfo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <InfoTooltip
                        label={`Progress to ${getTierEmoji(nextTierInfo.nextTier)} ${getTierLabel(nextTierInfo.nextTier)}`}
                        explanation={`Points needed to reach the next tier before the season ends.`}
                      />
                    </span>
                    <span className="font-mono text-xs">{userScore} / {nextTierInfo.minScore}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, nextTierInfo.minScore > 0 ? (userScore / nextTierInfo.minScore) * 100 : 0)}%` }}
                    />
                  </div>
                  {pointsToNext > 0 && (
                    <p className="text-xs text-muted-foreground">
                      You need {pointsToNext.toLocaleString()} more points to reach {getTierEmoji(nextTierInfo.nextTier)} {getTierLabel(nextTierInfo.nextTier)}
                    </p>
                  )}
                </div>
              )}

              {/* Season countdown */}
              {(() => {
                const endsAt = new Date(activeSeason.ends_at)
                const diffMs = endsAt.getTime() - Date.now()
                const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
                return (
                  <Separator className="my-4" />
                )
              })()}
              <p className="text-xs text-muted-foreground">
                {activeSeason.name} · Ends in {Math.max(0, Math.ceil((new Date(activeSeason.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
              </p>
            </CardContent>
          </Card>
        )}

        <DashboardControls 
          username={user.github_username || user.username || 'unknown'}
          isPublic={user.is_public}
          rank={ranks.week}
          streak={stats?.streak_days || stats?.github_streak_days || null}
          league={leagueMembership ? `${getTierEmoji(leagueMembership.tier)} ${getTierLabel(leagueMembership.tier)}` : null}
          score={stats?.week_score || null}
        />

        {/* Total Commits Card */}
        {stats && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="Total Commits This Year"
                  explanation="Total GitHub commits since January 1st of the current year."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold">
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
                  <CardTitle className="text-sm text-foreground/80">
                    <InfoTooltip
                      label="Streak"
                      explanation="Consecutive days where you pushed at least one qualifying commit (5+ lines changed)."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StreakBadge days={stats.streak_days || stats.github_streak_days || 0} size="md" />
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="Week"
                  explanation="Total GitHub commits from the last 7 days. This is the primary metric for weekly rankings."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold">{stats?.week_commits?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="Month"
                  explanation="Total GitHub commits from the last 30 days. Used for monthly and all-time rankings."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold">{stats?.month_commits?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="This Year"
                  explanation="Total GitHub commits since January 1st of the current year. Shows your annual contribution activity."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold">{stats?.year_commits?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-foreground/80">
                <InfoTooltip
                  label="All Time"
                  explanation="Total GitHub commits across your entire GitHub history. This is your lifetime contribution count."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold">{stats?.all_time_commits?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
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

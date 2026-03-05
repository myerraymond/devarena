import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabase, createServerClient } from '@/lib/supabase'
import { formatHours } from '@/lib/utils'
import StatCard from '@/app/components/StatCard'
import DashboardControls from '@/app/components/DashboardControls'
import ContributionBarChart from '@/app/components/charts/ContributionBarChart'
import LanguageDonutChart from '@/app/components/charts/LanguageDonutChart'

export const revalidate = 60

async function getUserRanks(userId: string): Promise<{ week: number | null; month: number | null; allTime: number | null }> {
  // Get user's stats
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

  // Get all public users' latest stats
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

  // Group by user and get latest for each
  const userWeekScores = new Map<string, number>()
  const userMonthScores = new Map<string, number>()

  for (const snapshot of allSnapshots) {
    const uid = (snapshot.users as any).id
    if (!userWeekScores.has(uid)) {
      userWeekScores.set(uid, snapshot.week_score || 0)
      userMonthScores.set(uid, snapshot.month_score || 0)
    }
  }

  // Sort by week score
  const weekSorted = Array.from(userWeekScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)

  const weekRank = weekSorted.findIndex(([uid]) => uid === userId) + 1

  // Sort by month score
  const monthSorted = Array.from(userMonthScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)

  const monthRank = monthSorted.findIndex(([uid]) => uid === userId) + 1

  // All time uses month score
  const allTimeRank = monthRank

  return {
    week: weekRank > 0 ? weekRank : null,
    month: monthRank > 0 ? monthRank : null,
    allTime: allTimeRank > 0 ? allTimeRank : null,
  }
}

async function getUserJoinOrder(userId: string): Promise<number | null> {
  // Get user's joined_at timestamp
  const { data: user } = await supabase
    .from('users')
    .select('joined_at')
    .eq('id', userId)
    .single()

  if (!user || !user.joined_at) {
    return null
  }

  // Count how many users joined before this user
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .lt('joined_at', user.joined_at)

  if (error || count === null) {
    return null
  }

  // Join order is count + 1 (they are the next user after all those who joined before)
  return count + 1
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

  // Get latest stats snapshot
  const { data: latestStats } = await supabase
    .from('stats_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .single()

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
      <div className="min-h-screen bg-background text-primary-green p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="text-gray-500 font-mono">
            Error loading dashboard data.
          </div>
        </div>
      </div>
    )
  }

  const { user, stats } = dashboardData

  if (!stats) {
    return (
      <div className="min-h-screen bg-background text-primary-green p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-gray-500 font-mono text-center py-12">
            No stats available yet. Stats are synced hourly.
          </div>
          <DashboardControls 
            username={user.github_username || user.username || 'unknown'}
            isPublic={user.is_public}
          />
        </div>
      </div>
    )
  }

  const weekHours = (stats.week_total_seconds || 0) / 3600
  const monthHours = (stats.month_total_seconds || 0) / 3600
  const allTimeHours = (stats.all_time_seconds || 0) / 3600
  const dailyAvgHours = (stats.daily_average_seconds || 0) / 3600
  const hasGitHub = stats.github_commits !== null

  const joinedDate = new Date(user.joined_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Rank Banner */}
        <div className="mb-8 space-y-4">
          {joinOrder && (
            <div className="border-2 border-black bg-yellow p-4 shadow-neobrutalism">
              <div className="text-xl font-heading font-black text-black">
                YOU ARE USER #{joinOrder}
              </div>
              <div className="text-sm font-sans font-bold text-black mt-1">
                {joinOrder === 1 ? 'The first builder!' : `Joined as the ${joinOrder}${joinOrder === 2 ? 'nd' : joinOrder === 3 ? 'rd' : 'th'} user`}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <DashboardControls 
          username={user.github_username || user.username || 'unknown'}
          isPublic={user.is_public}
        />

        {/* Top Section */}
        <div className="mb-8 border-2 border-black bg-white p-6 shadow-neobrutalism">
          <div className="flex items-center gap-6">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-24 h-24 rounded-base border-2 border-black"
              />
            ) : (
              <div className="w-24 h-24 rounded-base border-2 border-black bg-white flex items-center justify-center font-heading text-3xl font-black text-black">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-heading font-black text-black mb-2">
                {user.username}
              </h1>
              <div className="text-black font-sans font-bold mb-1">@{user.username}</div>
              <div className="text-black font-sans text-sm mb-4">joined {joinedDate}</div>
              
              {/* Rankings */}
              <div className="flex gap-4 flex-wrap">
                {ranks.week && (
                  <div className="border-2 border-black bg-blue px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
                    #{ranks.week} THIS WEEK
                  </div>
                )}
                {ranks.month && (
                  <div className="border-2 border-black bg-green px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
                    #{ranks.month} THIS MONTH
                  </div>
                )}
                {ranks.allTime && (
                  <div className="border-2 border-black bg-yellow px-4 py-2 text-black font-sans font-bold shadow-neobrutalism">
                    #{ranks.allTime} ALL TIME
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Big Stat */}
        <div className="mb-8 border-2 border-black bg-yellow p-8 shadow-neobrutalism">
          {hasGitHub ? (
            <>
              <div className="text-7xl font-heading font-black text-black mb-2">
                {stats.year_commits ? `${stats.year_commits.toLocaleString()}` : (stats.all_time_commits ? `${stats.all_time_commits.toLocaleString()}` : '0')}
              </div>
              <div className="text-black font-sans font-bold text-lg">
                {stats.year_commits ? 'commits this year' : (stats.all_time_commits ? 'all-time commits' : 'no stats yet')}
              </div>
            </>
          ) : (
            <>
              <div className="text-7xl font-heading font-black text-black mb-2">
                —
              </div>
              <div className="text-black font-sans font-bold text-lg">no stats yet</div>
            </>
          )}
        </div>

        {/* Stat Cards - Commit Timeframes */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {hasGitHub ? (
            <>
              <StatCard label="THIS WEEK" value={`${stats.week_commits || 0}`} accentColor="blue" />
              <StatCard label="THIS MONTH" value={`${stats.month_commits || 0}`} accentColor="green" />
              <StatCard label="THIS YEAR" value={`${stats.year_commits || 0}`} accentColor="yellow" />
              <StatCard label="ALL TIME" value={`${stats.all_time_commits || 0}`} accentColor="red" />
            </>
          ) : (
            <>
              <StatCard label="—" value="—" accentColor="blue" />
              <StatCard label="—" value="—" accentColor="green" />
              <StatCard label="—" value="—" accentColor="yellow" />
              <StatCard label="—" value="—" accentColor="red" />
            </>
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {hasGitHub ? (
            <>
              <StatCard label="FOLLOWERS" value={`${stats.github_followers || 0}`} accentColor="blue" />
              <StatCard label="STARS" value={`${stats.github_stars || 0}`} accentColor="green" />
              <StatCard label="STREAK" value={`${stats.github_streak_days || stats.streak_days || 0}d`} accentColor="yellow" />
              <StatCard label="REPOS" value={`${stats.github_public_repos || 0}`} accentColor="red" />
            </>
          ) : (
            <>
              <StatCard label="—" value="—" accentColor="blue" />
              <StatCard label="—" value="—" accentColor="green" />
              <StatCard label="—" value="—" accentColor="yellow" />
              <StatCard label="—" value="—" accentColor="red" />
            </>
          )}
        </div>

        {/* Streak and Badges */}
        <div className="flex gap-4 mb-8 flex-wrap">
          {stats.streak_days && stats.streak_days > 0 && (
            <div className="border-2 border-black bg-red px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
              🔥 {stats.streak_days} day streak
            </div>
          )}
          {stats.top_language && (
            <div className="border-2 border-black bg-blue px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
              {stats.top_language}
            </div>
          )}
          {stats.top_project && (
            <div className="border-2 border-black bg-green px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
              {stats.top_project}
            </div>
          )}
        </div>

        {/* Daily Chart */}
        {stats.daily_breakdown && Array.isArray(stats.daily_breakdown) && stats.daily_breakdown.length > 0 && (
          <div className="mb-8">
            <ContributionBarChart data={stats.daily_breakdown as Array<{ date: string; count: number }>} />
          </div>
        )}

        {/* Language Chart */}
        {stats.language_breakdown && Array.isArray(stats.language_breakdown) && stats.language_breakdown.length > 0 && (
          <div className="mb-8">
            <LanguageDonutChart 
              languages={stats.language_breakdown as Array<{ name: string; percentage: number; size: number }>}
              totalContributions={(stats.week_commits || 0) + (stats.week_prs || 0)}
            />
          </div>
        )}

        {/* Verified Badge */}
        {hasGitHub && (
          <div className="flex items-center gap-2 text-black font-sans font-bold border-2 border-black bg-white px-4 py-2 shadow-neobrutalism inline-block">
            <span className="text-black">✓</span>
            <span>VERIFIED VIA GITHUB</span>
          </div>
        )}
      </div>
    </div>
  )
}

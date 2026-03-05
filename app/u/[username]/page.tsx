import { notFound } from 'next/navigation'
import { supabase, createServerClient } from '@/lib/supabase'
import { formatHours } from '@/lib/utils'
import StatCard from '@/app/components/StatCard'
import ContributionBarChart from '@/app/components/charts/ContributionBarChart'
import LanguageDonutChart from '@/app/components/charts/LanguageDonutChart'
import ActivityBarChart from '@/app/components/charts/ActivityBarChart'
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

async function getUserProfile(username: string): Promise<{ user: UserProfile; stats: UserStats | null } | null> {
  // First check by github_username, then fallback to username
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('id, username, github_username, display_name, avatar_url, joined_at, is_public')
    .or(`github_username.eq.${username},username.eq.${username}`)
    .eq('is_public', true)
    .single()

  if (publicError || !publicUser) {
    return null
  }

  // Get latest stats snapshot (public data)
  const { data: latestStats, error: statsError } = await supabase
    .from('stats_snapshots')
    .select('*')
    .eq('user_id', publicUser.id)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  // Log error for debugging
  if (statsError) {
    console.error('Error fetching stats:', statsError)
  }

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

  const commits = profile.stats.github_commits || 0
  const username = profile.user.username

  return {
    title: `@${username} has ${commits} commits on DevArena`,
    description: `View @${username}'s coding stats and leaderboard ranking on DevArena`,
    openGraph: {
      title: `@${username} has ${commits} commits on DevArena`,
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
      title: `@${username} has ${commits} commits on DevArena`,
      description: `View @${username}'s coding stats and leaderboard ranking on DevArena`,
      images: [`${process.env.NEXTAUTH_URL}/u/${params.username}/og`],
    },
  }
}

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const profile = await getUserProfile(params.username)

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-primary-green p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-2xl mb-4">
            <span className="text-primary-amber">$</span> user not found
          </div>
          <div className="text-gray-500 font-mono mb-8">
            User <span className="text-primary-green">@{params.username}</span> does not exist
          </div>
          <div className="text-gray-600 font-mono text-sm">
            <span className="text-primary-amber">404</span> - Page not found
          </div>
        </div>
      </div>
    )
  }

  const { user, stats } = profile
  const ranks = await getUserRanks(user.id)
  const joinOrder = await getUserJoinOrder(user.id)

  // Show profile even if no stats yet - display zeros
  const hasStats = stats && (
    (stats.week_total_seconds && stats.week_total_seconds > 0) ||
    (stats.github_commits && stats.github_commits > 0) ||
    (stats.month_total_seconds && stats.month_total_seconds > 0) ||
    (stats.all_time_seconds && stats.all_time_seconds > 0)
  )

  const joinedDate = new Date(user.joined_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
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
              <div className="text-black font-sans text-sm mb-4">
                {joinOrder && (
                  <>
                    <span className="font-bold">USER #{joinOrder}</span>
                    {' • '}
                  </>
                )}
                joined {joinedDate}
              </div>
              
              {/* GitHub Link */}
              <div className="mb-4">
                <a
                  href={`https://github.com/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block border-2 border-black bg-black text-white px-4 py-2 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
                >
                  VIEW ON GITHUB →
                </a>
              </div>
              
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

        {/* Big Stat - Yellow Hero Card */}
        <div className="mb-8 border-2 border-black bg-yellow p-8 shadow-neobrutalism">
          {hasStats ? (
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
              <div className="text-black font-sans font-bold text-lg">No stats yet</div>
            </>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats && (stats.week_commits || stats.month_commits || stats.year_commits || stats.all_time_commits) ? (
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
          {stats && (stats.github_followers || stats.github_stars || stats.github_streak_days) ? (
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
        {stats && (
          <div className="flex gap-4 mb-8 flex-wrap">
            {(stats.streak_days && stats.streak_days > 0) || (stats.github_streak_days && stats.github_streak_days > 0) ? (
              <div className="border-2 border-black bg-red px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
                🔥 {stats.streak_days || stats.github_streak_days || 0} day streak
              </div>
            ) : null}
            {(stats.top_language || stats.github_top_language) && (
              <div className="border-2 border-black bg-blue px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
                {stats.top_language || stats.github_top_language}
              </div>
            )}
            {stats.top_project && (
              <div className="border-2 border-black bg-green px-4 py-2 text-white font-sans font-bold shadow-neobrutalism">
                {stats.top_project}
              </div>
            )}
          </div>
        )}

        {/* Daily Chart */}
        {stats && stats.daily_breakdown && Array.isArray(stats.daily_breakdown) && stats.daily_breakdown.length > 0 && (
          <div className="mb-8">
            <ContributionBarChart data={stats.daily_breakdown as Array<{ date: string; count: number }>} />
          </div>
        )}

        {/* Language Chart */}
        {stats && stats.language_breakdown && Array.isArray(stats.language_breakdown) && stats.language_breakdown.length > 0 && (
          <div className="mb-8">
            <LanguageDonutChart 
              languages={stats.language_breakdown as Array<{ name: string; percentage: number; size: number }>}
              totalContributions={(stats.week_commits || 0) + (stats.week_prs || 0)}
            />
          </div>
        )}

        {/* Verified Badge */}
        {stats && stats.github_commits && (
          <div className="flex items-center gap-2 text-black font-sans font-bold border-2 border-black bg-white px-4 py-2 shadow-neobrutalism inline-block">
            <span className="text-black">✓</span>
            <span>VERIFIED VIA GITHUB</span>
          </div>
        )}
      </div>
    </div>
  )
}

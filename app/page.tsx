import { supabase } from '@/lib/supabase'
import { isActive } from '@/lib/utils'
import LeaderboardTabs from './components/LeaderboardTabs'
import LeaderboardTable from './components/LeaderboardTable'
import BlinkingCursor from './components/BlinkingCursor'
import ConnectCTA from './components/ConnectCTA'
import LeaderboardClient from './components/LeaderboardClient'

export const revalidate = 60

type Timeframe = 'week' | 'month' | 'alltime'

export interface LeaderboardData {
  rank: number
  username: string
  display_name: string | null
  weekHours: number
  monthHours: number
  allTimeHours: number
  weekScore: number | null
  monthScore: number | null
  weekCommits: number | null
  monthCommits: number | null
  yearCommits: number | null
  allTimeCommits: number | null
  commits: number | null // Deprecated - use weekCommits/monthCommits/yearCommits/allTimeCommits
  streak: number | null
  top_language: string | null
  followers: number | null
  stars: number | null
  publicRepos: number | null
  is_active: boolean
}

interface UserData {
  username: string | null
  github_username: string | null
  display_name: string | null
  is_public: boolean
}

interface SnapshotWithUser {
  user_id: string
  week_total_seconds: number | null
  month_total_seconds: number | null
  all_time_seconds: number | null
  week_score: number | null
  month_score: number | null
  week_commits: number | null
  month_commits: number | null
  year_commits: number | null
  all_time_commits: number | null
  week_prs: number | null
  streak_days: number | null
  top_language: string | null
  github_commits: number | null
  github_streak_days: number | null
  github_top_language: string | null
  github_followers: number | null
  github_stars: number | null
  github_public_repos: number | null
  snapshotted_at: string
  users: UserData
}

async function getAllLeaderboardData(): Promise<{ data: LeaderboardData[]; isCached: boolean }> {
  try {
    // Get the latest snapshot for each user using a subquery approach
    const { data: latestSnapshots, error } = await supabase
      .from('stats_snapshots')
      .select('*, users!inner (username, github_username, display_name, is_public)')
      .eq('users.is_public', true)
      .order('snapshotted_at', { ascending: false })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return { data: [], isCached: false }
    }

    if (!latestSnapshots) {
      return { data: [], isCached: false }
    }

    // Group by user_id and get the latest snapshot for each user
    const userMap = new Map<string, SnapshotWithUser>()
    
    for (const snapshot of latestSnapshots) {
      if (!snapshot || typeof snapshot !== 'object' || !('user_id' in snapshot)) {
        continue
      }
      // Type guard: verify it has the required properties
      const typedSnapshot = snapshot as unknown as SnapshotWithUser
      const userId = typedSnapshot.user_id
      if (!userId || !typedSnapshot.snapshotted_at) {
        continue
      }
      if (!userMap.has(userId) || 
          new Date(typedSnapshot.snapshotted_at) > new Date(userMap.get(userId)!.snapshotted_at)) {
        userMap.set(userId, typedSnapshot)
      }
    }

    // Convert to leaderboard format with all timeframes
    const leaderboard: LeaderboardData[] = Array.from(userMap.values())
      .map((snapshot) => {
      return {
        rank: 0, // Will be set after sorting
        username: (snapshot.users as any).github_username || snapshot.users.username || 'unknown',
        display_name: snapshot.users.display_name,
        weekHours: snapshot.week_total_seconds || 0,
        monthHours: snapshot.month_total_seconds || 0,
        allTimeHours: snapshot.all_time_seconds || 0,
        weekScore: snapshot.week_score ?? 0, // Use 0 instead of null
        monthScore: snapshot.month_score ?? 0, // Use 0 instead of null
        weekCommits: snapshot.week_commits || null,
        monthCommits: snapshot.month_commits || null,
        yearCommits: snapshot.year_commits || null,
        allTimeCommits: snapshot.all_time_commits || snapshot.github_commits || null,
        commits: snapshot.week_commits || snapshot.github_commits || null, // Keep for backwards compatibility
        streak: snapshot.streak_days || snapshot.github_streak_days || null,
        top_language: snapshot.top_language || snapshot.github_top_language || null,
        followers: snapshot.github_followers || null,
        stars: snapshot.github_stars || null,
        publicRepos: snapshot.github_public_repos || null,
        is_active: isActive(snapshot.snapshotted_at),
      }
      })
      // Show all users with stats snapshots, even if scores are 0
      .filter((entry) => entry.commits !== null || entry.weekScore > 0 || entry.monthScore > 0)

    return { data: leaderboard, isCached: false }
  } catch (error) {
    console.error('Error fetching leaderboard, using cached data:', error)
    // Return empty array with cached flag - in production you'd fetch from cache
    return { data: [], isCached: true }
  }
}

interface HomeProps {
  searchParams: { timeframe?: string }
}

export default async function Home({ searchParams }: HomeProps) {
  const timeframe = (searchParams.timeframe as Timeframe) || 'week'
  const { data: allLeaderboardData, isCached } = await getAllLeaderboardData()

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black text-black mb-2">
            WHO'S BUILDING?
          </h1>
          <p className="text-lg font-sans font-bold text-black">
            Verified builder hours. No excuses.
          </p>
        </header>

        {/* Tabs and Table - Client component handles interactivity */}
        <LeaderboardClient 
          data={allLeaderboardData} 
          timeframe={timeframe}
          isCached={isCached}
        />
      </div>

      {/* Floating CTA */}
      <ConnectCTA />
    </main>
  )
}

import { supabase } from '@/lib/supabase'
import { isActive } from '@/lib/utils'
import LeaderboardTabs from './components/LeaderboardTabs'
import LeaderboardTable from './components/LeaderboardTable'
import BlinkingCursor from './components/BlinkingCursor'
import ConnectCTA from './components/ConnectCTA'
import LeaderboardClient from './components/LeaderboardClient'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { getKingsMap } from '@/lib/language-kings'
import { getLeagueTiersMap } from '@/lib/leagues'
import { getFeedEvents } from '@/lib/feed'
import LiveFeedSidebar from '@/components/live-feed-sidebar'

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
  score?: number // Computed timeframe-specific score (set during sorting)
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

async function getUserCounts(): Promise<{ week: number; month: number; allTime: number }> {
  try {
    // Get the latest snapshot for each user
    const { data: latestSnapshots, error } = await supabase
      .from('stats_snapshots')
      .select('*, users!inner (username, github_username, display_name, is_public)')
      .eq('users.is_public', true)
      .order('snapshotted_at', { ascending: false })

    if (error || !latestSnapshots) {
      return { week: 0, month: 0, allTime: 0 }
    }

    // Group by user_id and get the latest snapshot for each user
    const userMap = new Map<string, SnapshotWithUser>()
    
    for (const snapshot of latestSnapshots) {
      if (!snapshot || typeof snapshot !== 'object' || !('user_id' in snapshot)) {
        continue
      }
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

    // Count users with activity for each timeframe
    let weekCount = 0
    let monthCount = 0
    let allTimeCount = 0

    for (const snapshot of userMap.values()) {
      const weekCommits = snapshot.week_commits ?? 0
      const monthCommits = snapshot.month_commits ?? 0
      const allTimeCommits = snapshot.all_time_commits ?? snapshot.github_commits ?? 0
      const weekScore = snapshot.week_score ?? 0
      const monthScore = snapshot.month_score ?? 0
      
      // Week: users with week commits > 0 or week score > 0
      if (weekCommits > 0 || weekScore > 0) {
        weekCount++
      }
      
      // Month: users with month commits > 0 or month score > 0
      if (monthCommits > 0 || monthScore > 0) {
        monthCount++
      }
      
      // All time: users with any commits > 0 or any score > 0
      if (allTimeCommits > 0 || weekScore > 0 || monthScore > 0) {
        allTimeCount++
      }
    }

    return { week: weekCount, month: monthCount, allTime: allTimeCount }
  } catch (error) {
    console.error('Error counting users:', error)
    return { week: 0, month: 0, allTime: 0 }
  }
}

async function getInitialLeaderboardData(timeframe: Timeframe): Promise<{ data: LeaderboardData[]; isCached: boolean }> {
  try {
    // Get the latest snapshot for each user
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

    // Convert to leaderboard format
    const leaderboard: LeaderboardData[] = Array.from(userMap.values())
      .map((snapshot) => {
        return {
          rank: 0,
          username: (snapshot.users as any).github_username || snapshot.users.username || 'unknown',
          display_name: snapshot.users.display_name,
          weekHours: snapshot.week_total_seconds || 0,
          monthHours: snapshot.month_total_seconds || 0,
          allTimeHours: snapshot.all_time_seconds || 0,
          weekScore: snapshot.week_score ?? 0,
          monthScore: snapshot.month_score ?? 0,
          weekCommits: snapshot.week_commits || null,
          monthCommits: snapshot.month_commits || null,
          yearCommits: snapshot.year_commits || null,
          allTimeCommits: snapshot.all_time_commits || snapshot.github_commits || null,
          commits: snapshot.week_commits || snapshot.github_commits || null,
          streak: snapshot.streak_days || snapshot.github_streak_days || null,
          top_language: snapshot.top_language || snapshot.github_top_language || null,
          followers: snapshot.github_followers || null,
          stars: snapshot.github_stars || null,
          publicRepos: snapshot.github_public_repos || null,
          is_active: isActive(snapshot.snapshotted_at),
        }
      })
      .filter((entry) => entry.commits !== null || entry.weekScore > 0 || entry.monthScore > 0)

    // Sort by timeframe-specific score
    const sorted = leaderboard
      .map(entry => {
        let score = 0
        let commits = 0
        switch (timeframe) {
          case 'week':
            score = entry.weekScore ?? 0
            commits = entry.weekCommits || entry.commits || 0
            break
          case 'month':
            score = entry.monthScore ?? 0
            commits = entry.monthCommits || entry.commits || 0
            break
          case 'alltime':
            score = entry.monthScore ?? 0
            commits = entry.allTimeCommits || entry.yearCommits || entry.commits || 0
            break
        }
        return { ...entry, score, commits }
      })
      .sort((a, b) => {
        if (a.score === b.score) {
          return b.commits - a.commits
        }
        return b.score - a.score
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))

    // Return only first page (50 items)
    return { data: sorted.slice(0, 50), isCached: false }
  } catch (error) {
    console.error('Error fetching leaderboard, using cached data:', error)
    return { data: [], isCached: true }
  }
}

interface HomeProps {
  searchParams: { timeframe?: string }
}

export default async function Home({ searchParams }: HomeProps) {
  const timeframe = (searchParams.timeframe as Timeframe) || 'week'
  const [{ data: initialLeaderboardData, isCached }, userCounts, kingsMapRaw, leagueTiers, { events: feedEvents }] = await Promise.all([
    getInitialLeaderboardData(timeframe),
    getUserCounts(),
    getKingsMap(),
    getLeagueTiersMap(),
    getFeedEvents(20, 0),
  ])

  // Convert Map to plain object for serialization to client component
  const kingsRecord: Record<string, string[]> = Object.fromEntries(kingsMapRaw)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-8">
          {/* Main leaderboard content */}
          <div className="flex-1 min-w-0">
            <header className="mb-8">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    Leaderboard
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-foreground/60">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button className="hover:text-foreground transition-colors">
                          <span className="font-mono font-semibold text-foreground">{userCounts.week}</span> weekly
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Weekly Active Users</h4>
                          <p className="text-sm text-foreground/80">
                            {userCounts.week} builders with activity this week.
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <span>•</span>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button className="hover:text-foreground transition-colors">
                          <span className="font-mono font-semibold text-foreground">{userCounts.month}</span> monthly
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Monthly Active Users</h4>
                          <p className="text-sm text-foreground/80">
                            {userCounts.month} builders with activity this month.
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <span>•</span>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button className="hover:text-foreground transition-colors">
                          <span className="font-mono font-semibold text-foreground">{userCounts.allTime}</span> total
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">All-Time Users</h4>
                          <p className="text-sm text-foreground/80">
                            {userCounts.allTime} total builders who have ever contributed.
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground/80">
                Ranked by{' '}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button className="underline underline-offset-2 hover:text-foreground transition-colors">
                      builder score
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Builder Score</h4>
                      <p className="text-sm text-foreground/80">
                        A weighted metric calculated from your GitHub activity:
                      </p>
                      <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                        <li>Commits × 1</li>
                        <li>PRs opened × 2</li>
                        <li>PRs merged × 4</li>
                        <li>Active days × 3</li>
                        <li>Repos contributed to × 5</li>
                      </ul>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                . Updated hourly.
              </p>
            </header>

            <LeaderboardClient 
              data={initialLeaderboardData} 
              timeframe={timeframe}
              isCached={isCached}
              languageKings={kingsRecord}
              leagueTiers={leagueTiers}
            />
          </div>

          {/* Live Feed sidebar — desktop only */}
          <LiveFeedSidebar initialEvents={feedEvents} />
        </div>
      </div>

      <ConnectCTA />
    </main>
  )
}

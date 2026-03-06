import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isActive } from '@/lib/utils'

export const revalidate = 60

type Timeframe = 'week' | 'month' | 'alltime'

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
  commits: number | null
  streak: number | null
  top_language: string | null
  followers: number | null
  stars: number | null
  publicRepos: number | null
  is_active: boolean
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeframe = (searchParams.get('timeframe') as Timeframe) || 'week'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Get the latest snapshot for each user
    const { data: latestSnapshots, error } = await supabase
      .from('stats_snapshots')
      .select('*, users!inner (username, github_username, display_name, is_public)')
      .eq('users.is_public', true)
      .order('snapshotted_at', { ascending: false })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    if (!latestSnapshots) {
      return NextResponse.json({ data: [], hasMore: false, page, total: 0 })
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
          rank: 0, // Will be set after sorting
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

    // Paginate
    const paginated = sorted.slice(offset, offset + limit)
    const hasMore = offset + limit < sorted.length

    return NextResponse.json({
      data: paginated,
      hasMore,
      page,
      total: sorted.length,
    })
  } catch (error) {
    console.error('Error fetching paginated leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}

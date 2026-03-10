import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { getGitHubStats } from '@/lib/github'
import { insertFeedEvent } from '@/lib/feed'
const STREAK_MILESTONES = [100, 50, 30, 14, 7]

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      // Request body might be empty, that's okay
    }

    let userId = session?.userId

    // Allow internal server-to-server calls (e.g. from sign-in callback)
    if (!userId && body.userId) {
      const internalSecret = request.headers.get('x-internal-secret')
      if (internalSecret === process.env.NEXTAUTH_SECRET) {
        userId = body.userId as string
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, github_access_token, github_username')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.github_access_token) {
      return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 })
    }

    const stats = await getGitHubStats(user.github_access_token)

    // Get existing snapshot
    const { data: existingSnapshot } = await supabase
      .from('stats_snapshots')
      .select('id, streak_days, github_streak_days')
      .eq('user_id', user.id)
      .order('snapshotted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const dailyBreakdown = Array.isArray(stats.dailyBreakdown) ? stats.dailyBreakdown : []
    const languageBreakdown = Array.isArray(stats.languageBreakdown) ? stats.languageBreakdown : []

    const snapshotData: Record<string, unknown> = {
      user_id: user.id,
      week_score: stats.weekScore || 0,
      month_score: stats.monthScore || 0,
      week_commits: stats.weekCommits || 0,
      week_prs: stats.weekPRs || 0,
      week_pr_reviews: stats.weekPRReviews || 0,
      week_issues: stats.weekIssues || 0,
      week_contributions: stats.weekContributions || 0,
      month_commits: stats.monthCommits || 0,
      month_prs: stats.monthPRs || 0,
      month_pr_reviews: stats.monthPRReviews || 0,
      month_issues: stats.monthIssues || 0,
      month_contributions: stats.monthContributions || 0,
      year_commits: stats.yearCommits || 0,
      all_time_commits: stats.allTimeCommits || 0,
      all_time_contributions: stats.allTimeContributions || 0,
      github_commits: stats.allTimeCommits || stats.monthCommits || 0,
      github_streak_days: stats.streak || 0,
      github_top_language: stats.topLanguage || null,
      github_followers: stats.followers || 0,
      github_following: stats.following || 0,
      github_public_repos: stats.publicRepos || 0,
      github_stars: stats.stars || 0,
      week_total_seconds: null,
      month_total_seconds: null,
      all_time_seconds: null,
      top_language: stats.topLanguage || null,
      daily_average_seconds: null,
      streak_days: stats.streak || 0,
      snapshotted_at: new Date().toISOString(),
    }

    if (dailyBreakdown.length > 0) {
      snapshotData.daily_breakdown = dailyBreakdown
    }
    if (languageBreakdown.length > 0) {
      snapshotData.language_breakdown = languageBreakdown
    }

    const { error: upsertError } = existingSnapshot
      ? await supabase
          .from('stats_snapshots')
          .update(snapshotData)
          .eq('id', existingSnapshot.id)
      : await supabase
          .from('stats_snapshots')
          .insert(snapshotData)

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
    }

    // Generate feed events
    try {
      const currentStreak = stats.streak || 0
      const prevStreakDays = existingSnapshot
        ? (existingSnapshot.streak_days || existingSnapshot.github_streak_days || 0)
        : 0

      if (!existingSnapshot) {
        await insertFeedEvent(user.id, 'first_commit', {})
      }

      if (currentStreak > prevStreakDays) {
        for (const milestone of STREAK_MILESTONES) {
          if (currentStreak >= milestone && prevStreakDays < milestone) {
            await insertFeedEvent(user.id, 'streak_milestone', {
              streak_days: milestone,
            })
            break
          }
        }
      }
    } catch {
      // Feed events are non-critical
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

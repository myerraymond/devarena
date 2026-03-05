import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { getGitHubStats } from '@/lib/github'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    let body = {}
    try {
      body = await request.json()
    } catch (e) {
      // Request body might be empty, that's okay
    }
    const userId = session?.userId || body.userId

    if (!userId) {
      console.error('GitHub sync: No userId found', { session: !!session, body })
      return NextResponse.json({ error: 'Unauthorized - No user ID' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get user with GitHub token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, github_access_token, github_username')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('GitHub sync: User query error', userError)
      return NextResponse.json({ error: `User query failed: ${userError.message}` }, { status: 404 })
    }

    if (!user) {
      console.error('GitHub sync: User not found', { userId })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.github_access_token) {
      console.error('GitHub sync: No GitHub token', { userId, hasToken: !!user.github_access_token })
      return NextResponse.json({ error: 'No GitHub access token' }, { status: 404 })
    }

    // Fetch GitHub stats with builder score
    console.log('GitHub sync: Fetching stats for user', { userId: user.id, username: user.github_username })
    const stats = await getGitHubStats(user.github_access_token)
    console.log('GitHub sync: Stats fetched successfully', { weekScore: stats.weekScore, monthScore: stats.monthScore })

    // Get existing snapshot to update, or create new one
    const { data: existingSnapshot } = await supabase
      .from('stats_snapshots')
      .select('id')
      .eq('user_id', user.id)
      .order('snapshotted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Ensure JSONB fields are properly formatted
    const dailyBreakdown = Array.isArray(stats.dailyBreakdown) ? stats.dailyBreakdown : []
    const languageBreakdown = Array.isArray(stats.languageBreakdown) ? stats.languageBreakdown : []

    const snapshotData: any = {
      user_id: user.id,
      week_score: stats.weekScore || 0,
      month_score: stats.monthScore || 0,
      week_commits: stats.weekCommits || 0,
      week_prs: stats.weekPRs || 0,
      month_commits: stats.monthCommits || 0,
      month_prs: stats.monthPRs || 0,
      year_commits: stats.yearCommits || 0,
      all_time_commits: stats.allTimeCommits || 0,
      github_commits: stats.allTimeCommits || stats.monthCommits || 0, // Use all-time if available, fallback to month
      github_streak_days: stats.streak || 0,
      github_top_language: stats.topLanguage || null,
      github_followers: stats.followers || 0,
      github_following: stats.following || 0,
      github_public_repos: stats.publicRepos || 0,
      github_stars: stats.stars || 0,
      week_total_seconds: null, // GitHub users don't have hours
      month_total_seconds: null,
      all_time_seconds: null,
      top_language: stats.topLanguage || null,
      daily_average_seconds: null,
      streak_days: stats.streak || 0,
      snapshotted_at: new Date().toISOString(),
    }

    // Only include JSONB fields if columns exist (will be added via migration)
    // Try to include them - if migration is run, they'll work; if not, we'll get an error
    // but at least the core stats will save
    if (dailyBreakdown.length > 0) {
      snapshotData.daily_breakdown = dailyBreakdown
    }
    if (languageBreakdown.length > 0) {
      snapshotData.language_breakdown = languageBreakdown
    }

    console.log('GitHub sync: Prepared snapshot data', { 
      userId: user.id, 
      weekScore: snapshotData.week_score,
      hasDailyBreakdown: dailyBreakdown.length > 0,
      hasLanguageBreakdown: languageBreakdown.length > 0
    })

    // Upsert stats snapshot
    const { error: upsertError } = existingSnapshot
      ? await supabase
          .from('stats_snapshots')
          .update(snapshotData)
          .eq('id', existingSnapshot.id)
      : await supabase
          .from('stats_snapshots')
          .insert(snapshotData)

    if (upsertError) {
      console.error('GitHub sync: Upsert error', upsertError)
      return NextResponse.json({ 
        error: 'Failed to save stats',
        details: upsertError.message 
      }, { status: 500 })
    }

    console.log('GitHub sync: Successfully saved stats', { userId: user.id })
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('GitHub sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Sync failed'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorCause = error instanceof Error && 'cause' in error ? error.cause : undefined
    console.error('Error details:', { errorMessage, errorStack, errorCause })
    return NextResponse.json({ 
      error: errorMessage,
      details: errorStack,
      cause: errorCause
    }, { status: 500 })
  }
}

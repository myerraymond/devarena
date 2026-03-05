import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { getWakaTimeStats, getWakaTimeMonthStats, getWakaTimeAllTime, refreshWakaTimeToken } from '@/lib/wakatime'

export async function POST(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Get user with tokens
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('wakatime_access_token, wakatime_refresh_token')
    .eq('id', session.userId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.wakatime_access_token) {
    return NextResponse.json({ error: 'No WakaTime token' }, { status: 400 })
  }

  try {
    let accessToken = user.wakatime_access_token

    // Fetch stats with retry on 401
    let stats
    let allTime

    try {
      stats = await getWakaTimeStats(accessToken)
      allTime = await getWakaTimeAllTime(accessToken)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // If 401, try refreshing token
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        if (!user.wakatime_refresh_token) {
          return NextResponse.json({ error: 'Token expired' }, { status: 401 })
        }

        const tokenResponse = await refreshWakaTimeToken(user.wakatime_refresh_token)
        accessToken = tokenResponse.access_token

        // Update tokens
        await supabase
          .from('users')
          .update({
            wakatime_access_token: tokenResponse.access_token,
            wakatime_refresh_token: tokenResponse.refresh_token,
          })
          .eq('id', session.userId)

        // Retry with new token
        stats = await getWakaTimeStats(accessToken)
        allTime = await getWakaTimeAllTime(accessToken)
      } else {
        throw error
      }
    }

    // Fetch month stats for accurate month calculation
    let monthStats
    try {
      monthStats = await getWakaTimeMonthStats(accessToken)
    } catch (error) {
      // If month stats fail, fall back to approximation
      console.warn('Failed to fetch month stats, using approximation:', error)
      monthStats = null
    }

    // Calculate stats
    const weekTotalSeconds = stats.data.total_seconds || 0
    const monthTotalSeconds = monthStats?.data.total_seconds || weekTotalSeconds * 4 // Fallback to approximation
    const allTimeSeconds = allTime.data.total_seconds || 0
    const dailyAverage = stats.data.daily_average || 0
    const topLanguage = stats.data.languages?.[0]?.name || null
    const topProject = stats.data.projects?.[0]?.name || null

    // Insert new stats snapshot
    const { error: insertError } = await supabase
      .from('stats_snapshots')
      .insert({
        user_id: session.userId,
        week_total_seconds: weekTotalSeconds,
        month_total_seconds: monthTotalSeconds,
        all_time_seconds: allTimeSeconds,
        top_language: topLanguage,
        top_project: topProject,
        daily_average_seconds: Math.round(dailyAverage),
        streak_days: null,
        snapshotted_at: new Date().toISOString(),
      })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

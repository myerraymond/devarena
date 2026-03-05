import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getWakaTimeStats, getWakaTimeMonthStats, getWakaTimeAllTime, refreshWakaTimeToken } from '@/lib/wakatime'

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabase = createServerClient()
  let syncedCount = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    // Fetch all users with access tokens
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, wakatime_access_token, wakatime_refresh_token')
      .not('wakatime_access_token', 'is', null)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        errors: 0,
        message: 'No users to sync',
      })
    }

    // Process each user
    for (const user of users) {
      try {
        let accessToken = user.wakatime_access_token!

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
              throw new Error('Token expired and no refresh token available')
            }

            // Refresh token
            const tokenResponse = await refreshWakaTimeToken(user.wakatime_refresh_token)
            accessToken = tokenResponse.access_token

            // Update tokens in database
            await supabase
              .from('users')
              .update({
                wakatime_access_token: tokenResponse.access_token,
                wakatime_refresh_token: tokenResponse.refresh_token,
              })
              .eq('id', user.id)

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
          console.warn(`Failed to fetch month stats for user ${user.id}, using approximation:`, error)
          monthStats = null
        }

        // Calculate stats
        const weekTotalSeconds = stats.data.total_seconds || 0
        const monthTotalSeconds = monthStats?.data.total_seconds || weekTotalSeconds * 4 // Fallback to approximation
        const allTimeSeconds = allTime.data.total_seconds || 0
        const dailyAverage = stats.data.daily_average || 0

        // Get top language and project
        const topLanguage = stats.data.languages?.[0]?.name || null
        const topProject = stats.data.projects?.[0]?.name || null

        // Insert new stats snapshot
        const { error: insertError } = await supabase
          .from('stats_snapshots')
          .insert({
            user_id: user.id,
            week_total_seconds: weekTotalSeconds,
            month_total_seconds: monthTotalSeconds,
            all_time_seconds: allTimeSeconds,
            top_language: topLanguage,
            top_project: topProject,
            daily_average_seconds: Math.round(dailyAverage),
            streak_days: null, // WakaTime doesn't provide streak in these endpoints
            snapshotted_at: new Date().toISOString(),
          })

        if (insertError) {
          throw new Error(`Failed to insert stats: ${insertError.message}`)
        }

        syncedCount++
      } catch (error) {
        errorCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`User ${user.id}: ${errorMessage}`)
        console.error(`Error syncing user ${user.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: users.length,
      errorDetails: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        synced: syncedCount,
        errors: errorCount,
      },
      { status: 500 }
    )
  }
}

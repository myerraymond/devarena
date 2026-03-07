import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getTierForPercentile } from '@/lib/leagues'
import type { LeagueTier } from '@/components/league-badge'

// Vercel Pro: allow up to 60s for league assignment
export const maxDuration = 60

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

  try {
    const now = new Date()
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]

    // ── Step 1: Close the previous active season ──
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSeason) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', activeSeason.id)
    }

    // ── Step 2: Create the new season ──
    const startsAt = new Date(now.getFullYear(), now.getMonth(), 1)
    const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Calculate season number based on how many seasons exist
    const { count: seasonCount } = await supabase
      .from('seasons')
      .select('*', { count: 'exact', head: true })

    const seasonNumber = (seasonCount || 0) + 1
    const seasonName = `Season ${seasonNumber} · ${monthNames[now.getMonth()]} ${now.getFullYear()}`

    const { data: newSeason, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        name: seasonName,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (seasonError || !newSeason) {
      throw new Error(`Failed to create season: ${seasonError?.message}`)
    }

    // ── Step 3: Rank all users by their week_score ──
    const { data: snapshots, error: snapshotError } = await supabase
      .from('stats_snapshots')
      .select(`
        user_id,
        week_score,
        snapshotted_at,
        users!inner (
          id,
          is_public
        )
      `)
      .eq('users.is_public', true)
      .order('snapshotted_at', { ascending: false })

    if (snapshotError) {
      throw new Error(`Failed to fetch snapshots: ${snapshotError.message}`)
    }

    // Get latest snapshot per user
    const userScores = new Map<string, number>()
    if (snapshots) {
      for (const snapshot of snapshots) {
        const userId = snapshot.user_id as string
        if (!userId) continue
        if (!userScores.has(userId)) {
          userScores.set(userId, snapshot.week_score || 0)
        }
      }
    }

    // Filter out users with zero score
    const rankedUsers = Array.from(userScores.entries())
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])

    const totalUsers = rankedUsers.length

    if (totalUsers === 0) {
      return NextResponse.json({
        success: true,
        season: seasonName,
        assigned: 0,
        message: 'No active users to assign',
      })
    }

    // ── Step 4: Get previous season memberships for promo/relegation detection ──
    const previousMemberships = new Map<string, LeagueTier>()
    if (activeSeason) {
      const { data: prevMembers } = await supabase
        .from('league_memberships')
        .select('user_id, tier')
        .eq('season_id', activeSeason.id)

      if (prevMembers) {
        for (const m of prevMembers) {
          previousMemberships.set(m.user_id, m.tier as LeagueTier)
        }
      }
    }

    // ── Step 5: Assign tiers based on percentile cutoffs ──
    const tierOrder: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

    const memberships = rankedUsers.map(([userId, _score], index) => {
      const percentile = (index + 1) / totalUsers
      const tier = getTierForPercentile(percentile)
      const rank = index + 1

      const previousTier = previousMemberships.get(userId)
      let promoted: boolean | null = null
      let relegated: boolean | null = null

      if (previousTier) {
        const prevIndex = tierOrder.indexOf(previousTier)
        const newIndex = tierOrder.indexOf(tier)
        if (newIndex > prevIndex) promoted = true
        if (newIndex < prevIndex) relegated = true
      }

      return {
        user_id: userId,
        season_id: newSeason.id,
        tier,
        end_rank: rank,
        promoted,
        relegated,
        assigned_at: now.toISOString(),
      }
    })

    // ── Step 6: Bulk insert memberships ──
    // Insert in batches of 500 to avoid payload limits
    const batchSize = 500
    let insertedCount = 0

    for (let i = 0; i < memberships.length; i += batchSize) {
      const batch = memberships.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('league_memberships')
        .insert(batch)

      if (insertError) {
        console.error(`Failed to insert batch ${i / batchSize + 1}:`, insertError)
      } else {
        insertedCount += batch.length
      }
    }

    // Count per tier
    const tierCounts: Record<string, number> = {}
    for (const m of memberships) {
      tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      season: seasonName,
      assigned: insertedCount,
      total: totalUsers,
      tierCounts,
      previousSeasonClosed: activeSeason?.id || null,
    })
  } catch (error) {
    console.error('League assignment cron error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

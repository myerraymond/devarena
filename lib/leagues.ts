import { supabase } from '@/lib/supabase'
import type { LeagueTier } from '@/components/league-badge'

export interface Season {
  id: string
  name: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

export interface LeagueMembership {
  id: string
  user_id: string
  season_id: string
  tier: LeagueTier
  end_rank: number | null
  promoted: boolean | null
  relegated: boolean | null
  assigned_at: string
}

export interface LeagueMembershipWithUser extends LeagueMembership {
  username: string
  display_name: string | null
  avatar_url: string | null
  week_score: number | null
  streak: number | null
}

// Tier percentile thresholds
export const TIER_CUTOFFS: { tier: LeagueTier; maxPercentile: number }[] = [
  { tier: 'diamond', maxPercentile: 0.01 },    // top 1%
  { tier: 'platinum', maxPercentile: 0.05 },    // top 5%
  { tier: 'gold', maxPercentile: 0.15 },        // top 15%
  { tier: 'silver', maxPercentile: 0.35 },      // top 35%
  { tier: 'bronze', maxPercentile: 1.0 },       // everyone else
]

export function getTierForPercentile(percentile: number): LeagueTier {
  for (const { tier, maxPercentile } of TIER_CUTOFFS) {
    if (percentile <= maxPercentile) return tier
  }
  return 'bronze'
}

/**
 * Given a user's score and the full list of all scores (descending),
 * determine the user's league tier based on their percentile position.
 */
export function assignLeagueTier(
  userScore: number,
  allScores: number[]
): LeagueTier {
  if (allScores.length === 0) return 'bronze'

  // Sort descending to find the user's rank
  const sorted = [...allScores].sort((a, b) => b - a)
  const rank = sorted.indexOf(userScore) + 1 // 1-based rank
  const percentile = rank / sorted.length

  return getTierForPercentile(percentile)
}

/**
 * Get the currently active season.
 */
export async function getActiveSeason(): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as Season
}

/**
 * Get a user's current league membership for the active season.
 */
export async function getUserLeagueMembership(userId: string): Promise<LeagueMembership | null> {
  const season = await getActiveSeason()
  if (!season) return null

  const { data, error } = await supabase
    .from('league_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', season.id)
    .maybeSingle()

  if (error || !data) return null
  return data as LeagueMembership
}

/**
 * Get a user's league membership from the previous season (for promo/relegation info).
 */
export async function getUserPreviousLeagueMembership(userId: string): Promise<LeagueMembership | null> {
  const season = await getActiveSeason()
  if (!season) return null

  // Get the season that ended just before the current one started
  const { data: prevSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('*')
    .lt('ends_at', season.starts_at)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (seasonError || !prevSeason) return null

  const { data, error } = await supabase
    .from('league_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', prevSeason.id)
    .maybeSingle()

  if (error || !data) return null
  return data as LeagueMembership
}

/**
 * Get the score threshold needed to reach the next tier.
 * Returns the minimum score of the next tier up, or null if already diamond.
 */
export async function getNextTierThreshold(
  currentTier: LeagueTier
): Promise<{ nextTier: LeagueTier; minScore: number } | null> {
  const tierOrder: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const currentIndex = tierOrder.indexOf(currentTier)
  if (currentIndex >= tierOrder.length - 1) return null // Already diamond

  const nextTier = tierOrder[currentIndex + 1]

  const season = await getActiveSeason()
  if (!season) return null

  // Get all memberships for this season sorted by end_rank
  // Since we compute tiers from percentiles of scores, we need to figure out
  // the approximate score cutoff. We'll look at current members.
  const { data: members, error } = await supabase
    .from('league_memberships')
    .select('tier, end_rank')
    .eq('season_id', season.id)
    .eq('tier', nextTier)
    .order('end_rank', { ascending: false })
    .limit(1)

  if (error || !members || members.length === 0) return null

  // We need actual scores. Let's get the week_score for users in the next tier.
  const { data: nextTierMembers } = await supabase
    .from('league_memberships')
    .select(`
      user_id,
      users!inner (
        id
      )
    `)
    .eq('season_id', season.id)
    .eq('tier', nextTier)

  if (!nextTierMembers || nextTierMembers.length === 0) return null

  // Get the lowest score in the next tier
  const userIds = nextTierMembers.map((m: any) => m.user_id)

  const { data: snapshots } = await supabase
    .from('stats_snapshots')
    .select('user_id, week_score, snapshotted_at')
    .in('user_id', userIds)
    .order('snapshotted_at', { ascending: false })

  if (!snapshots || snapshots.length === 0) return null

  // Get latest score per user
  const scoreMap = new Map<string, number>()
  for (const s of snapshots) {
    if (!scoreMap.has(s.user_id)) {
      scoreMap.set(s.user_id, s.week_score || 0)
    }
  }

  const scores = Array.from(scoreMap.values()).sort((a, b) => a - b)
  const minScore = scores[0] || 0

  return { nextTier, minScore }
}

/**
 * Build a map of username -> LeagueTier for the current season.
 * Used to show league badges on the leaderboard without N+1 queries.
 */
export async function getLeagueTiersMap(): Promise<Record<string, LeagueTier>> {
  const season = await getActiveSeason()
  if (!season) return {}

  const { data, error } = await supabase
    .from('league_memberships')
    .select(`
      tier,
      users!inner (
        username,
        github_username
      )
    `)
    .eq('season_id', season.id)

  if (error || !data) return {}

  const map: Record<string, LeagueTier> = {}
  for (const membership of data) {
    const user = membership.users as any
    const username = user.github_username || user.username
    if (username) {
      map[username] = membership.tier as LeagueTier
    }
  }

  return map
}

/**
 * Get all members grouped by tier for the leagues page.
 */
export async function getLeagueMembers(): Promise<Record<LeagueTier, LeagueMembershipWithUser[]>> {
  const season = await getActiveSeason()
  const result: Record<LeagueTier, LeagueMembershipWithUser[]> = {
    diamond: [],
    platinum: [],
    gold: [],
    silver: [],
    bronze: [],
  }

  if (!season) return result

  const { data, error } = await supabase
    .from('league_memberships')
    .select(`
      *,
      users!inner (
        username,
        github_username,
        display_name,
        avatar_url,
        is_public
      )
    `)
    .eq('season_id', season.id)
    .eq('users.is_public', true)

  if (error || !data) return result

  // Get latest scores for all these users
  const userIds = data.map((m: any) => m.user_id)

  const { data: snapshots } = await supabase
    .from('stats_snapshots')
    .select('user_id, week_score, streak_days, github_streak_days, snapshotted_at')
    .in('user_id', userIds)
    .order('snapshotted_at', { ascending: false })

  const scoreMap = new Map<string, { week_score: number; streak: number | null }>()
  if (snapshots) {
    for (const s of snapshots) {
      if (!scoreMap.has(s.user_id)) {
        scoreMap.set(s.user_id, {
          week_score: s.week_score || 0,
          streak: s.streak_days || s.github_streak_days || null,
        })
      }
    }
  }

  for (const membership of data) {
    const user = membership.users as any
    const scores = scoreMap.get(membership.user_id) || { week_score: 0, streak: null }
    const tier = membership.tier as LeagueTier

    result[tier].push({
      id: membership.id,
      user_id: membership.user_id,
      season_id: membership.season_id,
      tier,
      end_rank: membership.end_rank,
      promoted: membership.promoted,
      relegated: membership.relegated,
      assigned_at: membership.assigned_at,
      username: user.github_username || user.username || 'unknown',
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      week_score: scores.week_score,
      streak: scores.streak,
    })
  }

  // Sort each tier by score descending
  for (const tier of Object.keys(result) as LeagueTier[]) {
    result[tier].sort((a, b) => (b.week_score || 0) - (a.week_score || 0))
  }

  return result
}

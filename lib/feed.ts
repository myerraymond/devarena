import { supabase, createServerClient } from '@/lib/supabase'

export type FeedEventType =
  | 'streak_milestone'
  | 'language_king'
  | 'league_promoted'
  | 'rank_milestone'
  | 'first_commit'
  | 'season_winner'

export interface FeedEvent {
  id: string
  user_id: string
  event_type: FeedEventType
  payload: Record<string, any>
  created_at: string
  // Joined fields
  username: string
  display_name: string | null
  avatar_url: string | null
}

/**
 * Fetch feed events with user info, paginated.
 * @param limit Number of events to fetch
 * @param offset Offset for pagination
 * @param eventType Optional filter by event type
 */
export async function getFeedEvents(
  limit: number = 20,
  offset: number = 0,
  eventType?: FeedEventType
): Promise<{ events: FeedEvent[]; hasMore: boolean }> {
  let query = supabase
    .from('feed_events')
    .select(`
      id,
      user_id,
      event_type,
      payload,
      created_at,
      users!inner (
        username,
        github_username,
        display_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching feed events:', error)
    return { events: [], hasMore: false }
  }

  const events: FeedEvent[] = data.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    event_type: row.event_type as FeedEventType,
    payload: row.payload || {},
    created_at: row.created_at,
    username: row.users?.github_username || row.users?.username || 'unknown',
    display_name: row.users?.display_name,
    avatar_url: row.users?.avatar_url,
  }))

  return { events, hasMore: events.length > limit }
}

/**
 * Get the count of users who have a snapshot within the last 2 hours.
 * This is the "currently online / building now" count.
 */
export async function getOnlineCount(): Promise<number> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('stats_snapshots')
    .select('user_id', { count: 'exact', head: false })
    .gte('snapshotted_at', twoHoursAgo)

  if (error || !data) return 0

  // Count unique user_ids
  const uniqueUsers = new Set(data.map((row: any) => row.user_id))
  return uniqueUsers.size
}

// ── Event generation helpers (called from cron) ──

const STREAK_MILESTONES = [7, 14, 30, 50, 100]
const RANK_MILESTONES = [10, 3, 1]

interface PreviousState {
  streak: number
  rank: number
  hasSnapshot: boolean
  topLanguage: string | null
}

/**
 * Insert a feed event using the service-role client.
 */
export async function insertFeedEvent(
  userId: string,
  eventType: FeedEventType,
  payload: Record<string, any>
): Promise<void> {
  const serverClient = createServerClient()
  const { error } = await serverClient
    .from('feed_events')
    .insert({
      user_id: userId,
      event_type: eventType,
      payload,
    })

  if (error) {
    console.error(`Failed to insert feed event (${eventType}):`, error)
  }
}

/**
 * Compare previous and current state for a user and generate feed events.
 * Called after each user's stats are synced in the cron job.
 */
export async function generateFeedEvents(
  userId: string,
  previous: PreviousState,
  current: {
    streak: number
    rank: number
    topLanguage: string | null
    isLanguageKing: boolean
    kingLanguage: string | null
  }
): Promise<void> {
  // First commit — user appearing on leaderboard for the first time
  if (!previous.hasSnapshot) {
    await insertFeedEvent(userId, 'first_commit', {})
  }

  // Streak milestones
  for (const milestone of STREAK_MILESTONES) {
    if (current.streak >= milestone && previous.streak < milestone) {
      await insertFeedEvent(userId, 'streak_milestone', {
        streak_days: milestone,
      })
      break // Only emit the highest new milestone
    }
  }

  // Language king
  if (current.isLanguageKing && current.kingLanguage) {
    await insertFeedEvent(userId, 'language_king', {
      language: current.kingLanguage,
    })
  }

  // Rank milestones (top 10, top 3, #1)
  for (const milestone of RANK_MILESTONES) {
    if (current.rank <= milestone && previous.rank > milestone) {
      await insertFeedEvent(userId, 'rank_milestone', {
        rank: current.rank,
      })
      break // Only emit the highest milestone
    }
  }
}

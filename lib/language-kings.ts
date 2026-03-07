import { supabase } from '@/lib/supabase'

export interface LanguageKing {
  language: string
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  score: number
  streak: number | null
}

export interface LanguageRankEntry {
  language: string
  rank: number
  score: number
  king_score: number
  gap: number
}

/**
 * Get the #1 ranked developer for each programming language this week.
 * Returns one entry per language with the user who has the highest week_score
 * and that language as their top_language.
 */
export async function getLanguageKings(): Promise<LanguageKing[]> {
  const { data: snapshots, error } = await supabase
    .from('stats_snapshots')
    .select(`
      user_id,
      week_score,
      top_language,
      github_top_language,
      streak_days,
      github_streak_days,
      snapshotted_at,
      users!inner (
        id,
        username,
        github_username,
        display_name,
        avatar_url,
        is_public
      )
    `)
    .eq('users.is_public', true)
    .order('snapshotted_at', { ascending: false })

  if (error || !snapshots) {
    console.error('Error fetching cracked devs:', error)
    return []
  }

  // Get latest snapshot per user
  const userMap = new Map<string, any>()
  for (const snapshot of snapshots) {
    if (!snapshot || typeof snapshot !== 'object' || !('user_id' in snapshot)) continue
    const userId = snapshot.user_id as string
    if (!userId) continue
    if (!userMap.has(userId) ||
      new Date(snapshot.snapshotted_at as string) > new Date(userMap.get(userId)!.snapshotted_at)) {
      userMap.set(userId, snapshot)
    }
  }

  // Group by language, find highest week_score per language
  const languageBest = new Map<string, LanguageKing>()

  for (const snapshot of userMap.values()) {
    const language = snapshot.top_language || snapshot.github_top_language
    if (!language) continue

    const score = snapshot.week_score || 0
    if (score <= 0) continue

    const current = languageBest.get(language)
    if (!current || score > current.score) {
      const user = snapshot.users as any
      languageBest.set(language, {
        language,
        user_id: snapshot.user_id,
        username: user.github_username || user.username || 'unknown',
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        score,
        streak: snapshot.streak_days || snapshot.github_streak_days || null,
      })
    }
  }

  return Array.from(languageBest.values()).sort((a, b) => b.score - a.score)
}

/**
 * Get the languages a specific user is #1 in the world for.
 */
export async function getUserLanguageKingdoms(userId: string): Promise<string[]> {
  const kings = await getLanguageKings()
  return kings
    .filter((k) => k.user_id === userId)
    .map((k) => k.language)
}

/**
 * Get a user's rank within their top language.
 * Returns null if the user has no top language or no score.
 */
export async function getUserLanguageRank(
  userId: string,
  topLanguage: string | null
): Promise<LanguageRankEntry | null> {
  if (!topLanguage) return null

  const { data: snapshots, error } = await supabase
    .from('stats_snapshots')
    .select(`
      user_id,
      week_score,
      top_language,
      github_top_language,
      snapshotted_at,
      users!inner (
        id,
        is_public
      )
    `)
    .eq('users.is_public', true)
    .order('snapshotted_at', { ascending: false })

  if (error || !snapshots) return null

  // Get latest snapshot per user
  const userMap = new Map<string, any>()
  for (const snapshot of snapshots) {
    if (!snapshot || typeof snapshot !== 'object' || !('user_id' in snapshot)) continue
    const uid = snapshot.user_id as string
    if (!uid) continue
    if (!userMap.has(uid) ||
      new Date(snapshot.snapshotted_at as string) > new Date(userMap.get(uid)!.snapshotted_at)) {
      userMap.set(uid, snapshot)
    }
  }

  // Filter to users with the same top language, sort by week_score
  const sameLang = Array.from(userMap.values())
    .filter((s) => {
      const lang = s.top_language || s.github_top_language
      return lang === topLanguage && (s.week_score || 0) > 0
    })
    .sort((a, b) => (b.week_score || 0) - (a.week_score || 0))

  const userIndex = sameLang.findIndex((s) => s.user_id === userId)
  if (userIndex === -1) return null

  const userScore = sameLang[userIndex].week_score || 0
  const kingScore = sameLang[0]?.week_score || 0

  return {
    language: topLanguage,
    rank: userIndex + 1,
    score: userScore,
    king_score: kingScore,
    gap: kingScore - userScore,
  }
}

/**
 * Build a map of username -> languages they're cracked in.
 * Useful for the leaderboard table to avoid N+1 queries.
 */
export async function getKingsMap(): Promise<Map<string, string[]>> {
  const kings = await getLanguageKings()
  const map = new Map<string, string[]>()
  for (const king of kings) {
    const existing = map.get(king.username) || []
    existing.push(king.language)
    map.set(king.username, existing)
  }
  return map
}

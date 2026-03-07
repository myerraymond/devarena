import { getLeagueMembers, getActiveSeason } from '@/lib/leagues'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import LeaguesClient from './LeaguesClient'
import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Leagues — DevArena',
  description: 'Seasonal league rankings on DevArena. Diamond, Platinum, Gold, Silver, and Bronze tiers.',
}

export default async function LeaguesPage() {
  const [members, season, session] = await Promise.all([
    getLeagueMembers(),
    getActiveSeason(),
    getSession(),
  ])

  // Get current user's username if signed in
  let currentUsername: string | null = null
  if (session?.userId) {
    const { data: user } = await supabase
      .from('users')
      .select('github_username, username')
      .eq('id', session.userId)
      .single()
    if (user) {
      currentUsername = user.github_username || user.username || null
    }
  }

  // Find current user's tier
  let currentUserTier: string | null = null
  if (currentUsername) {
    for (const [tier, tierMembers] of Object.entries(members)) {
      if (tierMembers.some((m) => m.username === currentUsername)) {
        currentUserTier = tier
        break
      }
    }
  }

  // Serialize members for client component
  const serializedMembers: Record<string, Array<{
    username: string
    display_name: string | null
    avatar_url: string | null
    week_score: number | null
    streak: number | null
    end_rank: number | null
    promoted: boolean | null
    relegated: boolean | null
  }>> = {}

  for (const [tier, tierMembers] of Object.entries(members)) {
    serializedMembers[tier] = tierMembers.map((m) => ({
      username: m.username,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      week_score: m.week_score,
      streak: m.streak,
      end_rank: m.end_rank,
      promoted: m.promoted,
      relegated: m.relegated,
    }))
  }

  return (
    <LeaguesClient
      members={serializedMembers}
      season={season}
      currentUsername={currentUsername}
      currentUserTier={currentUserTier}
    />
  )
}

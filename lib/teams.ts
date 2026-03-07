import { supabase, createServerClient } from '@/lib/supabase'

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  created_by: string | null
  is_private: boolean
  invite_code: string
  max_members: number
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export interface TeamMemberWithUser extends TeamMember {
  username: string
  display_name: string | null
  avatar_url: string | null
  week_score: number | null
  streak: number | null
  top_language: string | null
  commits: number | null
}

export interface TeamWithStats extends Team {
  member_count: number
  combined_score: number
  average_score: number
  top_language: string | null
}

/**
 * Generate a random 8-character invite code.
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Generate a URL-safe slug from a team name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

/**
 * Get a team by its slug.
 */
export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data as Team
}

/**
 * Get a team by its invite code.
 */
export async function getTeamByInviteCode(code: string): Promise<Team | null> {
  const serverClient = createServerClient()
  const { data, error } = await serverClient
    .from('teams')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle()

  if (error || !data) return null
  return data as Team
}

/**
 * Get the team a user belongs to (returns the first if multiple).
 */
export async function getUserTeam(userId: string): Promise<{ team: Team; role: 'owner' | 'member' } | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      role,
      teams (*)
    `)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const team = (data as any).teams as Team
  if (!team) return null

  return { team, role: data.role as 'owner' | 'member' }
}

/**
 * Get all members of a team with their stats.
 */
export async function getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
  const { data: members, error } = await supabase
    .from('team_members')
    .select(`
      *,
      users!inner (
        username,
        github_username,
        display_name,
        avatar_url
      )
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  if (error || !members) return []

  // Get latest scores for members
  const userIds = members.map((m: any) => m.user_id)

  const { data: snapshots } = await supabase
    .from('stats_snapshots')
    .select('user_id, week_score, streak_days, github_streak_days, top_language, github_top_language, week_commits, github_commits, snapshotted_at')
    .in('user_id', userIds)
    .order('snapshotted_at', { ascending: false })

  const scoreMap = new Map<string, {
    week_score: number
    streak: number | null
    top_language: string | null
    commits: number | null
  }>()

  if (snapshots) {
    for (const s of snapshots) {
      if (!scoreMap.has(s.user_id)) {
        scoreMap.set(s.user_id, {
          week_score: s.week_score || 0,
          streak: s.streak_days || s.github_streak_days || null,
          top_language: s.top_language || s.github_top_language || null,
          commits: s.week_commits || s.github_commits || null,
        })
      }
    }
  }

  return members.map((m: any) => {
    const user = m.users as any
    const stats = scoreMap.get(m.user_id) || { week_score: 0, streak: null, top_language: null, commits: null }

    return {
      id: m.id,
      team_id: m.team_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      username: user.github_username || user.username || 'unknown',
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      week_score: stats.week_score,
      streak: stats.streak,
      top_language: stats.top_language,
      commits: stats.commits,
    }
  })
}

/**
 * Get the member count for a team.
 */
export async function getTeamMemberCount(teamId: string): Promise<number> {
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) return 0
  return count || 0
}

/**
 * Check if a user is a member of a specific team.
 */
export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!data
}

/**
 * Get all public teams with stats, plus the user's private team if they have one.
 */
export async function getTeamsDirectory(userId?: string): Promise<TeamWithStats[]> {
  // Fetch public teams
  const { data: publicTeams, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_private', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching teams:', error)
    return []
  }

  let allTeams = (publicTeams || []) as Team[]

  // If user is logged in, include their team even if private
  if (userId) {
    const userTeamData = await getUserTeam(userId)
    if (userTeamData && !allTeams.some((t) => t.id === userTeamData.team.id)) {
      allTeams = [userTeamData.team, ...allTeams]
    }
  }

  // Enrich with stats
  return await enrichTeamsWithStats(allTeams)
}

/**
 * Enrich an array of teams with member count, combined score, and top language.
 */
async function enrichTeamsWithStats(teams: Team[]): Promise<TeamWithStats[]> {
  if (teams.length === 0) return []

  const teamIds = teams.map((t) => t.id)

  // Get all members for these teams
  const { data: allMembers } = await supabase
    .from('team_members')
    .select('team_id, user_id')
    .in('team_id', teamIds)

  if (!allMembers) {
    return teams.map((t) => ({
      ...t,
      member_count: 0,
      combined_score: 0,
      average_score: 0,
      top_language: null,
    }))
  }

  // Group members by team
  const teamMemberMap = new Map<string, string[]>()
  for (const m of allMembers) {
    const existing = teamMemberMap.get(m.team_id) || []
    existing.push(m.user_id)
    teamMemberMap.set(m.team_id, existing)
  }

  // Get all unique user IDs
  const allUserIds = [...new Set(allMembers.map((m: any) => m.user_id))]

  // Get latest scores
  const { data: snapshots } = await supabase
    .from('stats_snapshots')
    .select('user_id, week_score, top_language, github_top_language, snapshotted_at')
    .in('user_id', allUserIds)
    .order('snapshotted_at', { ascending: false })

  const userScoreMap = new Map<string, { score: number; language: string | null }>()
  if (snapshots) {
    for (const s of snapshots) {
      if (!userScoreMap.has(s.user_id)) {
        userScoreMap.set(s.user_id, {
          score: s.week_score || 0,
          language: s.top_language || s.github_top_language || null,
        })
      }
    }
  }

  return teams.map((team) => {
    const memberIds = teamMemberMap.get(team.id) || []
    const memberCount = memberIds.length

    let combinedScore = 0
    const languageCounts = new Map<string, number>()

    for (const uid of memberIds) {
      const stats = userScoreMap.get(uid)
      if (stats) {
        combinedScore += stats.score
        if (stats.language) {
          languageCounts.set(stats.language, (languageCounts.get(stats.language) || 0) + 1)
        }
      }
    }

    // Find most common language
    let topLanguage: string | null = null
    let maxLangCount = 0
    for (const [lang, count] of languageCounts.entries()) {
      if (count > maxLangCount) {
        maxLangCount = count
        topLanguage = lang
      }
    }

    return {
      ...team,
      member_count: memberCount,
      combined_score: combinedScore,
      average_score: memberCount > 0 ? Math.round(combinedScore / memberCount) : 0,
      top_language: topLanguage,
    }
  })
}

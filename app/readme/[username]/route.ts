import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserLeagueMembership } from '@/lib/leagues'
import { getUserLanguageKingdoms } from '@/lib/language-kings'
import { getTierEmoji, getTierLabel } from '@/components/league-badge'

const VALID_STATS = ['rank', 'streak', 'score', 'language', 'league', 'king'] as const
type StatModule = (typeof VALID_STATS)[number]

interface UserData {
  userId: string
  username: string
  rank: number | null
  streak: number | null
  score: number | null
  language: string | null
  league: string | null
  leagueEmoji: string | null
  kings: string[]
}

/**
 * Fetch everything we need for the card in parallel.
 */
async function getUserCardData(username: string): Promise<UserData | null> {
  // 1. Resolve user
  const { data: user } = await supabase
    .from('users')
    .select('id, username, github_username')
    .or(`github_username.eq.${username},username.eq.${username}`)
    .eq('is_public', true)
    .maybeSingle()

  if (!user) return null

  const userId = user.id

  // 2. Latest stats snapshot
  const { data: stats } = await supabase
    .from('stats_snapshots')
    .select('week_score, streak_days, github_streak_days, top_language, github_top_language, snapshotted_at')
    .eq('user_id', userId)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 3. Rank: count users with higher week_score
  let rank: number | null = null
  if (stats?.week_score && stats.week_score > 0) {
    // Get all latest snapshots for public users
    const { data: allSnapshots } = await supabase
      .from('stats_snapshots')
      .select(`
        user_id,
        week_score,
        snapshotted_at,
        users!inner ( id, is_public )
      `)
      .eq('users.is_public', true)
      .order('snapshotted_at', { ascending: false })

    if (allSnapshots) {
      const latestScores = new Map<string, number>()
      for (const s of allSnapshots) {
        const uid = s.user_id as string
        if (!latestScores.has(uid)) {
          latestScores.set(uid, (s.week_score as number) || 0)
        }
      }
      const sorted = Array.from(latestScores.entries())
        .filter(([, s]) => s > 0)
        .sort((a, b) => b[1] - a[1])
      const idx = sorted.findIndex(([uid]) => uid === userId)
      if (idx !== -1) rank = idx + 1
    }
  }

  // 4. League + Kings (parallel)
  const [leagueMembership, kings] = await Promise.all([
    getUserLeagueMembership(userId),
    getUserLanguageKingdoms(userId),
  ])

  return {
    userId,
    username: (user as any).github_username || (user as any).username || username,
    rank,
    streak: stats?.streak_days || stats?.github_streak_days || null,
    score: stats?.week_score || null,
    language: stats?.top_language || stats?.github_top_language || null,
    league: leagueMembership ? getTierLabel(leagueMembership.tier) : null,
    leagueEmoji: leagueMembership ? getTierEmoji(leagueMembership.tier) : null,
    kings,
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface Theme {
  bg: string
  border: string
  text: string
  muted: string
  logoBg: string
  logoText: string
}

const lightTheme: Theme = {
  bg: '#ffffff',
  border: '#e4e4e0',
  text: '#0d0d0d',
  muted: '#999999',
  logoBg: '#0d0d0d',
  logoText: '#ffffff',
}

const darkTheme: Theme = {
  bg: '#0d0d0d',
  border: '#222222',
  text: '#ffffff',
  muted: '#666666',
  logoBg: '#ffffff',
  logoText: '#0d0d0d',
}

function buildStatValue(stat: StatModule, data: UserData): { label: string; value: string; color?: string } | null {
  switch (stat) {
    case 'rank':
      if (!data.rank) return null
      return { label: 'RANK', value: `# ${data.rank}` }
    case 'streak':
      if (!data.streak || data.streak === 0) return null
      return {
        label: 'STREAK',
        value: data.streak >= 100 ? `👑 ${data.streak}d` : `🔥 ${data.streak}d`,
        color: data.streak >= 100 ? '#d97706' : undefined,
      }
    case 'score':
      if (!data.score) return null
      return { label: 'SCORE', value: `${data.score.toLocaleString()} pts` }
    case 'language':
      if (!data.language) return null
      return { label: 'LANGUAGE', value: data.language }
    case 'league':
      if (!data.league || !data.leagueEmoji) return null
      return { label: 'LEAGUE', value: `${data.leagueEmoji} ${data.league}` }
    case 'king':
      if (!data.kings || data.kings.length === 0) return null
      return { label: 'CRACKED', value: `👑 ${data.kings[0]}` }
    default:
      return null
  }
}

function renderSvg(
  username: string,
  stats: { label: string; value: string; color?: string }[],
  theme: Theme,
  height: number
): string {
  const width = 480
  const logoSize = 22
  const logoX = 20
  const logoY = height === 120 ? 30 : 38

  // Stat modules — space them evenly on the right side
  const statStartX = 160
  const statAreaWidth = width - statStartX - 20
  const statCount = Math.min(stats.length, 4)
  const statSpacing = statCount > 0 ? statAreaWidth / statCount : 0
  const statCenterY = height / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" ry="6"
    fill="${theme.bg}" stroke="${theme.border}" stroke-width="1" />

  <!-- Logo box -->
  <rect x="${logoX}" y="${logoY - 14}" width="${logoSize}" height="${logoSize}" rx="4" ry="4"
    fill="${theme.logoBg}" />
  <text x="${logoX + logoSize / 2}" y="${logoY}" text-anchor="middle"
    font-family="monospace" font-size="10" font-weight="700" fill="${theme.logoText}" letter-spacing="-1">~/</text>

  <!-- DevArena text -->
  <text x="${logoX + logoSize + 8}" y="${logoY}"
    font-family="monospace" font-size="13" font-weight="600" fill="${theme.text}">DevArena</text>

  <!-- Username -->
  <text x="${logoX}" y="${logoY + 30}"
    font-family="monospace" font-size="14" font-weight="500" fill="${theme.muted}">@${escapeXml(username)}</text>

  ${stats.length === 0 ? `
  <text x="${statStartX}" y="${statCenterY + 4}"
    font-family="monospace" font-size="12" fill="${theme.muted}">No stats available</text>
  ` : ''}

  <!-- Stat modules -->
  ${stats.slice(0, 4).map((s, i) => {
    const x = statStartX + i * statSpacing + statSpacing / 2
    const valueColor = s.color || theme.text
    return `
  <text x="${x}" y="${statCenterY - 10}" text-anchor="middle"
    font-family="sans-serif" font-size="10" fill="${theme.muted}" letter-spacing="0.5">${escapeXml(s.label)}</text>
  <text x="${x}" y="${statCenterY + 14}" text-anchor="middle"
    font-family="monospace" font-size="14" font-weight="700" fill="${valueColor}">${escapeXml(s.value)}</text>`
  }).join('')}
</svg>`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username
  const { searchParams } = new URL(request.url)

  // Parse stat modules
  const statsParam = searchParams.get('stats') || 'rank,streak,score,language'
  const requestedStats = statsParam
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is StatModule => VALID_STATS.includes(s as StatModule))

  // Theme
  const themeName = searchParams.get('theme') || 'light'
  const theme = themeName === 'dark' ? darkTheme : lightTheme

  // Height
  const style = searchParams.get('style') || 'compact'
  const height = style === 'expanded' ? 160 : 120

  // Fetch data
  const data = await getUserCardData(username)

  if (!data) {
    // User not found — return a placeholder card
    const svg = renderSvg(username, [], theme, height)
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }

  // Build stat values
  const statValues: { label: string; value: string; color?: string }[] = []
  for (const stat of requestedStats) {
    const val = buildStatValue(stat, data)
    if (val) statValues.push(val)
    if (statValues.length >= 4) break
  }

  const svg = renderSvg(data.username, statValues, theme, height)

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

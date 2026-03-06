import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'edge'

async function getUserStats(username: string) {
  // Check by github_username first, then fallback to username
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('id, username, github_username')
    .or(`github_username.eq.${username},username.eq.${username}`)
    .eq('is_public', true)
    .single()

  if (publicError || !publicUser) {
    return null
  }

  // Get latest stats snapshot
  const { data: latestStats } = await supabase
    .from('stats_snapshots')
    .select('*')
    .eq('user_id', publicUser.id)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .single()

  return latestStats
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  // Get user to find their github_username for display
  const { data: publicUser } = await supabase
    .from('users')
    .select('id, username, github_username')
    .or(`github_username.eq.${params.username},username.eq.${params.username}`)
    .eq('is_public', true)
    .single()
  
  const stats = await getUserStats(params.username)
  const displayUsername = (publicUser as any)?.github_username || publicUser?.username || params.username

  if (!stats) {
    return new Response('User not found', { status: 404 })
  }

  // Use GitHub commits instead of WakaTime hours
  const weekCommits = stats.week_commits || 0
  const yearCommits = stats.year_commits || 0
  const allTimeCommits = stats.all_time_commits || stats.github_commits || 0
  
  // Determine which commit count to show (prefer week, then year, then all-time)
  const displayCommits = weekCommits > 0 ? weekCommits : yearCommits > 0 ? yearCommits : allTimeCommits
  const commitsText = displayCommits > 1000 
    ? `${(displayCommits / 1000).toFixed(1)}k`
    : `${displayCommits}`

  const allTimeText = allTimeCommits > 1000 
    ? `${(allTimeCommits / 1000).toFixed(1)}k`
    : `${allTimeCommits}`

  // Determine timeframe label
  const timeframeLabel = weekCommits > 0 ? 'THIS WEEK' : yearCommits > 0 ? 'THIS YEAR' : 'ALL TIME'
  const usernameLabel = `@${displayUsername} // ${timeframeLabel}`

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          position: 'relative',
          fontFamily: 'monospace',
          border: '8px solid #000',
        }}
      >

        {/* Top left: DEVARENA */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 50,
            fontSize: 32,
            color: '#000',
            fontFamily: 'Archivo, sans-serif',
            fontWeight: '900',
            letterSpacing: '2px',
          }}
        >
          DEVARENA
        </div>

        {/* Center: Main hours number with phosphor glow */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -100,
          }}
        >
          {/* Main commits number - bold and black */}
          <div
            style={{
              fontSize: 140,
              fontWeight: '900',
              color: '#000',
              fontFamily: 'Archivo, sans-serif',
              letterSpacing: '-6px',
              lineHeight: 1,
            }}
          >
            {commitsText}
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#000',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: '700',
              marginTop: 30,
              letterSpacing: '1px',
            }}
          >
            {usernameLabel}
          </div>
        </div>

        {/* Bottom row: Stats */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 50,
            right: 50,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {/* Streak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 16,
                color: '#000',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: '700',
                marginBottom: 4,
                display: 'flex',
              }}
            >
              STREAK
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#000',
                fontFamily: 'Archivo, sans-serif',
                fontWeight: '900',
                display: 'flex',
              }}
            >
              {(stats.github_streak_days || stats.streak_days) && (stats.github_streak_days || stats.streak_days || 0) > 0 
                ? `🔥 ${stats.github_streak_days || stats.streak_days || 0} days`
                : '—'}
            </div>
          </div>

          {/* Top Language */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <div
              style={{
                fontSize: 16,
                color: '#000',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: '700',
                marginBottom: 4,
                display: 'flex',
              }}
            >
              TOP LANG
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#000',
                fontFamily: 'Archivo, sans-serif',
                fontWeight: '900',
                display: 'flex',
              }}
            >
              {stats.github_top_language || stats.top_language || '—'}
            </div>
          </div>

          {/* All Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div
              style={{
                fontSize: 16,
                color: '#000',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: '700',
                marginBottom: 4,
                display: 'flex',
              }}
            >
              ALL TIME
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#000',
                fontFamily: 'Archivo, sans-serif',
                fontWeight: '900',
                display: 'flex',
              }}
            >
              {allTimeText} commits
            </div>
          </div>
        </div>

        {/* Bottom right: URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            right: 50,
            fontSize: 20,
            color: '#000',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: '700',
            letterSpacing: '1px',
          }}
        >
          devarena.so
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

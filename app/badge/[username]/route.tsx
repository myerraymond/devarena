import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const revalidate = 300 // Cache for 5 minutes

// Create Supabase client for edge runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    // Get user profile and latest stats
    const { data: publicUser } = await supabase
      .from('users')
      .select('id, username, github_username, is_public')
      .or(`github_username.eq.${params.username},username.eq.${params.username}`)
      .eq('is_public', true)
      .single()

    if (!publicUser) {
      // Return a default "not found" badge
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              fontFamily: 'system-ui, sans-serif',
              padding: '12px 16px',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: '#0d0d0d',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1 }}>~/</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.3px' }}>DevArena</span>
            </div>
            <div style={{ display: 'flex', fontSize: '12px', fontWeight: '400', color: '#64748b' }}>
              User not found
            </div>
          </div>
        ),
        {
          width: 200,
          height: 60,
        }
      )
    }

    // Get latest stats
    const { data: latestStats } = await supabase
      .from('stats_snapshots')
      .select('week_score, streak_days, github_streak_days, week_commits')
      .eq('user_id', publicUser.id)
      .order('snapshotted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const streak = latestStats?.streak_days || latestStats?.github_streak_days || 0
    const commits = latestStats?.week_commits || 0
    const weekScore = latestStats?.week_score || 0

    const username = (publicUser as any).github_username || publicUser.username

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontFamily: 'system-ui, sans-serif',
            padding: '12px 16px',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* User Avatar */}
          <img
            src={`https://github.com/${username}.png`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              display: 'flex',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: '#0d0d0d',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 8,
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '-0.5px',
                      lineHeight: 1,
                    }}
                  >
                    ~/
                  </span>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.3px' }}>
                  DevArena
                </span>
              </div>
              {weekScore > 0 && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {weekScore} pts
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontWeight: '400', color: '#64748b' }}>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'flex' }}>🔥</span>
                  <span style={{ display: 'flex' }}>{streak}d</span>
                </div>
              )}
              {commits > 0 && (
                <div style={{ display: 'flex' }}>
                  {commits} commits
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      {
        width: 200,
        height: 60,
      }
    )
  } catch (error) {
    console.error('Badge generation error:', error)
    // Return error badge
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontFamily: 'system-ui, sans-serif',
            padding: '12px 16px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              style={{
                width: 16,
                height: 16,
                background: '#0d0d0d',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1 }}>~/</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.3px' }}>DevArena</span>
          </div>
        </div>
      ),
      {
        width: 200,
        height: 60,
      }
    )
  }
}

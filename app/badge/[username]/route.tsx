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
              width: '100%',
              height: '100%',
              backgroundColor: '#fff',
              border: '4px solid #000',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', padding: '20px', justifyContent: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#000', marginBottom: '8px' }}>
                DEVARENA
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#666' }}>
                User not found
              </div>
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

    // For badge, we'll show score instead of rank to keep it fast
    // Rank calculation would require fetching all users which is expensive
    const username = (publicUser as any).github_username || publicUser.username

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            border: '4px solid #000',
            boxShadow: '4px 4px 0px #000',
            fontFamily: 'Archivo, sans-serif',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#000' }}>
                DEVARENA
              </div>
              {weekScore > 0 && (
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '900',
                    color: '#000',
                    backgroundColor: '#FACC00',
                    padding: '2px 6px',
                    border: '2px solid #000',
                  }}
                >
                  {weekScore} pts
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: '700', color: '#000' }}>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🔥</span>
                  <span>{streak}d</span>
                </div>
              )}
              {commits > 0 && (
                <div>
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
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            border: '4px solid #000',
            fontFamily: 'Archivo, sans-serif',
            padding: '20px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>
            DEVARENA
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

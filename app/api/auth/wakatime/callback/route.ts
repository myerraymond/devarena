import { NextResponse } from 'next/server'
import { exchangeWakaTimeCode, getWakaTimeUser } from '@/lib/wakatime'
import { createServerClient } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=missing_code', request.url)
    )
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await exchangeWakaTimeCode(code)
    const { access_token, refresh_token } = tokenResponse

    // Fetch user profile from WakaTime
    const wakaTimeUser = await getWakaTimeUser(access_token)
    const { id: wakatime_id, display_name, photo: avatar_url } = wakaTimeUser.data

    // Create username fallback: use username if available, otherwise generate from display_name or use id
    const username = 
      wakaTimeUser.data.username || 
      wakaTimeUser.data.display_name?.toLowerCase().replace(/\s+/g, '_') ||
      wakaTimeUser.data.id

    // Upsert user into Supabase
    const supabase = createServerClient()
    
    // Check if user exists (might be GitHub user connecting WakaTime)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, github_username')
      .eq('wakatime_id', wakatime_id)
      .single()

    const upsertData: Record<string, unknown> = {
      wakatime_id,
      username: username,
      display_name: display_name || username,
      avatar_url: avatar_url || null,
      wakatime_access_token: access_token,
      wakatime_refresh_token: refresh_token,
      wakatime_connected: true,
    }

    // If user exists via GitHub, update that record
    if (existingUser) {
      upsertData.id = existingUser.id
    }

    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert(upsertData, {
        onConflict: existingUser ? 'id' : 'wakatime_id',
      })
      .select()
      .single()

    if (upsertError || !user) {
      console.error('Error upserting user:', upsertError)
      return NextResponse.redirect(
        new URL('/?error=user_creation_failed', request.url)
      )
    }

    // Create session and set cookie
    const sessionToken = await createSession(user.id)
    await setSessionCookie(sessionToken)

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('WakaTime OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(error instanceof Error ? error.message : 'oauth_failed')}`,
        request.url
      )
    )
  }
}

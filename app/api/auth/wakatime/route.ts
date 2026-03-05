import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.WAKATIME_CLIENT_ID!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/wakatime/callback`
  const scopes = ['email', 'read_stats', 'read_logged_time'].join(' ')

  const authUrl = new URL('https://wakatime.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)

  return NextResponse.redirect(authUrl.toString())
}

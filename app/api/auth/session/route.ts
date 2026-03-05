import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/route'
import { createSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user ID from session or look it up
  let userId = (session as any).userId

  if (!userId) {
    // Look up user by GitHub username from session
    const supabase = createServerClient()
    const githubUsername = (session.user as any)?.login || (session.user as any)?.name
    if (githubUsername) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('github_username', githubUsername)
        .single()
      if (user) {
        userId = user.id
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Create our session cookie
  const sessionToken = await createSession(userId)
  const response = NextResponse.json({ authenticated: true })
  
  // Set cookie manually
  response.cookies.set('devarena-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return response
}

import { NextResponse } from 'next/server'
import { getSession, deleteSessionCookie } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

/**
 * DELETE /api/user/delete
 *
 * Permanently deletes the authenticated user and all their data.
 * Cascades through: stats_snapshots, feed_events, league_memberships.
 */
export async function DELETE() {
  try {
    const session = await getSession()

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId
    const supabase = createServerClient()

    // Delete in dependency order to respect foreign keys
    // 1. Feed events
    await supabase
      .from('feed_events')
      .delete()
      .eq('user_id', userId)

    // 2. League memberships
    await supabase
      .from('league_memberships')
      .delete()
      .eq('user_id', userId)

    // 3. Stats snapshots
    await supabase
      .from('stats_snapshots')
      .delete()
      .eq('user_id', userId)

    // 4. The user row itself
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Failed to delete user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    // Clear session cookie so the user is logged out
    await deleteSessionCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { profileUpdateSchema } from '@/lib/validation'

/**
 * PATCH /api/user/update
 *
 * Allowlisted profile update route.
 * Only `display_name` and `is_public` can be modified by the user.
 * All other columns (github_access_token, user_number, joined_at, etc.)
 * are protected — .strict() on the Zod schema rejects unknown fields,
 * and we only pass validated data to Supabase.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession()

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Zod .strict() will reject any fields outside the allowlist
    const parsed = profileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Only pass through fields that were actually provided
    const safeUpdate: Record<string, unknown> = {}
    if (parsed.data.display_name !== undefined) {
      safeUpdate.display_name = parsed.data.display_name
    }
    if (parsed.data.is_public !== undefined) {
      safeUpdate.is_public = parsed.data.is_public
    }

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Always derive user from session — never trust client-sent IDs
    const { error } = await supabase
      .from('users')
      .update(safeUpdate)
      .eq('id', session.userId)

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

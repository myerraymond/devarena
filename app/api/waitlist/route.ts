import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { emailSchema } from '@/lib/validation'
import { checkRateLimit, apiLimiter, rateLimitResponse } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await checkRateLimit(apiLimiter, `waitlist:${ip}`)
    if (rl && !rl.success) {
      return rateLimitResponse(rl) as unknown as NextResponse
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = emailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: parsed.data.email.toLowerCase().trim() })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already on waitlist' })
      }
      return NextResponse.json({ error: 'Failed to add to waitlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

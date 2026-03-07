import { NextRequest, NextResponse } from 'next/server'
import { getFeedEvents, type FeedEventType } from '@/lib/feed'
import { feedQuerySchema } from '@/lib/validation'

export const revalidate = 30

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const parsed = feedQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      type: searchParams.get('type') || undefined,
    })

    const params = parsed.success
      ? parsed.data
      : { limit: 20, offset: 0, type: undefined }

    const { events, hasMore } = await getFeedEvents(
      params.limit,
      params.offset,
      (params.type as FeedEventType) || undefined
    )

    return NextResponse.json({ events, hasMore })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}

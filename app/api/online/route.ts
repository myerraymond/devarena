import { NextResponse } from 'next/server'
import { getOnlineCount } from '@/lib/feed'

export const revalidate = 60

export async function GET() {
  try {
    const count = await getOnlineCount()
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
}

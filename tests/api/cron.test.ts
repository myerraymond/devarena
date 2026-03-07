import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
          not: () => ({
            is: () => ({ data: [], error: null }),
          }),
        }),
        not: () => ({
          is: () => ({ data: [], error: null }),
        }),
        order: () => ({ data: [], error: null }),
      }),
      insert: () => ({ error: null }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
      upsert: () => ({ error: null }),
    }),
  }),
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

// Mock feed
vi.mock('@/lib/feed', () => ({
  insertFeedEvent: vi.fn(),
}))

import { GET } from '@/app/api/cron/sync-stats/route'

describe('cron sync-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set CRON_SECRET for tests
    process.env.CRON_SECRET = 'test-cron-secret-minimum-16-chars'
  })

  it('returns 401 without correct secret', async () => {
    const req = new NextRequest('http://localhost/api/cron/sync-stats', {
      headers: { authorization: 'Bearer wrongsecret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with no auth header', async () => {
    const req = new NextRequest('http://localhost/api/cron/sync-stats')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with empty Bearer token', async () => {
    const req = new NextRequest('http://localhost/api/cron/sync-stats', {
      headers: { authorization: 'Bearer ' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('accepts correct CRON_SECRET', async () => {
    const req = new NextRequest('http://localhost/api/cron/sync-stats', {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })
    const res = await GET(req)
    // Should not be 401 — it proceeds to sync (may return 200 with synced:0)
    expect(res.status).not.toBe(401)
  })
})

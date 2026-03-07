import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the session module before importing the route
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
          maybeSingle: () => ({ data: null, error: null }),
          order: () => ({
            limit: () => ({
              maybeSingle: () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
      insert: () => ({ error: null }),
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

// Mock the github lib
vi.mock('@/lib/github', () => ({
  getGitHubStats: vi.fn().mockResolvedValue({
    weekScore: 100,
    monthScore: 200,
    weekCommits: 50,
    streak: 7,
    topLanguage: 'TypeScript',
    dailyBreakdown: [],
    languageBreakdown: [],
  }),
}))

// Mock feed
vi.mock('@/lib/feed', () => ({
  insertFeedEvent: vi.fn(),
}))

// Mock ratelimit
vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
  syncLimiter: null,
  rateLimitResponse: vi.fn(),
}))

import { getSession } from '@/lib/session'
import { POST } from '@/app/api/github/sync/route'
import { NextRequest } from 'next/server'

describe('GitHub sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/github/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 404 when user not found in DB', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'nonexistent-uuid',
      expiresAt: new Date(Date.now() + 86400000),
    })

    const req = new NextRequest('http://localhost/api/github/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('allows internal calls with x-internal-secret header', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const originalSecret = process.env.NEXTAUTH_SECRET
    process.env.NEXTAUTH_SECRET = 'test-secret-for-internal-calls'

    const req = new NextRequest('http://localhost/api/github/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': 'test-secret-for-internal-calls',
      },
      body: JSON.stringify({ userId: 'some-uuid' }),
    })

    const res = await POST(req)
    // Will be 404 since mock Supabase returns null user, but not 401
    expect(res.status).not.toBe(401)

    process.env.NEXTAUTH_SECRET = originalSecret
  })

  it('rejects internal calls with wrong secret', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/github/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': 'wrong-secret',
      },
      body: JSON.stringify({ userId: 'some-uuid' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

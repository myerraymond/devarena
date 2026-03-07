import { describe, it, expect, vi } from 'vitest'

// We need to mock @upstash/ratelimit and @upstash/redis before importing
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {} }
    static fixedWindow() { return {} }
  },
}))

vi.mock('@upstash/redis', () => ({
  Redis: class {},
}))

import { checkRateLimit } from '@/lib/ratelimit'

describe('rate limiting', () => {
  it('returns null when limiter is null (Upstash not configured)', async () => {
    const result = await checkRateLimit(null, 'test-ip')
    expect(result).toBeNull()
  })

  it('returns rate limit result from limiter', async () => {
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      }),
    } as any

    const result = await checkRateLimit(mockLimiter, 'test-ip')
    expect(result).not.toBeNull()
    expect(result!.success).toBe(true)
    expect(result!.remaining).toBe(99)
  })

  it('returns null when limiter throws (Redis down)', async () => {
    const brokenLimiter = {
      limit: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
    } as any

    const result = await checkRateLimit(brokenLimiter, 'test-ip')
    expect(result).toBeNull()
  })

  it('returns failure when rate limit exceeded', async () => {
    const exhaustedLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 600000,
      }),
    } as any

    const result = await checkRateLimit(exhaustedLimiter, 'spam-ip')
    expect(result).not.toBeNull()
    expect(result!.success).toBe(false)
    expect(result!.remaining).toBe(0)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyTurnstileToken } from '@/lib/turnstile'

describe('Turnstile verification', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns true in dev when TURNSTILE_SECRET_KEY is not set', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.NODE_ENV = 'development'

    const result = await verifyTurnstileToken('any-token')
    expect(result).toBe(true)
  })

  it('returns false in production when TURNSTILE_SECRET_KEY is not set', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.NODE_ENV = 'production'

    const result = await verifyTurnstileToken('any-token')
    expect(result).toBe(false)
  })

  it('calls Cloudflare API when secret is configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret'

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })
    global.fetch = mockFetch

    const result = await verifyTurnstileToken('valid-token', '127.0.0.1')

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('valid-token'),
      })
    )
  })

  it('returns false when Cloudflare rejects the token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret'

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    })

    const result = await verifyTurnstileToken('invalid-token')
    expect(result).toBe(false)
  })

  it('returns false on network errors', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret'

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await verifyTurnstileToken('some-token')
    expect(result).toBe(false)
  })
})

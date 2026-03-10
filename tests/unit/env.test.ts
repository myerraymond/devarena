import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

describe('environment variable validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('validates NEXTAUTH_SECRET is at least 32 chars', () => {
    const schema = z.object({
      NEXTAUTH_SECRET: z.string().min(32),
    })

    // Valid
    expect(
      schema.safeParse({ NEXTAUTH_SECRET: 'a'.repeat(32) }).success
    ).toBe(true)

    // Too short
    expect(
      schema.safeParse({ NEXTAUTH_SECRET: 'short' }).success
    ).toBe(false)
  })

  it('validates CRON_SECRET is at least 16 chars', () => {
    const schema = z.object({
      CRON_SECRET: z.string().min(16),
    })

    expect(
      schema.safeParse({ CRON_SECRET: 'a'.repeat(16) }).success
    ).toBe(true)

    expect(
      schema.safeParse({ CRON_SECRET: 'short' }).success
    ).toBe(false)
  })

  it('validates URLs are valid format', () => {
    const schema = z.object({
      NEXTAUTH_URL: z.string().url(),
    })

    expect(
      schema.safeParse({ NEXTAUTH_URL: 'https://devarena.app' }).success
    ).toBe(true)

    expect(
      schema.safeParse({ NEXTAUTH_URL: 'not-a-url' }).success
    ).toBe(false)
  })
})

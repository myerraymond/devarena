import { describe, it, expect } from 'vitest'
import { isValidUsername, leaderboardQuerySchema, emailSchema } from '@/lib/validation'

describe('isValidUsername', () => {
  it('accepts valid GitHub usernames', () => {
    expect(isValidUsername('myer')).toBe(true)
    expect(isValidUsername('alice-bob')).toBe(true)
    expect(isValidUsername('user123')).toBe(true)
    expect(isValidUsername('a')).toBe(true)
    expect(isValidUsername('A1b2C3')).toBe(true)
  })

  it('rejects invalid usernames', () => {
    expect(isValidUsername('')).toBe(false)
    expect(isValidUsername('-startdash')).toBe(false)
    expect(isValidUsername('enddash-')).toBe(false)
    expect(isValidUsername('has spaces')).toBe(false)
    expect(isValidUsername('has@symbol')).toBe(false)
    expect(isValidUsername('has.dot')).toBe(false)
    expect(isValidUsername('../etc/passwd')).toBe(false)
    expect(isValidUsername('<script>alert(1)</script>')).toBe(false)
  })

  it('rejects usernames over 39 characters', () => {
    expect(isValidUsername('a'.repeat(39))).toBe(true)
    expect(isValidUsername('a'.repeat(40))).toBe(false)
  })
})

describe('leaderboardQuerySchema', () => {
  it('parses valid params', () => {
    const result = leaderboardQuerySchema.parse({
      timeframe: 'week',
      page: '1',
      limit: '50',
    })
    expect(result.timeframe).toBe('week')
    expect(result.page).toBe(1)
    expect(result.limit).toBe(50)
  })

  it('uses defaults for missing params', () => {
    const result = leaderboardQuerySchema.parse({})
    expect(result.timeframe).toBe('week')
    expect(result.page).toBe(1)
    expect(result.limit).toBe(50)
  })

  it('rejects invalid timeframe', () => {
    const result = leaderboardQuerySchema.safeParse({ timeframe: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('clamps limit to 100', () => {
    const result = leaderboardQuerySchema.safeParse({ limit: '200' })
    expect(result.success).toBe(false)
  })
})

describe('emailSchema', () => {
  it('accepts valid emails', () => {
    const result = emailSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse({ email: 'notanemail' }).success).toBe(false)
    expect(emailSchema.safeParse({ email: '' }).success).toBe(false)
    expect(emailSchema.safeParse({}).success).toBe(false)
  })
})

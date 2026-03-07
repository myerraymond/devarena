import { describe, it, expect, vi } from 'vitest'

// Mock supabase before importing leagues
vi.mock('@/lib/supabase', () => ({
  supabase: {
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
    }),
  },
}))

import { assignLeagueTier, getTierForPercentile } from '@/lib/leagues'

describe('getTierForPercentile', () => {
  it('returns diamond for top 1%', () => {
    expect(getTierForPercentile(0.005)).toBe('diamond')
    expect(getTierForPercentile(0.01)).toBe('diamond')
  })

  it('returns platinum for top 5%', () => {
    expect(getTierForPercentile(0.02)).toBe('platinum')
    expect(getTierForPercentile(0.05)).toBe('platinum')
  })

  it('returns gold for top 15%', () => {
    expect(getTierForPercentile(0.10)).toBe('gold')
    expect(getTierForPercentile(0.15)).toBe('gold')
  })

  it('returns silver for top 35%', () => {
    expect(getTierForPercentile(0.20)).toBe('silver')
    expect(getTierForPercentile(0.35)).toBe('silver')
  })

  it('returns bronze for everyone else', () => {
    expect(getTierForPercentile(0.50)).toBe('bronze')
    expect(getTierForPercentile(1.0)).toBe('bronze')
  })
})

describe('assignLeagueTier', () => {
  // 100 users, scores 10..1000
  const allScores = Array.from({ length: 100 }, (_, i) => (i + 1) * 10)

  it('assigns Diamond to the top scorer', () => {
    // Score 1000 → rank 1 out of 100 → percentile 0.01 → diamond
    expect(assignLeagueTier(1000, allScores)).toBe('diamond')
  })

  it('assigns Bronze to the lowest scorer', () => {
    // Score 10 → rank 100 out of 100 → percentile 1.0 → bronze
    expect(assignLeagueTier(10, allScores)).toBe('bronze')
  })

  it('assigns correct middle tiers', () => {
    // Score 980 → rank 3 out of 100 → percentile 0.03 → platinum
    expect(assignLeagueTier(980, allScores)).toBe('platinum')
    // Score 900 → rank 11 out of 100 → percentile 0.11 → gold
    expect(assignLeagueTier(900, allScores)).toBe('gold')
    // Score 700 → rank 31 out of 100 → percentile 0.31 → silver
    expect(assignLeagueTier(700, allScores)).toBe('silver')
  })

  it('returns bronze for empty scores array', () => {
    expect(assignLeagueTier(100, [])).toBe('bronze')
  })

  it('handles a single user', () => {
    // 1 user → rank 1 out of 1 → percentile 1.0 → bronze? No: 1/1 = 1.0
    // Actually with 1 user: rank 1, percentile = 1/1 = 1.0 → bronze
    // But for a leaderboard with 1 person, they are "top 100%" which is bronze
    // This is expected behavior
    expect(assignLeagueTier(500, [500])).toBe('bronze')
  })
})

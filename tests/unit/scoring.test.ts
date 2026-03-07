import { describe, it, expect } from 'vitest'
import { calculateBuilderScore } from '@/lib/scoring'

describe('calculateBuilderScore', () => {
  it('calculates correct score with all inputs', () => {
    const result = calculateBuilderScore({
      commits: 10,
      prs: 3,
      activeDays: 5,
      repos: 2,
    })
    // (10×1) + (3×4) + (5×3) + (2×5) = 10 + 12 + 15 + 10 = 47
    expect(result).toBe(47)
  })

  it('returns 0 for empty activity', () => {
    expect(
      calculateBuilderScore({
        commits: 0,
        prs: 0,
        activeDays: 0,
        repos: 0,
      })
    ).toBe(0)
  })

  it('caps commits at 15 per day limit', () => {
    const result = calculateBuilderScore({
      commits: 100,
      prs: 0,
      activeDays: 1,
      repos: 1,
    })
    // commits capped at 15 (1 day × 15)
    // (15×1) + (0×4) + (1×3) + (1×5) = 23
    expect(result).toBe(23)
    expect(result).toBeLessThanOrEqual(15 * 1 + 1 * 3 + 1 * 5)
  })

  it('uses validCommits instead of commits when provided', () => {
    const result = calculateBuilderScore({
      commits: 10,
      validCommits: 3,
      prs: 0,
      activeDays: 1,
      repos: 1,
    })
    // validCommits=3, (3×1) + (0×4) + (1×3) + (1×5) = 11
    expect(result).toBe(3 * 1 + 1 * 3 + 1 * 5)
  })

  it('handles large active days correctly', () => {
    const result = calculateBuilderScore({
      commits: 50,
      prs: 10,
      activeDays: 7,
      repos: 3,
    })
    // commits capped at 7×15 = 105, so 50 is under cap
    // (50×1) + (10×4) + (7×3) + (3×5) = 50 + 40 + 21 + 15 = 126
    expect(result).toBe(126)
  })

  it('weights PRs more than commits', () => {
    const commitsOnly = calculateBuilderScore({
      commits: 4,
      prs: 0,
      activeDays: 0,
      repos: 0,
    })
    const prsOnly = calculateBuilderScore({
      commits: 0,
      prs: 1,
      activeDays: 0,
      repos: 0,
    })
    // 1 PR = 4 points, same as 4 commits
    expect(prsOnly).toBe(commitsOnly)
  })

  it('never returns a negative score', () => {
    const result = calculateBuilderScore({
      commits: 0,
      prs: 0,
      activeDays: 0,
      repos: 0,
    })
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

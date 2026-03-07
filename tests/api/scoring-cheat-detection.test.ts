import { describe, it, expect } from 'vitest'
import { isActivitySuspicious } from '@/lib/scoring'

describe('cheat detection', () => {
  it('flags users with >30 commits in a day', () => {
    expect(isActivitySuspicious({ commitsToday: 31 })).toBe(true)
  })

  it('does not flag 30 or fewer commits', () => {
    expect(isActivitySuspicious({ commitsToday: 30 })).toBe(false)
    expect(isActivitySuspicious({ commitsToday: 15 })).toBe(false)
  })

  it('flags users with 100% commits to a solo repo', () => {
    expect(
      isActivitySuspicious({
        totalCommits: 50,
        commitsToSingleRepo: 50,
        repoContributorCount: 1,
      })
    ).toBe(true)
  })

  it('does not flag when repo has multiple contributors', () => {
    expect(
      isActivitySuspicious({
        totalCommits: 50,
        commitsToSingleRepo: 50,
        repoContributorCount: 5,
      })
    ).toBe(false)
  })

  it('does not flag normal activity', () => {
    expect(
      isActivitySuspicious({
        commitsToday: 8,
        totalCommits: 20,
        commitsToSingleRepo: 10,
        repoContributorCount: 5,
      })
    ).toBe(false)
  })

  it('does not flag when no metrics are provided', () => {
    expect(isActivitySuspicious({})).toBe(false)
  })

  it('flags even when only commitsToday is suspicious', () => {
    expect(
      isActivitySuspicious({
        commitsToday: 100,
        totalCommits: 20,
        commitsToSingleRepo: 5,
        repoContributorCount: 10,
      })
    ).toBe(true)
  })
})

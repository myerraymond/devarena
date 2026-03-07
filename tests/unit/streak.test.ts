import { describe, it, expect } from 'vitest'
import { calculateStreak } from '@/lib/streak'

describe('calculateStreak', () => {
  it('returns 0 for no activity', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('counts consecutive days correctly', () => {
    const days = [
      { date: '2026-03-07', count: 5 },
      { date: '2026-03-06', count: 3 },
      { date: '2026-03-05', count: 8 },
      { date: '2026-03-04', count: 0 }, // break
      { date: '2026-03-03', count: 2 },
    ]
    expect(calculateStreak(days)).toBe(3)
  })

  it('breaks streak on zero day', () => {
    const days = [
      { date: '2026-03-07', count: 0 },
      { date: '2026-03-06', count: 5 },
    ]
    expect(calculateStreak(days)).toBe(0)
  })

  it('handles single day streak', () => {
    const days = [
      { date: '2026-03-07', count: 3 },
      { date: '2026-03-06', count: 0 },
    ]
    expect(calculateStreak(days)).toBe(1)
  })

  it('handles 100+ day streaks', () => {
    const days = Array.from({ length: 120 }, (_, i) => {
      const date = new Date('2026-03-07')
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        count: 5,
      }
    })
    expect(calculateStreak(days)).toBe(120)
  })

  it('handles unsorted input', () => {
    const days = [
      { date: '2026-03-05', count: 8 },
      { date: '2026-03-07', count: 5 },
      { date: '2026-03-06', count: 3 },
      { date: '2026-03-04', count: 0 },
    ]
    // Sorted: 07=5, 06=3, 05=8, 04=0 → streak = 3
    expect(calculateStreak(days)).toBe(3)
  })

  it('returns 0 for all-zero days', () => {
    const days = [
      { date: '2026-03-07', count: 0 },
      { date: '2026-03-06', count: 0 },
      { date: '2026-03-05', count: 0 },
    ]
    expect(calculateStreak(days)).toBe(0)
  })

  it('handles null/undefined input gracefully', () => {
    expect(calculateStreak(null as any)).toBe(0)
    expect(calculateStreak(undefined as any)).toBe(0)
  })
})

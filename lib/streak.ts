/**
 * Pure function to calculate a contribution streak from a list of
 * { date, count } entries sorted most-recent-first.
 *
 * Returns the number of consecutive days (from today backwards)
 * where count > 0. Stops at the first day with count === 0.
 */
export function calculateStreak(
  days: Array<{ date: string; count: number }>
): number {
  if (!days || days.length === 0) return 0

  // Sort by date descending so most recent is first
  const sorted = [...days].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  let streak = 0
  for (const day of sorted) {
    if (day.count > 0) {
      streak++
    } else {
      // First zero breaks the streak
      break
    }
  }

  return streak
}

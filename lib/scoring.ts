// ── Builder Score Calculation ──────────────────────────────
// Pure functions for scoring, extracted for testability.

const MAX_COMMITS_PER_DAY = 15

export interface ScoringInput {
  commits: number
  /** If provided, only valid commits are counted (with > MIN_COMMIT_DIFF lines changed) */
  validCommits?: number
  prs: number
  activeDays: number
  repos: number
}

/**
 * Calculates a builder score from GitHub activity.
 * Formula: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5)
 *
 * Commits are capped at MAX_COMMITS_PER_DAY × activeDays.
 * If `validCommits` is provided, it is used instead of `commits`.
 */
export function calculateBuilderScore(input: ScoringInput): number {
  const { prs, activeDays, repos } = input

  // Use validCommits if provided, otherwise use commits
  let commits = input.validCommits !== undefined ? input.validCommits : input.commits

  // Cap commits per day to prevent gaming
  const maxCommits = Math.max(activeDays, 1) * MAX_COMMITS_PER_DAY
  commits = Math.min(commits, maxCommits)

  return (commits * 1) + (prs * 4) + (activeDays * 3) + (repos * 5)
}

// ── Cheat / Suspicious Activity Detection ─────────────────

export interface ActivityMetrics {
  /** Number of commits today */
  commitsToday?: number
  /** Total commits in the period */
  totalCommits?: number
  /** Commits to a single repo in the period */
  commitsToSingleRepo?: number
  /** Number of contributors to that repo */
  repoContributorCount?: number
}

/**
 * Returns true if the activity pattern looks suspicious / bot-like.
 *
 * Flags:
 * – More than 30 commits in a single day
 * – 100% of commits to a single-contributor repo (self-farming)
 */
export function isActivitySuspicious(metrics: ActivityMetrics): boolean {
  // Flag 1: too many commits in one day
  if (metrics.commitsToday !== undefined && metrics.commitsToday > 30) {
    return true
  }

  // Flag 2: all commits to a solo repo (self-farming pattern)
  if (
    metrics.totalCommits !== undefined &&
    metrics.commitsToSingleRepo !== undefined &&
    metrics.repoContributorCount !== undefined &&
    metrics.totalCommits > 0 &&
    metrics.commitsToSingleRepo >= metrics.totalCommits &&
    metrics.repoContributorCount <= 1
  ) {
    return true
  }

  return false
}

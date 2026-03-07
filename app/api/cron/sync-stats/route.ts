import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { insertFeedEvent } from '@/lib/feed'

// Vercel Pro: allow up to 60s for syncing all users
export const maxDuration = 60

const STREAK_MILESTONES = [100, 50, 30, 14, 7]
const MAX_COMMITS_PER_DAY = 15
const MIN_COMMIT_DIFF = 5 // additions + deletions must exceed this

// ═══════════════════════════════════════════════════════
// ── GRAPHQL QUERIES ──
// ═══════════════════════════════════════════════════════

// Query 1: Contribution aggregates + calendar for week/month windows
function buildContributionsQuery(
  username: string,
  sevenDaysAgo: string,
  thirtyDaysAgo: string,
  now: string
) {
  return `{
    user(login: "${username}") {
      month: contributionsCollection(from: "${thirtyDaysAgo}", to: "${now}") {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoriesWithContributedCommits
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
      week: contributionsCollection(from: "${sevenDaysAgo}", to: "${now}") {
        totalCommitContributions
        totalPullRequestContributions
        totalRepositoriesWithContributedCommits
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }`
}

// Query 2: Detailed commit history (additions/deletions) + merged PRs
function buildDetailedQuery(username: string, sinceISO: string) {
  return `{
    user(login: "${username}") {
      repositories(
        first: 15
        orderBy: { field: PUSHED_AT, direction: DESC }
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      ) {
        nodes {
          nameWithOwner
          owner { login }
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 50, since: "${sinceISO}") {
                  nodes {
                    additions
                    deletions
                    committedDate
                    author {
                      user { login }
                    }
                  }
                }
              }
            }
          }
        }
      }
      pullRequests(
        first: 40
        states: MERGED
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          mergedAt
          repository {
            owner { login }
          }
        }
      }
    }
  }`
}

// ═══════════════════════════════════════════════════════
// ── HELPER FUNCTIONS ──
// ═══════════════════════════════════════════════════════

function calculateStreak(
  contributionDays: Array<{ date: string; contributionCount: number }>
): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const contributionsMap = new Map<string, number>()
  contributionDays.forEach((day) => {
    contributionsMap.set(day.date, day.contributionCount)
  })

  let streak = 0
  const checkDate = new Date(today)

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const count = contributionsMap.get(dateStr) || 0

    if (count > 0) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      if (streak === 0 && checkDate.getTime() === today.getTime()) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }
      break
    }

    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(today.getFullYear() - 1)
    if (checkDate < oneYearAgo) break
  }

  return streak
}

function countActiveDays(
  contributionDays: Array<{ date: string; contributionCount: number }>,
  startDate: string,
  endDate: string
): number {
  return contributionDays.filter(
    (d) => d.date >= startDate && d.date <= endDate && d.contributionCount > 0
  ).length
}

async function fetchTopLanguage(
  username: string,
  token: string
): Promise<string | null> {
  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=pushed&per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    )
    if (!reposRes.ok) return null

    const repos: Array<{ full_name: string; fork: boolean }> = await reposRes.json()
    const repo = repos.find((r) => !r.fork) || repos[0]
    if (!repo) return null

    const langRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/languages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    )
    if (!langRes.ok) return null

    const languages: Record<string, number> = await langRes.json()
    const entries = Object.entries(languages)
    if (entries.length === 0) return null

    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════
// ── DETAILED ACTIVITY PROCESSING ──
// ═══════════════════════════════════════════════════════

interface DetailedActivityResult {
  /** Quality-filtered, daily-capped commits in the last 7 days */
  qualityWeekCommits: number
  /** Quality-filtered, daily-capped commits in the last 30 days */
  qualityMonthCommits: number
  /** PRs merged into repos the user OWNS (last 7 days) */
  weekInternalPrs: number
  /** PRs merged into repos the user does NOT own (last 7 days) */
  weekExternalPrs: number
  /** Internal PRs last 30 days */
  monthInternalPrs: number
  /** External PRs last 30 days */
  monthExternalPrs: number
  /** Should the user be flagged for suspicious activity */
  isFlagged: boolean
  /** Reason for flagging (empty if not flagged) */
  flagReason: string
}

async function fetchAndProcessDetailedActivity(
  username: string,
  token: string,
  thirtyDaysAgoISO: string,
  sevenDaysAgoDate: string,
  todayDate: string
): Promise<DetailedActivityResult | null> {
  try {
    const query = buildDetailedQuery(username, thirtyDaysAgoISO)

    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) return null
    const data = await res.json()
    if (data.errors?.length) return null

    const ghUser = data.data?.user
    if (!ghUser) return null

    // ── Collect all commits by this user with quality data ──
    const allCommits: Array<{
      additions: number
      deletions: number
      date: string
      repo: string
      repoOwner: string
    }> = []

    // Track unique authors per repo for flagging
    const repoAuthors = new Map<string, Set<string>>()

    for (const repo of ghUser.repositories?.nodes || []) {
      const repoName: string = repo.nameWithOwner || ''
      const repoOwner: string = repo.owner?.login || ''
      const commits = repo.defaultBranchRef?.target?.history?.nodes || []

      if (!repoAuthors.has(repoName)) repoAuthors.set(repoName, new Set())

      for (const commit of commits) {
        const authorLogin: string | null = commit.author?.user?.login || null
        if (authorLogin) repoAuthors.get(repoName)!.add(authorLogin)

        // Only count commits authored by this user
        if (authorLogin?.toLowerCase() !== username.toLowerCase()) continue

        allCommits.push({
          additions: commit.additions || 0,
          deletions: commit.deletions || 0,
          date: (commit.committedDate || '').split('T')[0],
          repo: repoName,
          repoOwner,
        })
      }
    }

    // ── 1. Filter: only count commits where additions + deletions > 5 ──
    const qualityCommits = allCommits.filter(
      (c) => c.additions + c.deletions > MIN_COMMIT_DIFF
    )

    // ── 2. Cap at MAX_COMMITS_PER_DAY per day ──
    const commitsByDate = new Map<string, typeof qualityCommits>()
    for (const c of qualityCommits) {
      if (!commitsByDate.has(c.date)) commitsByDate.set(c.date, [])
      commitsByDate.get(c.date)!.push(c)
    }

    let qualityWeekCommits = 0
    let qualityMonthCommits = 0

    for (const [date, commits] of commitsByDate) {
      const capped = Math.min(commits.length, MAX_COMMITS_PER_DAY)
      qualityMonthCommits += capped
      if (date >= sevenDaysAgoDate && date <= todayDate) {
        qualityWeekCommits += capped
      }
    }

    // ── 3. Classify PRs: internal vs external ──
    let weekInternalPrs = 0
    let weekExternalPrs = 0
    let monthInternalPrs = 0
    let monthExternalPrs = 0

    const thirtyDaysAgoDate = new Date(thirtyDaysAgoISO).toISOString().split('T')[0]

    for (const pr of ghUser.pullRequests?.nodes || []) {
      const mergedDate = (pr.mergedAt || '').split('T')[0]
      if (!mergedDate) continue

      const prOwner: string = pr.repository?.owner?.login || ''
      const isExternal =
        prOwner.toLowerCase() !== username.toLowerCase()

      if (mergedDate >= thirtyDaysAgoDate && mergedDate <= todayDate) {
        if (isExternal) monthExternalPrs++
        else monthInternalPrs++
      }
      if (mergedDate >= sevenDaysAgoDate && mergedDate <= todayDate) {
        if (isExternal) weekExternalPrs++
        else weekInternalPrs++
      }
    }

    // ── 4. Flagging checks ──
    let isFlagged = false
    let flagReason = ''

    // Flag A: > 30 raw commits today (use unfiltered count)
    const rawCommitsToday = allCommits.filter(
      (c) => c.date === todayDate
    ).length
    if (rawCommitsToday > 30) {
      isFlagged = true
      flagReason = `${rawCommitsToday} commits today (threshold: 30)`
    }

    // Flag B: >80% of commits go to a single repo with 0 other contributors
    if (!isFlagged && allCommits.length > 5) {
      const commitsByRepo = new Map<string, number>()
      for (const c of allCommits) {
        commitsByRepo.set(c.repo, (commitsByRepo.get(c.repo) || 0) + 1)
      }

      for (const [repo, count] of commitsByRepo) {
        const ratio = count / allCommits.length
        if (ratio > 0.8) {
          const authors = repoAuthors.get(repo) || new Set()
          // "0 other contributors" = only the user is a commit author
          if (authors.size <= 1) {
            isFlagged = true
            flagReason = `${Math.round(ratio * 100)}% of commits to ${repo} (sole contributor)`
            break
          }
        }
      }
    }

    return {
      qualityWeekCommits,
      qualityMonthCommits,
      weekInternalPrs,
      weekExternalPrs,
      monthInternalPrs,
      monthExternalPrs,
      isFlagged,
      flagReason,
    }
  } catch (err) {
    console.warn(
      `[sync] Detailed activity query failed for ${username}:`,
      err instanceof Error ? err.message : err
    )
    return null
  }
}

// ═══════════════════════════════════════════════════════
// ── SYNC A SINGLE USER ──
// ═══════════════════════════════════════════════════════

async function syncUser(
  user: { id: string; github_username: string; github_access_token: string },
  supabase: ReturnType<typeof createServerClient>
): Promise<void> {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const nowISO = now.toISOString()

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysAgoISO = sevenDaysAgo.toISOString()
  const sevenDaysAgoDate = sevenDaysAgo.toISOString().split('T')[0]

  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

  const todayDate = now.toISOString().split('T')[0]

  // ── Query 1: Contribution aggregates + calendar ──
  const contribQuery = buildContributionsQuery(
    user.github_username,
    sevenDaysAgoISO,
    thirtyDaysAgoISO,
    nowISO
  )

  const gqlRes = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${user.github_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: contribQuery }),
  })

  if (!gqlRes.ok) {
    const text = await gqlRes.text()
    throw new Error(`GitHub GraphQL ${gqlRes.status}: ${text.slice(0, 200)}`)
  }

  const gqlData = await gqlRes.json()
  if (gqlData.errors?.length) {
    throw new Error(
      `GraphQL errors: ${gqlData.errors.map((e: any) => e.message).join(', ')}`
    )
  }

  const ghUser = gqlData.data?.user
  if (!ghUser) throw new Error('No user data returned from GitHub')

  const monthData = ghUser.month
  const weekData = ghUser.week

  // Aggregate stats (used for active_days, repos, calendar, streak)
  const monthRepos =
    monthData.totalRepositoriesWithContributedCommits || 0
  const monthCalendarDays = monthData.contributionCalendar.weeks.flatMap(
    (w: any) => w.contributionDays
  ) as Array<{ date: string; contributionCount: number }>
  const monthActiveDays = countActiveDays(
    monthCalendarDays,
    thirtyDaysAgo.toISOString().split('T')[0],
    todayDate
  )

  const weekRepos =
    weekData.totalRepositoriesWithContributedCommits || 0
  const weekCalendarDays = weekData.contributionCalendar.weeks.flatMap(
    (w: any) => w.contributionDays
  ) as Array<{ date: string; contributionCount: number }>
  const weekActiveDays = countActiveDays(
    weekCalendarDays,
    sevenDaysAgoDate,
    todayDate
  )

  // Streak
  const streakDays = calculateStreak(monthCalendarDays)

  // Daily breakdown for activity chart
  const dailyBreakdown: Array<{ date: string; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const day = weekCalendarDays.find((cd) => cd.date === dateStr)
    dailyBreakdown.push({ date: dateStr, count: day?.contributionCount || 0 })
  }

  // ── Query 2: Detailed commit history + PRs (for quality filtering) ──
  const detailed = await fetchAndProcessDetailedActivity(
    user.github_username,
    user.github_access_token,
    thirtyDaysAgoISO,
    sevenDaysAgoDate,
    todayDate
  )

  // Fall back to aggregate counts if detailed query fails
  const rawWeekCommits = weekData.totalCommitContributions || 0
  const rawMonthCommits = monthData.totalCommitContributions || 0
  const rawWeekPrs = weekData.totalPullRequestContributions || 0
  const rawMonthPrs = monthData.totalPullRequestContributions || 0

  const weekCommits = detailed?.qualityWeekCommits ?? rawWeekCommits
  const monthCommits = detailed?.qualityMonthCommits ?? rawMonthCommits

  // PR counts for snapshot storage (total)
  const weekPrsTotal = detailed
    ? detailed.weekInternalPrs + detailed.weekExternalPrs
    : rawWeekPrs
  const monthPrsTotal = detailed
    ? detailed.monthInternalPrs + detailed.monthExternalPrs
    : rawMonthPrs

  // ── Top language via REST ──
  const topLanguage = await fetchTopLanguage(
    user.github_username,
    user.github_access_token
  )

  // ── Calculate builder scores ──
  // score = (quality_commits × 1) + (internal_PRs × 4) + (external_PRs × 8)
  //       + (active_days × 3) + (repos × 5)
  let weekScore: number
  let monthScore: number

  if (detailed) {
    weekScore =
      detailed.qualityWeekCommits * 1 +
      detailed.weekInternalPrs * 4 +
      detailed.weekExternalPrs * 8 +
      weekActiveDays * 3 +
      weekRepos * 5

    monthScore =
      detailed.qualityMonthCommits * 1 +
      detailed.monthInternalPrs * 4 +
      detailed.monthExternalPrs * 8 +
      monthActiveDays * 3 +
      monthRepos * 5
  } else {
    // Fallback: all PRs at 4 points (can't distinguish internal/external)
    weekScore =
      rawWeekCommits * 1 +
      rawWeekPrs * 4 +
      weekActiveDays * 3 +
      weekRepos * 5

    monthScore =
      rawMonthCommits * 1 +
      rawMonthPrs * 4 +
      monthActiveDays * 3 +
      monthRepos * 5
  }

  // ── Previous snapshot for all_time_score delta & feed events ──
  const { data: prevSnapshot } = await supabase
    .from('stats_snapshots')
    .select('id, streak_days, github_streak_days, week_score, all_time_score')
    .eq('user_id', user.id)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const previousStreak =
    prevSnapshot?.streak_days || prevSnapshot?.github_streak_days || 0
  const previousWeekScore = prevSnapshot?.week_score || 0
  const previousAllTimeScore = prevSnapshot?.all_time_score || 0

  const weekDelta =
    weekScore > previousWeekScore ? weekScore - previousWeekScore : 0
  const allTimeScore = previousAllTimeScore + weekDelta

  // ── Upsert stats_snapshots ──
  const snapshotData: Record<string, any> = {
    user_id: user.id,
    week_score: weekScore,
    month_score: monthScore,
    all_time_score: allTimeScore,
    week_commits: weekCommits,
    week_prs: weekPrsTotal,
    month_commits: monthCommits,
    month_prs: monthPrsTotal,
    streak_days: streakDays,
    github_streak_days: streakDays,
    github_commits: monthCommits,
    github_top_language: topLanguage,
    top_language: topLanguage,
    daily_breakdown: dailyBreakdown,
    snapshotted_at: new Date().toISOString(),
  }

  if (prevSnapshot) {
    const { error } = await supabase
      .from('stats_snapshots')
      .update(snapshotData)
      .eq('id', prevSnapshot.id)
    if (error) throw new Error(`Upsert failed: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('stats_snapshots')
      .insert(snapshotData)
    if (error) throw new Error(`Insert failed: ${error.message}`)
  }

  // ── Update is_flagged on users table ──
  if (detailed) {
    const { error: flagError } = await supabase
      .from('users')
      .update({ is_flagged: detailed.isFlagged })
      .eq('id', user.id)

    if (flagError) {
      console.warn(
        `[sync] Failed to update is_flagged for ${user.github_username}:`,
        flagError.message
      )
    }

    if (detailed.isFlagged) {
      console.warn(
        `[sync] ⚠️ FLAGGED ${user.github_username}: ${detailed.flagReason}`
      )
    }
  }

  // ── Generate feed events ──
  if (!prevSnapshot) {
    await insertFeedEvent(user.id, 'first_commit', {})
  }

  if (streakDays > previousStreak) {
    for (const milestone of STREAK_MILESTONES) {
      if (streakDays >= milestone && previousStreak < milestone) {
        await insertFeedEvent(user.id, 'streak_milestone', {
          streak_days: milestone,
        })
        break
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
// ── POST-SYNC MILESTONE CHECKS ──
// ═══════════════════════════════════════════════════════

async function checkRankAndKingMilestones(
  supabase: ReturnType<typeof createServerClient>
) {
  const { data: snapshots } = await supabase
    .from('stats_snapshots')
    .select(
      'user_id, week_score, top_language, github_top_language, snapshotted_at'
    )
    .order('snapshotted_at', { ascending: false })

  if (!snapshots) return

  const userMap = new Map<string, any>()
  for (const s of snapshots) {
    if (!userMap.has(s.user_id)) userMap.set(s.user_id, s)
  }

  const ranked = Array.from(userMap.entries())
    .map(([userId, s]) => ({
      userId,
      score: s.week_score || 0,
      topLang: s.top_language || s.github_top_language,
    }))
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score)

  // Avoid duplicate feed events (check last 6 hours)
  const sixHoursAgo = new Date(
    Date.now() - 6 * 60 * 60 * 1000
  ).toISOString()
  const { data: recentEvents } = await supabase
    .from('feed_events')
    .select('user_id, event_type, payload')
    .gte('created_at', sixHoursAgo)

  const recentEventKeys = new Set(
    (recentEvents || []).map(
      (e: any) =>
        `${e.user_id}:${e.event_type}:${JSON.stringify(e.payload)}`
    )
  )
  const hasRecentEvent = (userId: string, type: string, payload: any) =>
    recentEventKeys.has(`${userId}:${type}:${JSON.stringify(payload)}`)

  // Rank milestones (top 10, top 3, #1)
  const RANK_MILESTONES = [10, 3, 1]
  for (let i = 0; i < Math.min(ranked.length, 10); i++) {
    const user = ranked[i]
    const rank = i + 1
    for (const milestone of RANK_MILESTONES) {
      if (rank <= milestone) {
        const payload = { rank }
        if (!hasRecentEvent(user.userId, 'rank_milestone', payload)) {
          await insertFeedEvent(user.userId, 'rank_milestone', payload)
        }
        break
      }
    }
  }

  // Cracked devs (language #1)
  const languageBest = new Map<
    string,
    { userId: string; score: number }
  >()
  for (const user of ranked) {
    if (!user.topLang) continue
    const current = languageBest.get(user.topLang)
    if (!current || user.score > current.score) {
      languageBest.set(user.topLang, {
        userId: user.userId,
        score: user.score,
      })
    }
  }

  for (const [language, king] of languageBest.entries()) {
    const payload = { language }
    if (!hasRecentEvent(king.userId, 'language_king', payload)) {
      await insertFeedEvent(king.userId, 'language_king', payload)
    }
  }
}

// ═══════════════════════════════════════════════════════
// ── MAIN CRON HANDLER ──
// ═══════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // 1. Verify Authorization
  if (
    request.headers.get('authorization') !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const failed: string[] = []
  let synced = 0

  try {
    // 2. Fetch all users with a GitHub access token
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, github_username, github_access_token')
      .not('github_access_token', 'is', null)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return Response.json({
        synced: 0,
        failed: [],
        duration_ms: Date.now() - startTime,
        message: 'No users with GitHub tokens found',
      })
    }

    // 3. Process each user sequentially with rate limiting
    for (const user of users) {
      try {
        if (!user.github_username || !user.github_access_token) {
          failed.push(user.id)
          continue
        }

        await syncUser(
          {
            id: user.id,
            github_username: user.github_username,
            github_access_token: user.github_access_token,
          },
          supabase
        )

        synced++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(
          `[sync] Failed for ${user.github_username || user.id}: ${msg}`
        )
        failed.push(user.github_username || user.id)
      }

      // Rate limit: 100ms between each user's API calls
      await new Promise((r) => setTimeout(r, 100))
    }

    // 4. Post-sync: check global rank milestones & cracked devs
    try {
      await checkRankAndKingMilestones(supabase)
    } catch (postSyncError) {
      console.warn(
        '[sync] Post-sync milestone check failed:',
        postSyncError
      )
    }

    // 5. Return summary
    return Response.json({
      synced,
      failed,
      duration_ms: Date.now() - startTime,
    })
  } catch (error) {
    console.error('[sync] Cron job error:', error)
    return Response.json(
      {
        synced,
        failed,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

// ═══════════════════════════════════════════════════════════
// ── CONFIG ──
// ═══════════════════════════════════════════════════════════

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Make sure .env.local contains:')
  console.error('     NEXT_PUBLIC_SUPABASE_URL=...')
  console.error('     SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TOTAL_USERS = 200
const BATCH_SIZE = 25

// ═══════════════════════════════════════════════════════════
// ── NAME GENERATION ──
// ═══════════════════════════════════════════════════════════

const firstNames = [
  'alex', 'sarah', 'mike', 'jess', 'david', 'emily', 'chris', 'amy',
  'ryan', 'lisa', 'kevin', 'nicole', 'brian', 'laura', 'tom', 'katie',
  'james', 'rachel', 'daniel', 'megan', 'robert', 'jennifer', 'william',
  'michelle', 'joseph', 'stephanie', 'richard', 'ashley', 'thomas',
  'jessica', 'charles', 'amanda', 'matthew', 'melissa', 'anthony',
  'mark', 'samantha', 'joshua', 'andrew', 'rebecca', 'tyler', 'jacob',
  'ethan', 'noah', 'logan', 'lucas', 'aiden', 'carter', 'avery',
  'jackson', 'grayson', 'lincoln', 'wyatt', 'henry', 'sebastian',
  'julian', 'leo', 'gabriel', 'isaac', 'samuel', 'david', 'luke',
  'owen', 'jack', 'mason', 'emma', 'olivia', 'sophia', 'isabella',
  'harper', 'lily', 'ella', 'grace', 'natalie', 'audrey', 'claire',
  'victoria', 'hazel', 'stella', 'lucy', 'aria', 'scarlett', 'chloe',
  'penelope', 'abigail', 'hannah', 'zoey', 'ellie', 'charlotte',
  'nora', 'mia', 'layla', 'riley', 'zoe', 'elena', 'maya', 'kai',
  'finn', 'max', 'leo', 'nico', 'remi', 'sage', 'blake', 'quinn',
]

const lastNames = [
  'chen', 'smith', 'wang', 'lee', 'jones', 'brown', 'white', 'harris',
  'davis', 'wilson', 'anderson', 'moore', 'garcia', 'rodriguez', 'lopez',
  'thomas', 'jackson', 'clark', 'lewis', 'robinson', 'walker', 'hall',
  'allen', 'young', 'king', 'wright', 'hill', 'scott', 'green', 'adams',
  'baker', 'nelson', 'carter', 'mitchell', 'roberts', 'turner',
  'phillips', 'campbell', 'parker', 'stevens', 'wood', 'rogers', 'reed',
  'cook', 'morgan', 'bell', 'murphy', 'bailey', 'rivera', 'cooper',
  'richardson', 'cox', 'howard', 'ward', 'torres', 'peterson', 'gray',
  'ramirez', 'brooks', 'kelly', 'bennett', 'ross', 'griffin', 'patel',
  'kim', 'liu', 'singh', 'nguyen', 'tanaka', 'sato', 'martinez',
]

const displayNames = new Map<string, string>()

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function generateUsername(index: number): string {
  const first = firstNames[index % firstNames.length]
  const last = lastNames[index % lastNames.length]
  const pattern = index % 8

  switch (pattern) {
    case 0: return `${first}${last}`            // alexchen
    case 1: return `${first}dev`                // sarahdev
    case 2: return `${first}codes`              // mikecodes
    case 3: return `${first}builds`             // jessbuilds
    case 4: return `${first}_${last}`           // david_smith
    case 5: return `${first}${last}${(index % 99) + 1}` // emilywang42
    case 6: return `${first}-${last}`           // chris-lee
    case 7: return `${first}${index}`           // amy7
    default: return `${first}${last}`
  }
}

function generateDisplayName(username: string, index: number): string {
  const first = firstNames[index % firstNames.length]
  const last = lastNames[index % lastNames.length]
  return `${capitalize(first)} ${capitalize(last)}`
}

// ═══════════════════════════════════════════════════════════
// ── LANGUAGE DISTRIBUTION ──
// ═══════════════════════════════════════════════════════════

const LANGUAGE_WEIGHTS: [string, number][] = [
  ['TypeScript', 40],
  ['Python', 20],
  ['JavaScript', 10],
  ['Rust', 8],
  ['Go', 6],
  ['Swift', 4],
  ['Kotlin', 3],
  ['Ruby', 2],
  ['C++', 2],
  ['Java', 2],
  ['C#', 1],
  ['PHP', 1],
  ['Dart', 0.5],
  ['Elixir', 0.25],
  ['Haskell', 0.15],
  ['Zig', 0.1],
]

function pickLanguage(): string {
  const total = LANGUAGE_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [lang, weight] of LANGUAGE_WEIGHTS) {
    r -= weight
    if (r <= 0) return lang
  }
  return 'TypeScript'
}

// ═══════════════════════════════════════════════════════════
// ── PROJECT NAME GENERATION ──
// ═══════════════════════════════════════════════════════════

const projectPrefixes = [
  'portfolio', 'saas-starter', 'cli-tool', 'api-server', 'mobile-app',
  'chrome-extension', 'discord-bot', 'open-source-lib', 'personal-site',
  'ai-project', 'data-pipeline', 'auth-service', 'chat-app', 'blog-engine',
  'task-tracker', 'analytics-dash', 'payment-api', 'cms-lite', 'devtools',
  'config-manager',
]

function pickProject(username: string): string {
  if (Math.random() < 0.15) return `${username}-app`
  return projectPrefixes[Math.floor(Math.random() * projectPrefixes.length)]
}

// ═══════════════════════════════════════════════════════════
// ── HELPERS ──
// ═══════════════════════════════════════════════════════════

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/** Random date between `daysAgo` and now */
function randomDate(daysAgo: number): Date {
  const now = Date.now()
  const past = now - daysAgo * 86_400_000
  return new Date(past + Math.random() * (now - past))
}

/** Random date within the last N hours for feed events */
function randomRecentDate(hoursAgo: number): Date {
  const now = Date.now()
  const past = now - hoursAgo * 3_600_000
  return new Date(past + Math.random() * (now - past))
}

// ═══════════════════════════════════════════════════════════
// ── TIER DEFINITIONS ──
// ═══════════════════════════════════════════════════════════

type Tier = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'

interface TierConfig {
  tier: Tier
  count: number
  weekScore: [number, number]
  streak: [number, number]
  weekCommits: [number, number]
  weekPrs: [number, number]
}

const TIERS: TierConfig[] = [
  { tier: 'diamond',  count: 10,  weekScore: [800, 1200],  streak: [60, 180],  weekCommits: [40, 80],  weekPrs: [8, 15] },
  { tier: 'platinum', count: 20,  weekScore: [400, 800],   streak: [20, 60],   weekCommits: [20, 40],  weekPrs: [4, 8] },
  { tier: 'gold',     count: 40,  weekScore: [200, 400],   streak: [7, 20],    weekCommits: [10, 20],  weekPrs: [1, 4] },
  { tier: 'silver',   count: 60,  weekScore: [80, 200],    streak: [3, 7],     weekCommits: [5, 10],   weekPrs: [0, 2] },
  { tier: 'bronze',   count: 70,  weekScore: [0, 80],      streak: [0, 3],     weekCommits: [0, 5],    weekPrs: [0, 0] },
]

// ═══════════════════════════════════════════════════════════
// ── USER + STAT GENERATION ──
// ═══════════════════════════════════════════════════════════

interface SeedUser {
  id: string
  username: string
  display_name: string
  avatar_url: string
  github_username: string
  user_number: number
  joined_at: string
  is_public: boolean
}

interface SeedSnapshot {
  user_id: string
  week_score: number
  month_score: number
  all_time_score: number
  week_commits: number
  week_prs: number
  month_commits: number
  month_prs: number
  week_pr_reviews: number
  month_pr_reviews: number
  week_issues: number
  month_issues: number
  week_contributions: number
  month_contributions: number
  all_time_contributions: number
  year_commits: number
  all_time_commits: number
  streak_days: number
  github_streak_days: number
  github_commits: number
  github_top_language: string
  top_language: string
  top_project: string | null
  github_followers: number
  github_following: number
  github_public_repos: number
  github_stars: number
  daily_breakdown: Array<{ date: string; count: number }>
  language_breakdown: Array<{ name: string; size: number; percentage: number }>
  snapshotted_at: string
}

function generateDailyBreakdown(avgPerDay: number): Array<{ date: string; count: number }> {
  const breakdown: Array<{ date: string; count: number }> = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay() // 0=Sun, 6=Sat

    // Weekends are ~40% lower
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0
    const variance = randFloat(0.4, 1.6)
    const count = Math.max(0, Math.round(avgPerDay * weekendMultiplier * variance))

    breakdown.push({ date: dateStr, count })
  }
  return breakdown
}

function generateLanguageBreakdown(topLanguage: string): Array<{ name: string; size: number; percentage: number }> {
  const others = LANGUAGE_WEIGHTS
    .map(([l]) => l)
    .filter(l => l !== topLanguage)
    .sort(() => Math.random() - 0.5)
    .slice(0, rand(1, 3))

  const topPct = rand(45, 80)
  let remaining = 100 - topPct
  const result = [{ name: topLanguage, size: rand(50000, 500000), percentage: topPct }]

  for (let i = 0; i < others.length; i++) {
    const pct = i === others.length - 1 ? remaining : rand(5, Math.min(remaining - 5, 30))
    remaining -= pct
    result.push({ name: others[i], size: rand(5000, 100000), percentage: pct })
  }

  return result
}

function buildUserAndStats(
  index: number,
  tierConfig: TierConfig,
  userNumber: number,
): { user: SeedUser; snapshot: SeedSnapshot } {
  const username = generateUsername(index)
  const displayName = generateDisplayName(username, index)
  const topLanguage = pickLanguage()
  const topProject = pickProject(username)

  const weekScore = rand(...tierConfig.weekScore)
  const streakDays = rand(...tierConfig.streak)
  const weekCommits = rand(...tierConfig.weekCommits)
  const weekPrs = rand(...tierConfig.weekPrs)

  // Derive other stats from base
  const monthMultiplier = randFloat(3, 4.5)
  const monthScore = Math.round(weekScore * monthMultiplier)
  const allTimeScore = Math.round(monthScore * randFloat(4, 8))
  const monthCommits = Math.round(weekCommits * monthMultiplier)
  const monthPrs = Math.round(weekPrs * monthMultiplier)
  const weekPrReviews = rand(0, Math.max(0, Math.floor(weekPrs * 0.8)))
  const monthPrReviews = Math.round(weekPrReviews * monthMultiplier)
  const weekIssues = rand(0, Math.max(0, Math.floor(weekCommits / 10)))
  const monthIssues = Math.round(weekIssues * monthMultiplier)
  const weekContributions = weekCommits + weekPrs + weekPrReviews + weekIssues
  const monthContributions = monthCommits + monthPrs + monthPrReviews + monthIssues
  const yearCommits = Math.round(monthCommits * randFloat(8, 14))
  const allTimeCommits = Math.round(yearCommits * randFloat(1.5, 4))
  const allTimeContributions = Math.round(allTimeCommits * randFloat(1.2, 1.5))

  const avgPerDay = weekCommits > 0 ? weekCommits / 7 : 0
  const dailyBreakdown = generateDailyBreakdown(avgPerDay)
  const languageBreakdown = generateLanguageBreakdown(topLanguage)

  const user: SeedUser = {
    id: randomUUID(),
    username,
    display_name: displayName,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    github_username: username,
    user_number: userNumber,
    joined_at: randomDate(180).toISOString(), // Last 6 months
    is_public: Math.random() < 0.95,
  }

  const snapshot: SeedSnapshot = {
    user_id: user.id,
    week_score: weekScore,
    month_score: monthScore,
    all_time_score: allTimeScore,
    week_commits: weekCommits,
    week_prs: weekPrs,
    month_commits: monthCommits,
    month_prs: monthPrs,
    week_pr_reviews: weekPrReviews,
    month_pr_reviews: monthPrReviews,
    week_issues: weekIssues,
    month_issues: monthIssues,
    week_contributions: weekContributions,
    month_contributions: monthContributions,
    all_time_contributions: allTimeContributions,
    year_commits: yearCommits,
    all_time_commits: allTimeCommits,
    streak_days: streakDays,
    github_streak_days: streakDays,
    github_commits: allTimeCommits,
    github_top_language: topLanguage,
    top_language: topLanguage,
    top_project: topProject,
    github_followers: rand(0, tierConfig.tier === 'diamond' ? 5000 : tierConfig.tier === 'platinum' ? 2000 : 500),
    github_following: rand(10, 300),
    github_public_repos: rand(3, 60),
    github_stars: rand(0, tierConfig.tier === 'diamond' ? 3000 : 200),
    daily_breakdown: dailyBreakdown,
    language_breakdown: languageBreakdown,
    snapshotted_at: new Date().toISOString(),
  }

  return { user, snapshot }
}

// ═══════════════════════════════════════════════════════════
// ── FEED EVENT GENERATION ──
// ═══════════════════════════════════════════════════════════

interface FeedEvent {
  user_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

function generateFeedEvents(
  users: SeedUser[],
  snapshots: SeedSnapshot[],
  tiers: Map<string, Tier>,
): FeedEvent[] {
  const events: FeedEvent[] = []
  const snapshotMap = new Map(snapshots.map(s => [s.user_id, s]))

  // Streak milestones for top users
  const streakMilestones = [7, 14, 30, 50, 100]
  const topUsers = users
    .filter(u => {
      const s = snapshotMap.get(u.id)
      return s && s.streak_days >= 7
    })
    .sort((a, b) => (snapshotMap.get(b.id)?.streak_days || 0) - (snapshotMap.get(a.id)?.streak_days || 0))
    .slice(0, 15)

  for (const user of topUsers) {
    const streak = snapshotMap.get(user.id)!.streak_days
    // Find the highest milestone they've crossed
    const milestone = [...streakMilestones].reverse().find(m => streak >= m)
    if (milestone) {
      events.push({
        user_id: user.id,
        event_type: 'streak_milestone',
        payload: { streak_days: milestone },
        created_at: randomRecentDate(168).toISOString(),
      })
    }
  }

  // Language king events — one per unique language among top users
  const langKings = new Map<string, { userId: string; score: number }>()
  for (const snap of snapshots) {
    if (!snap.top_language) continue
    const current = langKings.get(snap.top_language)
    if (!current || snap.week_score > current.score) {
      langKings.set(snap.top_language, { userId: snap.user_id, score: snap.week_score })
    }
  }
  for (const [language, king] of langKings.entries()) {
    events.push({
      user_id: king.userId,
      event_type: 'language_king',
      payload: { language },
      created_at: randomRecentDate(168).toISOString(),
    })
  }

  // Rank milestones for top 10
  const sortedByScore = [...snapshots]
    .sort((a, b) => b.week_score - a.week_score)
    .slice(0, 10)
  for (let i = 0; i < sortedByScore.length; i++) {
    events.push({
      user_id: sortedByScore[i].user_id,
      event_type: 'rank_milestone',
      payload: { rank: i + 1 },
      created_at: randomRecentDate(168).toISOString(),
    })
  }

  // first_commit for recently joined users
  const recentJoiners = users
    .filter(u => {
      const joinedDaysAgo = (Date.now() - new Date(u.joined_at).getTime()) / 86_400_000
      return joinedDaysAgo < 14
    })
    .slice(0, 10)
  for (const user of recentJoiners) {
    events.push({
      user_id: user.id,
      event_type: 'first_commit',
      payload: {},
      created_at: randomRecentDate(168).toISOString(),
    })
  }

  // Trim to ~50 events, randomized
  events.sort(() => Math.random() - 0.5)
  return events.slice(0, 50)
}

// ═══════════════════════════════════════════════════════════
// ── MAIN SEED ──
// ═══════════════════════════════════════════════════════════

async function seed() {
  console.log('🌱 Seeding DevArena with 200 realistic users...\n')

  // ── 1. Generate all users and snapshots ──
  const allUsers: SeedUser[] = []
  const allSnapshots: SeedSnapshot[] = []
  const userTiers = new Map<string, Tier>()
  const tierCounts: Record<Tier, number> = { diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }

  let userIndex = 0
  const usedUsernames = new Set<string>()

  for (const tierConfig of TIERS) {
    for (let i = 0; i < tierConfig.count; i++) {
      // Ensure unique usernames
      let attempt = 0
      while (usedUsernames.has(generateUsername(userIndex)) && attempt < 50) {
        userIndex++
        attempt++
      }

      const { user, snapshot } = buildUserAndStats(userIndex, tierConfig, userIndex + 1)

      // Deduplicate
      if (usedUsernames.has(user.username)) {
        user.username = `${user.username}${rand(100, 999)}`
        user.github_username = user.username
        user.avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      }

      usedUsernames.add(user.username)
      allUsers.push(user)
      allSnapshots.push(snapshot)
      userTiers.set(user.id, tierConfig.tier)
      tierCounts[tierConfig.tier]++
      userIndex++
    }
  }

  console.log(`   Generated ${allUsers.length} users`)
  console.log(`   Diamond: ${tierCounts.diamond}, Platinum: ${tierCounts.platinum}, Gold: ${tierCounts.gold}, Silver: ${tierCounts.silver}, Bronze: ${tierCounts.bronze}\n`)

  // ── 2. Insert users in batches ──
  console.log('📝 Inserting users...')
  for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
    const batch = allUsers.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('users')
      .upsert(batch, { onConflict: 'github_username' })

    if (error) {
      console.error(`   ❌ Error inserting user batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
      // Try inserting one by one to find the problem
      for (const u of batch) {
        const { error: singleErr } = await supabase.from('users').upsert(u, { onConflict: 'github_username' })
        if (singleErr) console.error(`      ↳ Failed: ${u.username} — ${singleErr.message}`)
      }
    }
  }
  console.log(`   ✓ Inserted ${allUsers.length} users\n`)

  // ── 3. Insert stats snapshots ──
  console.log('📊 Inserting stats snapshots...')
  for (let i = 0; i < allSnapshots.length; i += BATCH_SIZE) {
    const batch = allSnapshots.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('stats_snapshots')
      .insert(batch)
    
    if (error) {
      console.error(`   ❌ Error inserting stats batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    }
  }
  console.log(`   ✓ Inserted ${allSnapshots.length} snapshots\n`)

  // ── 4. Create season + league memberships ──
  console.log('🏆 Creating season and league memberships...')

  // Deactivate any existing seasons
  await supabase.from('seasons').update({ is_active: false }).eq('is_active', true)

  const seasonId = randomUUID()
  const { error: seasonError } = await supabase.from('seasons').insert({
    id: seasonId,
    name: 'Season 1 · March 2026',
    starts_at: '2026-03-01T00:00:00Z',
    ends_at: '2026-03-31T23:59:59Z',
    is_active: true,
  })
  if (seasonError) console.error('   ❌ Season insert error:', seasonError.message)
  else console.log('   ✓ Created Season 1 · March 2026')

  // Sort users by week_score descending for rank assignment
  const rankedSnapshots = [...allSnapshots].sort((a, b) => b.week_score - a.week_score)

  const memberships = rankedSnapshots.map((snap, i) => {
    const tier = userTiers.get(snap.user_id) || 'bronze'
    return {
      user_id: snap.user_id,
      season_id: seasonId,
      tier,
      end_rank: i + 1,
      promoted: null,
      relegated: null,
    }
  })

  for (let i = 0; i < memberships.length; i += BATCH_SIZE) {
    const batch = memberships.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('league_memberships').insert(batch)
    if (error) console.error(`   ❌ League membership batch error:`, error.message)
  }
  console.log(`   ✓ Assigned ${memberships.length} league memberships\n`)

  // ── 5. Generate feed events ──
  console.log('📰 Generating feed events...')
  const feedEvents = generateFeedEvents(allUsers, allSnapshots, userTiers)

  if (feedEvents.length > 0) {
    const { error: feedError } = await supabase.from('feed_events').insert(feedEvents)
    if (feedError) console.error('   ❌ Feed events insert error:', feedError.message)
  }
  console.log(`   ✓ Created ${feedEvents.length} feed events\n`)

  // ── 6. Log language kings ──
  const langKings = new Map<string, { username: string; score: number }>()
  for (let i = 0; i < allSnapshots.length; i++) {
    const snap = allSnapshots[i]
    const user = allUsers[i]
    if (!snap.top_language) continue
    const current = langKings.get(snap.top_language)
    if (!current || snap.week_score > current.score) {
      langKings.set(snap.top_language, { username: user.username, score: snap.week_score })
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ── SUMMARY ──
  // ═══════════════════════════════════════════════════════════

  console.log('═'.repeat(50))
  console.log('✅ SEED COMPLETE')
  console.log('═'.repeat(50))
  console.log(`✓ Seeded ${allUsers.length} users`)
  console.log(`✓ Diamond:  ${tierCounts.diamond}`)
  console.log(`✓ Platinum: ${tierCounts.platinum}`)
  console.log(`✓ Gold:     ${tierCounts.gold}`)
  console.log(`✓ Silver:   ${tierCounts.silver}`)
  console.log(`✓ Bronze:   ${tierCounts.bronze}`)
  console.log(`✓ Feed events: ${feedEvents.length}`)
  console.log(`✓ Language kings:`)
  for (const [lang, king] of [...langKings.entries()].sort((a, b) => b[1].score - a[1].score)) {
    console.log(`    👑 ${lang.padEnd(14)} → ${king.username} (${king.score} pts)`)
  }
  console.log('')
}

seed()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Seed failed:', err)
    process.exit(1)
  })

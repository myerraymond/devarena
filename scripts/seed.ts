import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Make sure .env.local contains:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// List of realistic GitHub usernames
const usernames = [
  'alexchen', 'sarahdev', 'mikebuilds', 'jesscode', 'davidsmith',
  'emilywang', 'chrislee', 'amytaylor', 'ryanmartin', 'lisajones',
  'kevinbrown', 'nicolewhite', 'brianharris', 'lauradavis', 'tomwilson',
  'katieanderson', 'jamesmoore', 'rachelgarcia', 'danielrodriguez', 'meganlopez',
  'robertthomas', 'jenniferjackson', 'williamlee', 'michelleclark', 'josephlewis',
  'stephanierobinson', 'richardwalker', 'ashleyhall', 'thomasallen', 'jessicayoung',
  'charlesking', 'amandawright', 'christopherhill', 'melissascott', 'matthewgreen',
  'stephanieadams', 'anthonybaker', 'michellenelson', 'markcarter', 'samanthamitchell',
  'joshuaroberts', 'stephanieturner', 'andrewphillips', 'rebeccacampbell', 'ryanparker',
  'laurenstevens', 'justinwood', 'kellyrogers', 'brandonreed', 'nicolecook',
  'tylermorgan', 'jenniferbell', 'jacobmurphy', 'sarahbailey', 'ethanrivera',
  'emilycooper', 'noahrichardson', 'hannahcox', 'loganhoward', 'oliviaward',
  'lucastorres', 'sophiapeterson', 'aidengray', 'isabellaramirez', 'carterjames',
  'avawatson', 'jacksonbrooks', 'charlottekelly', 'averybennett', 'harperwood',
  'graysonross', 'elliegriffin', 'lincolnclark', 'lilyrodriguez', 'wyattlewis',
  'zoeylee', 'henrywalker', 'chloehall', 'sebastianallen', 'victoriayoung',
  'julianking', 'gracewright', 'adrianhill', 'nataliescott', 'leogreen',
  'audreyadams', 'gabrielnelson', 'clairecarter', 'isaacmitchell', 'peneloperoberts',
  'samuelturner', 'hazelphillips', 'davidcampbell', 'stellaward', 'josephparker',
  'lucystevens', 'danielwood', 'ariarogers', 'matthewreed', 'scarlettcook',
  'lukemorgan', 'chloeellbell', 'owenmurphy', 'lillianbailey', 'jackrivera',
  'emmacook', 'masoncooper', 'abigailrichardson', 'logancox', 'sophiahoward',
]

// Languages for variety
const languages = [
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB',
  'Shell', 'HTML', 'CSS', 'Vue', 'React', 'Svelte', 'Angular'
]

// Generate random number between min and max
function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate random date within last N days
function randomDate(daysAgo: number): Date {
  const now = new Date()
  const days = random(0, daysAgo)
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

// Generate stats for a user
function generateStats() {
  // Create variation: some users are only active this week, some this month, some all-time
  const activityType = random(1, 100)
  
  let weekCommits = 0
  let monthCommits = 0
  let yearCommits = 0
  let allTimeCommits = 0
  
  if (activityType <= 30) {
    // 30% - Only active this week (new users)
    weekCommits = random(5, 50)
    monthCommits = weekCommits // Same as week
    yearCommits = random(monthCommits, monthCommits * 2)
    allTimeCommits = yearCommits
  } else if (activityType <= 60) {
    // 30% - Active this month but not this week (inactive recently)
    weekCommits = random(0, 5) // Very few or none this week
    monthCommits = random(10, 100)
    yearCommits = random(monthCommits * 2, monthCommits * 10)
    allTimeCommits = random(yearCommits, yearCommits * 3)
  } else if (activityType <= 85) {
    // 25% - Active this month and week (regular users)
    weekCommits = random(5, 80)
    monthCommits = random(weekCommits * 2, weekCommits * 6)
    yearCommits = random(monthCommits * 3, monthCommits * 12)
    allTimeCommits = random(yearCommits, yearCommits * 4)
  } else {
    // 15% - Highly active users (all time)
    weekCommits = random(20, 150)
    monthCommits = random(weekCommits * 3, weekCommits * 8)
    yearCommits = random(monthCommits * 5, monthCommits * 20)
    allTimeCommits = random(yearCommits * 2, yearCommits * 8)
  }
  
  // Generate PRs and issues based on commits
  const weekPRs = weekCommits > 0 ? random(0, Math.floor(weekCommits / 5)) : 0
  const monthPRs = monthCommits > 0 ? random(weekPRs, Math.max(weekPRs, Math.floor(monthCommits / 5))) : 0
  const weekPRReviews = weekPRs > 0 ? random(0, weekPRs * 2) : 0
  const monthPRReviews = monthPRs > 0 ? random(weekPRReviews, Math.max(weekPRReviews, monthPRs * 2)) : 0
  const weekIssues = weekCommits > 0 ? random(0, Math.floor(weekCommits / 10)) : 0
  const monthIssues = monthCommits > 0 ? random(weekIssues, Math.max(weekIssues, Math.floor(monthCommits / 10))) : 0
  
  const weekContributions = weekCommits + weekPRs + weekPRReviews + weekIssues
  const monthContributions = monthCommits + monthPRs + monthPRReviews + monthIssues
  
  // Calculate builder score - only if user has activity
  const weekActiveDays = weekCommits > 0 ? random(1, 7) : 0
  const monthActiveDays = monthCommits > 0 ? random(weekActiveDays, 30) : 0
  const weekReposContributed = weekCommits > 0 ? random(1, 10) : 0
  const monthReposContributed = monthCommits > 0 ? random(weekReposContributed, Math.max(weekReposContributed, 15)) : 0
  
  const weekScore = weekCommits > 0 
    ? Math.round((weekCommits * 1) + (weekPRs * 2) + (weekPRs * 4) + (weekActiveDays * 3) + (weekReposContributed * 5))
    : 0
  const monthScore = monthCommits > 0
    ? Math.round((monthCommits * 1) + (monthPRs * 2) + (monthPRs * 4) + (monthActiveDays * 3) + (monthReposContributed * 5))
    : 0
  
  // Generate daily breakdown (last 7 days)
  const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return {
      date: date.toISOString().split('T')[0],
      count: Math.round(random(0, Math.floor(weekCommits / 3)))
    }
  })
  
  // Generate language breakdown
  const numLanguages = random(1, 5)
  const languageBreakdown = Array.from({ length: numLanguages }, (_, i) => {
    const lang = languages[random(0, languages.length - 1)]
    const size = random(100, 10000)
    return {
      name: lang,
      size: Math.round(size),
      percentage: i === 0 ? random(40, 80) : random(5, 30)
    }
  })
  
  // Normalize percentages and ensure they're integers
  const totalPercentage = languageBreakdown.reduce((sum, lang) => sum + lang.percentage, 0)
  if (totalPercentage > 0) {
    languageBreakdown.forEach(lang => {
      lang.percentage = Math.round((lang.percentage / totalPercentage) * 100)
    })
  }
  
  const streak = random(0, 45)
  const followers = random(0, 5000)
  const stars = random(0, 10000)
  const publicRepos = random(1, 50)
  const topLanguage = languageBreakdown[0]?.name || languages[random(0, languages.length - 1)]
  
  return {
    week_commits: weekCommits,
    month_commits: monthCommits,
    year_commits: yearCommits,
    all_time_commits: allTimeCommits,
    week_prs: weekPRs,
    month_prs: monthPRs,
    week_pr_reviews: weekPRReviews,
    month_pr_reviews: monthPRReviews,
    week_issues: weekIssues,
    month_issues: monthIssues,
    week_contributions: weekContributions,
    month_contributions: monthContributions,
    all_time_contributions: Math.round(allTimeCommits + (allTimeCommits * 0.3)),
    week_score: weekScore,
    month_score: monthScore,
    streak_days: streak,
    github_streak_days: streak,
    github_followers: followers,
    github_stars: stars,
    github_public_repos: publicRepos,
    github_top_language: topLanguage,
    top_language: topLanguage,
    daily_breakdown: dailyBreakdown,
    language_breakdown: languageBreakdown,
  }
}

async function seedUsers() {
  console.log(`🌱 Starting to seed ${usernames.length} users...`)
  
  const users = []
  const stats = []
  
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i]
    const joinedAt = randomDate(365) // Joined within last year
    
    const userData = {
      github_username: username,
      username: username,
      display_name: username.charAt(0).toUpperCase() + username.slice(1),
      avatar_url: `https://github.com/${username}.png`,
      is_public: true,
      joined_at: joinedAt.toISOString(),
    }
    
    users.push(userData)
  }
  
  // Insert users in batches to avoid overwhelming the database
  console.log('📝 Inserting users...')
  const batchSize = 20
  const insertedUsers: any[] = []
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const { data: batchUsers, error: userError } = await supabase
      .from('users')
      .upsert(batch, { onConflict: 'github_username' })
      .select()
    
    if (userError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, userError)
      continue
    }
    
    if (batchUsers) {
      insertedUsers.push(...batchUsers)
    }
    console.log(`✅ Inserted batch ${i / batchSize + 1} (${batchUsers?.length || 0} users)`)
  }
  
  console.log(`✅ Total inserted: ${insertedUsers.length} users`)
  
  // Generate stats for each user
  console.log('📊 Generating stats...')
  for (const user of insertedUsers) {
    const userStats = generateStats()
    stats.push({
      user_id: user.id,
      ...userStats,
      snapshotted_at: new Date().toISOString(),
    })
  }
  
  // Insert stats in batches
  console.log('💾 Inserting stats...')
  for (let i = 0; i < stats.length; i += batchSize) {
    const batch = stats.slice(i, i + batchSize)
    const { error: statsError } = await supabase
      .from('stats_snapshots')
      .insert(batch)
    
    if (statsError) {
      console.error(`❌ Error inserting stats batch ${i / batchSize + 1}:`, statsError)
      continue
    }
    console.log(`✅ Inserted stats batch ${i / batchSize + 1} (${batch.length} stats)`)
  }
  
  console.log(`✅ Inserted stats for ${stats.length} users`)
  console.log('🎉 Seeding complete!')
}

// Run the seed
seedUsers()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error:', error)
    process.exit(1)
  })

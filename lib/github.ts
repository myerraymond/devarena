interface GitHubContributions {
  user: {
    contributionsCollection: {
      totalCommitContributions: number
      totalPullRequestContributions: number
      totalPullRequestReviewContributions: number
      totalIssueContributions: number
      totalRepositoriesWithContributedCommits: number
      contributionCalendar: {
        totalContributions: number
        weeks: Array<{
          contributionDays: Array<{
            date: string
            contributionCount: number
          }>
        }>
      }
    }
    repositories: {
      nodes: Array<{
        languages: {
          edges: Array<{
            size: number
            node: {
              name: string
            }
          }>
        }
      }>
    }
  }
}

interface DailyBreakdown {
  date: string
  count: number
}

interface LanguageBreakdown {
  name: string
  size: number
  percentage: number
}

interface BuilderScore {
  weekScore: number
  monthScore: number
  weekCommits: number
  weekPRs: number
  weekPRReviews: number
  weekIssues: number
  weekContributions: number
  monthCommits: number
  monthPRs: number
  monthPRReviews: number
  monthIssues: number
  monthContributions: number
  yearCommits: number
  allTimeCommits: number
  allTimeContributions: number
  streak: number
  topLanguage: string | null
  languageBreakdown: LanguageBreakdown[]
  dailyBreakdown: DailyBreakdown[]
  followers: number
  following: number
  publicRepos: number
  stars: number
}

/**
 * Calculates builder score based on GitHub activity
 */
function calculateBuilderScore(
  commits: number,
  prsOpened: number,
  prsMerged: number,
  activeDays: number,
  reposContributed: number
): number {
  // BUILDER SCORE = (commits × 1) + (PRs opened × 2) + (PRs merged × 4) + 
  //                 (active days × 3) + (repos contributed to × 5)
  return (commits * 1) + (prsOpened * 2) + (prsMerged * 4) + 
         (activeDays * 3) + (reposContributed * 5)
}

/**
 * Calculates streak from contribution calendar
 */
function calculateStreak(contributionDays: Array<{ date: string; contributionCount: number }>): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Create a map of date -> contribution count
  const contributionsMap = new Map<string, number>()
  contributionDays.forEach(day => {
    contributionsMap.set(day.date, day.contributionCount)
  })
  
  // Count consecutive days with contributions from today backwards
  let streak = 0
  const checkDate = new Date(today)
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const contributionCount = contributionsMap.get(dateStr) || 0
    
    if (contributionCount > 0) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // If today has no contributions, check yesterday
      if (streak === 0 && checkDate.getTime() === today.getTime()) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }
      // Otherwise, we've hit a gap, stop counting
      break
    }
    
    // Safety check: don't go back more than a year
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(today.getFullYear() - 1)
    if (checkDate < oneYearAgo) {
      break
    }
  }
  
  return streak
}

/**
 * Counts active days (days with contributions > 0) in a time period
 */
function countActiveDays(contributionDays: Array<{ date: string; contributionCount: number }>, startDate: Date, endDate: Date): number {
  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]
  
  let activeDays = 0
  contributionDays.forEach(day => {
    if (day.date >= startStr && day.date <= endStr && day.contributionCount > 0) {
      activeDays++
    }
  })
  
  return activeDays
}

/**
 * Fetches GitHub contribution stats using GraphQL API and calculates builder score
 */
export async function getGitHubStats(accessToken: string): Promise<BuilderScore> {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(today.getFullYear() - 1)
  oneYearAgo.setHours(0, 0, 0, 0)

  const yearStart = new Date(today.getFullYear(), 0, 1) // January 1st of current year
  yearStart.setHours(0, 0, 0, 0)

  const accountCreatedDate = new Date('2010-01-01') // GitHub was founded in 2008, but use 2010 as safe default

  // First get the username and basic profile data
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!userResponse.ok) {
    const errorText = await userResponse.text()
    console.error('GitHub user API error:', userResponse.status, errorText)
    throw new Error(`GitHub user API error: ${userResponse.statusText}`)
  }

  const user = await userResponse.json()
  
  if (!user.login) {
    console.error('GitHub user response missing login:', user)
    throw new Error('GitHub API error: No login in user response')
  }

  const username = user.login
  const followers = user.followers || 0
  const following = user.following || 0
  const publicRepos = user.public_repos || 0

  // GraphQL query for contributions
  const query = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${oneYearAgo.toISOString()}", to: "${today.toISOString()}") {
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoriesWithContributedCommits
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
        repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('GitHub GraphQL error:', response.status, errorText)
    throw new Error(`GitHub API error: ${response.statusText}`)
  }

  const data: { data: GitHubContributions; errors?: Array<{ message: string }> } = await response.json()

  if (data.errors && data.errors.length > 0) {
    console.error('GitHub GraphQL errors:', data.errors)
    throw new Error(`GitHub API error: ${data.errors.map(e => e.message).join(', ')}`)
  }

  if (!data.data?.user) {
    throw new Error('GitHub API error: No user data')
  }

  const contributions = data.data.user.contributionsCollection
  const calendar = contributions.contributionCalendar
  const allDays = calendar.weeks.flatMap((week) => week.contributionDays)

  // Get week and month contributions separately
  const weekQuery = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${sevenDaysAgo.toISOString()}", to: "${today.toISOString()}") {
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
          totalRepositoriesWithContributedCommits
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `

  const monthQuery = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${thirtyDaysAgo.toISOString()}", to: "${today.toISOString()}") {
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
          totalRepositoriesWithContributedCommits
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `

  const yearQuery = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${yearStart.toISOString()}", to: "${today.toISOString()}") {
          totalCommitContributions
        }
      }
    }
  `

  // Fetch week, month, and year data
  const [weekResponse, monthResponse, yearResponse] = await Promise.all([
    fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: weekQuery }),
    }),
    fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: monthQuery }),
    }),
    fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: yearQuery }),
    }),
  ])

  if (!weekResponse.ok) {
    const errorText = await weekResponse.text()
    console.error('GitHub week query error:', weekResponse.status, errorText)
    throw new Error(`GitHub API error: Week query failed`)
  }

  if (!monthResponse.ok) {
    const errorText = await monthResponse.text()
    console.error('GitHub month query error:', monthResponse.status, errorText)
    throw new Error(`GitHub API error: Month query failed`)
  }

  if (!yearResponse.ok) {
    const errorText = await yearResponse.text()
    console.error('GitHub year query error:', yearResponse.status, errorText)
    // Don't throw - year is optional, continue with 0
  }

  const weekData: { data: GitHubContributions; errors?: Array<{ message: string }> } = await weekResponse.json()
  const monthData: { data: GitHubContributions; errors?: Array<{ message: string }> } = await monthResponse.json()
  const yearData: { data: { user: { contributionsCollection: { totalCommitContributions: number } } }; errors?: Array<{ message: string }> } = await yearResponse.json().catch(() => ({ data: { user: { contributionsCollection: { totalCommitContributions: 0 } } } }))

  if (weekData.errors && weekData.errors.length > 0) {
    console.error('GitHub week query GraphQL errors:', weekData.errors)
    throw new Error(`GitHub API error: ${weekData.errors.map(e => e.message).join(', ')}`)
  }

  if (monthData.errors && monthData.errors.length > 0) {
    console.error('GitHub month query GraphQL errors:', monthData.errors)
    throw new Error(`GitHub API error: ${monthData.errors.map(e => e.message).join(', ')}`)
  }

  const weekContributions = weekData.data?.user?.contributionsCollection
  const monthContributions = monthData.data?.user?.contributionsCollection

  const weekCommits = weekContributions?.totalCommitContributions || 0
  const weekPRs = weekContributions?.totalPullRequestContributions || 0
  const weekPRReviews = weekContributions?.totalPullRequestReviewContributions || 0
  const weekIssues = weekContributions?.totalIssueContributions || 0
  // Calculate total contributions by summing all types
  const weekContributionsTotal = weekCommits + weekPRs + weekPRReviews + weekIssues
  const weekReposContributed = weekContributions?.totalRepositoriesWithContributedCommits || 0
  const weekDays = weekContributions?.contributionCalendar.weeks.flatMap((w) => w.contributionDays) || []
  const weekActiveDays = countActiveDays(weekDays, sevenDaysAgo, today)

  const monthCommits = monthContributions?.totalCommitContributions || 0
  const monthPRs = monthContributions?.totalPullRequestContributions || 0
  const monthPRReviews = monthContributions?.totalPullRequestReviewContributions || 0
  const monthIssues = monthContributions?.totalIssueContributions || 0
  // Calculate total contributions by summing all types
  const monthContributionsTotal = monthCommits + monthPRs + monthPRReviews + monthIssues
  const monthReposContributed = monthContributions?.totalRepositoriesWithContributedCommits || 0
  const monthDays = monthContributions?.contributionCalendar.weeks.flatMap((w) => w.contributionDays) || []
  const monthActiveDays = countActiveDays(monthDays, thirtyDaysAgo, today)

  // Year commits (from January 1st of current year)
  const yearCommits = yearData.data?.user?.contributionsCollection?.totalCommitContributions || 0

  // All-time commits (from the one-year query - GitHub GraphQL only allows 1 year lookback)
  // For true all-time, we'd need to use the REST API, but GraphQL gives us the last year
  // We'll use the one-year total as "all-time" since that's the best we can get from GraphQL
  const allTimeCommits = contributions.totalCommitContributions || 0
  const allTimeContributions = calendar.totalContributions || 0

  // Calculate builder scores (using commits, PRs opened, PR reviews, active days, repos)
  const weekScore = calculateBuilderScore(
    weekCommits,
    weekPRs,
    weekPRReviews,
    weekActiveDays,
    weekReposContributed
  )

  const monthScore = calculateBuilderScore(
    monthCommits,
    monthPRs,
    monthPRReviews,
    monthActiveDays,
    monthReposContributed
  )

  // Calculate streak from all-time data
  const streak = calculateStreak(allDays)

  // Get language breakdown
  const languageMap = new Map<string, number>()
  data.data.user.repositories.nodes.forEach((repo) => {
    repo.languages.edges.forEach((lang) => {
      const current = languageMap.get(lang.node.name) || 0
      languageMap.set(lang.node.name, current + lang.size)
    })
  })

  // Calculate percentages
  const totalSize = Array.from(languageMap.values()).reduce((sum, size) => sum + size, 0)
  const languageBreakdown: LanguageBreakdown[] = Array.from(languageMap.entries())
    .map(([name, size]) => ({
      name,
      size,
      percentage: totalSize > 0 ? (size / totalSize) * 100 : 0,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 5) // Top 5 languages

  const topLanguage = languageBreakdown[0]?.name || null

  // Get total stars from repositories
  const reposQuery = `
    query {
      user(login: "${username}") {
        repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}) {
          nodes {
            stargazerCount
          }
        }
      }
    }
  `

  let stars = 0
  try {
    const reposResponse = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: reposQuery }),
    })

    if (reposResponse.ok) {
      const reposData: { data: { user: { repositories: { nodes: Array<{ stargazerCount: number }> } } } } = await reposResponse.json()
      if (reposData.data?.user?.repositories?.nodes) {
        stars = reposData.data.user.repositories.nodes.reduce((sum, repo) => sum + (repo.stargazerCount || 0), 0)
      }
    }
  } catch (error) {
    console.error('Error fetching stars:', error)
  }

  // Create daily breakdown for the last 7 days
  const dailyBreakdown: DailyBreakdown[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const day = weekDays.find(d => d.date === dateStr)
    dailyBreakdown.push({
      date: dateStr,
      count: day?.contributionCount || 0,
    })
  }

  return {
    weekScore,
    monthScore,
    weekCommits,
    weekPRs,
    weekPRReviews,
    weekIssues,
    weekContributions: weekContributionsTotal,
    monthCommits,
    monthPRs,
    monthPRReviews,
    monthIssues,
    monthContributions: monthContributionsTotal,
    yearCommits,
    allTimeCommits,
    allTimeContributions,
    streak,
    topLanguage,
    languageBreakdown,
    dailyBreakdown,
    followers,
    following,
    publicRepos,
    stars,
  }
}

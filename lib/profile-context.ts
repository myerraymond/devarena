export function getProfileTooltips(isOwnProfile: boolean, displayName: string) {
  return {
    worldRanking: isOwnProfile
      ? "You are the #1 ranked developer for this language on DevArena this week. Rankings update every 6 hours and can be taken by anyone."
      : `${displayName} is the #1 ranked developer for this language on DevArena this week. Rankings update every 6 hours and can be taken by anyone.`,

    builderScore: isOwnProfile
      ? "Your Builder Score is calculated as: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5). Updated every 6 hours."
      : `${displayName}'s Builder Score is calculated as: (commits × 1) + (PRs × 4) + (active days × 3) + (repos × 5). Updated every 6 hours.`,

    weekScore: isOwnProfile
      ? "Your Builder Score for the 7 days ending today (UTC)."
      : `${displayName}'s Builder Score for the 7 days ending today (UTC).`,

    monthScore: isOwnProfile
      ? "Your cumulative Builder Score since the 1st of this month."
      : `${displayName}'s cumulative Builder Score since the 1st of this month.`,

    allTimeScore: isOwnProfile
      ? "Your total Builder Score since joining DevArena."
      : `${displayName}'s total Builder Score since joining DevArena.`,

    dailyAverage: isOwnProfile
      ? "Your average daily Builder Score over the last 30 days."
      : `${displayName}'s average daily Builder Score over the last 30 days.`,

    streak: isOwnProfile
      ? "Your consecutive days with at least one qualifying commit (5+ lines changed)."
      : `${displayName}'s consecutive days with at least one qualifying commit (5+ lines changed).`,

    activity: isOwnProfile
      ? "Your daily Builder Score for the last 7 days. Taller bars = more productive days."
      : `${displayName}'s daily Builder Score for the last 7 days.`,

    languageKingCard: isOwnProfile
      ? "You are the #1 ranked developer for this language this week. Stay active or someone can take your crown."
      : `${displayName} is the #1 ranked developer for this language this week.`,

    rankThisWeek: isOwnProfile
      ? "Your current position on the global leaderboard. Updates every 6 hours."
      : `${displayName}'s current position on the global leaderboard. Updates every 6 hours.`,

    notAKing: isOwnProfile
      ? "Your current rank for your top language. Keep building to reach #1."
      : `${displayName}'s current rank for their top language.`,

    leagueProgress: isOwnProfile
      ? "Points needed to reach the next tier before the season ends."
      : `Points separating ${displayName} from the next tier.`,

    languageRankText: (rank: number, language: string) =>
      isOwnProfile
        ? `You are`
        : `${displayName} is`,
  }
}

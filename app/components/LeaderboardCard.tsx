'use client'

import Link from 'next/link'
import Image from 'next/image'

interface LeaderboardCardProps {
  rank: number
  username: string
  display_name: string | null
  hours: number
  commits: number | null
  streak: number | null
  top_language: string | null
  followers: number | null
  stars: number | null
  publicRepos: number | null
  is_active: boolean
  score: number | null
  index?: number
}

export default function LeaderboardCard({
  rank,
  username,
  commits,
  streak,
  top_language,
  is_active,
  score,
}: LeaderboardCardProps) {
  return (
    <Link
      href={`/u/${username}`}
      className="block bg-card-bg border border-border rounded-base p-4 hover:bg-background transition-colors"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className={`font-mono text-lg ${rank <= 3 ? 'font-semibold text-foreground' : 'text-muted'}`}>
          #{rank}
        </span>
        <Image
          src={`https://github.com/${username}.png`}
          alt={username}
          width={32}
          height={32}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">{username}</div>
          <div className="text-xs text-muted">@{username}</div>
        </div>
        {is_active && (
          <span className="text-xs text-accent-green">● Live</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted mb-1">Score</div>
          <div className="font-mono font-semibold text-foreground">{score?.toLocaleString() || '—'}</div>
        </div>
        <div>
          <div className="text-muted mb-1">Commits</div>
          <div className="font-mono text-muted">{commits?.toLocaleString() || '—'}</div>
        </div>
        <div>
          <div className="text-muted mb-1">Streak</div>
          <div className={streak && streak > 7 ? 'text-accent-green' : 'text-foreground'}>
            {streak ? `🔥 ${streak}d` : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted mb-1">Language</div>
          <div className="text-muted">{top_language || '—'}</div>
        </div>
      </div>
    </Link>
  )
}

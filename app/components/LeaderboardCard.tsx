'use client'

import Link from 'next/link'
import { formatHours } from '@/lib/utils'

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
  index?: number
}

export default function LeaderboardCard({
  rank,
  username,
  display_name,
  hours,
  commits,
  streak,
  top_language,
  followers,
  stars,
  publicRepos,
  is_active,
  index = 0,
}: LeaderboardCardProps) {
  const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-light-blue'
  
  return (
    <Link
      href={`/u/${username}`}
      className={`block border-2 border-black ${bgColor} p-4 shadow-neobrutalism hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-4xl font-heading font-black text-black">
          #{rank}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {is_active && (
            <span className="px-2 py-1 bg-green border-2 border-black text-white font-sans font-bold text-xs rounded-base">
              ACTIVE
            </span>
          )}
        </div>
      </div>
      <div className="font-heading font-black text-xl text-black mb-3">
        {username}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm font-sans font-bold">
        <div>
          <div className="text-black mb-1">COMMITS</div>
          <div className="text-black">{commits || 0}</div>
        </div>
        <div>
          <div className="text-black mb-1">FOLLOWERS</div>
          <div className="text-black">{followers || 0}</div>
        </div>
        <div>
          <div className="text-black mb-1">STARS</div>
          <div className="text-black">{stars || 0}</div>
        </div>
        <div>
          <div className="text-black mb-1">STREAK</div>
          <div className="text-black">{streak ? `${streak}d` : '—'}</div>
        </div>
        <div>
          <div className="text-black mb-1">TOP LANG</div>
          <div className="text-black">{top_language || '—'}</div>
        </div>
      </div>
    </Link>
  )
}

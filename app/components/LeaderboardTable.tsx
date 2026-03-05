'use client'

import Link from 'next/link'
import { formatHours } from '@/lib/utils'
import LeaderboardCard from './LeaderboardCard'

interface LeaderboardRow {
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
}

interface LeaderboardTableProps {
  data: LeaderboardRow[]
}

export default function LeaderboardTable({ data }: LeaderboardTableProps) {
  return (
    <>
      {/* Desktop Table - Each row as a card */}
      <div className="hidden md:block space-y-4">
        {data.map((row, index) => {
          const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-light-blue'
          return (
            <Link
              key={row.username}
              href={`/u/${row.username}`}
              className={`block border-2 border-black ${bgColor} p-6 shadow-neobrutalism hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all`}
            >
              <div className="flex items-center gap-6">
                {/* Rank - Huge and bold */}
                <div className="text-6xl font-heading font-black text-black">
                  #{row.rank}
                </div>
                
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-heading font-black text-black">
                      {row.username}
                    </h3>
                    {row.is_active && (
                      <span className="px-3 py-1 bg-green border-2 border-black text-white font-sans font-bold text-xs rounded-base">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-6 text-sm font-sans font-bold flex-wrap">
                    <div>
                      <span className="text-black">COMMITS: </span>
                      <span className="text-black">{row.commits || 0}</span>
                    </div>
                    <div>
                      <span className="text-black">FOLLOWERS: </span>
                      <span className="text-black">{row.followers || 0}</span>
                    </div>
                    <div>
                      <span className="text-black">STARS: </span>
                      <span className="text-black">{row.stars || 0}</span>
                    </div>
                    <div>
                      <span className="text-black">STREAK: </span>
                      <span className="text-black">{row.streak ? `${row.streak}d` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-black">TOP LANG: </span>
                      <span className="text-black">{row.top_language || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, index) => (
          <LeaderboardCard key={row.username} {...row} index={index} />
        ))}
      </div>
    </>
  )
}

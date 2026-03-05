'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import LeaderboardTabs from './LeaderboardTabs'
import LeaderboardTable from './LeaderboardTable'
import LeaderboardSkeleton from './LeaderboardSkeleton'
import type { LeaderboardData } from '../page'

type Timeframe = 'week' | 'month' | 'alltime'

interface LeaderboardClientProps {
  data: LeaderboardData[]
  timeframe: Timeframe
  isCached?: boolean
}

export default function LeaderboardClient({ 
  data,
  timeframe,
  isCached = false
}: LeaderboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Filter and sort data client-side based on timeframe
  const filteredData = useMemo(() => {
    const dataWithHours = data.map(entry => {
      let hours = 0
      let commits = 0
      switch (timeframe) {
        case 'week':
          hours = entry.weekHours
          commits = entry.weekCommits || entry.commits || 0
          break
        case 'month':
          hours = entry.monthHours
          commits = entry.monthCommits || entry.commits || 0
          break
        case 'alltime':
          hours = entry.allTimeHours
          commits = entry.allTimeCommits || entry.yearCommits || entry.commits || 0
          break
      }
      return { ...entry, hours, commits }
    })

    return dataWithHours
      // Show users with any activity (scores, commits, etc)
      .filter((entry) => {
        const hasScore = (entry.weekScore !== null && entry.weekScore !== undefined && entry.weekScore > 0) || 
                        (entry.monthScore !== null && entry.monthScore !== undefined && entry.monthScore > 0)
        const hasCommits = entry.commits !== null && entry.commits > 0
        return hasScore || hasCommits
      })
      .sort((a, b) => {
        // Sort by builder score (week_score for week, month_score for month/alltime)
        let scoreA = 0
        let scoreB = 0
        
        if (timeframe === 'week') {
          scoreA = a.weekScore ?? 0
          scoreB = b.weekScore ?? 0
        } else {
          scoreA = a.monthScore ?? 0
          scoreB = b.monthScore ?? 0
        }
        
        // If scores are equal, sort by commits (use the timeframe-specific commits)
        if (scoreA === scoreB) {
          const commitsA = a.commits ?? 0
          const commitsB = b.commits ?? 0
          return commitsB - commitsA
        }
        
        return scoreB - scoreA
      })
      .slice(0, 50) // Top 50
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
  }, [data, timeframe])

  const handleTabChange = (tab: Timeframe) => {
    setIsTransitioning(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('timeframe', tab)
    router.replace(`/?${params.toString()}`, { scroll: false })
    // Small delay to show transition, then hide
    setTimeout(() => setIsTransitioning(false), 100)
  }

  return (
    <>
      {isCached && (
        <div className="mb-4 border-2 border-black bg-yellow p-3 text-black font-sans font-bold text-sm shadow-neobrutalism">
          &gt; USING CACHED DATA
        </div>
      )}
      <LeaderboardTabs activeTab={timeframe} onTabChange={handleTabChange} />

      {isTransitioning ? (
        <LeaderboardSkeleton />
      ) : filteredData.length > 0 ? (
        <LeaderboardTable data={filteredData} />
      ) : (
        <div className="text-black text-center py-12 font-sans font-bold border-2 border-black bg-white p-8 shadow-neobrutalism">
          <div className="text-2xl mb-4">NO BUILDERS YET</div>
          <div className="text-base mb-4">
            If you've signed in, make sure to:
          </div>
          <div className="text-sm space-y-2">
            <div>1. Your profile is set to PUBLIC</div>
            <div>2. Click "Sync now" in your dashboard</div>
            <div>3. Wait a few seconds for stats to load</div>
          </div>
        </div>
      )}
    </>
  )
}

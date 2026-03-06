'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
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
  data: initialData,
  timeframe,
  isCached = false
}: LeaderboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [allData, setAllData] = useState<LeaderboardData[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialData.length >= 50)
  const [page, setPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Load more data when scrolling
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('timeframe', timeframe)
      params.set('page', String(page + 1))
      params.set('limit', '50')

      const response = await fetch(`/api/leaderboard?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch')
      }
      
      const result = await response.json()

      if (result.data && result.data.length > 0) {
        // Avoid duplicates by checking usernames
        const existingUsernames = new Set(allData.map(d => d.username))
        const newData = result.data.filter((item: LeaderboardData) => !existingUsernames.has(item.username))
        
        if (newData.length > 0) {
          setAllData(prev => [...prev, ...newData])
          setPage(prev => prev + 1)
          setHasMore(result.hasMore)
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more data:', error)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [timeframe, page, isLoading, hasMore, allData])

  // Reset pagination when timeframe changes
  useEffect(() => {
    setAllData(initialData)
    setPage(1)
    setHasMore(initialData.length >= 50)
    setIsLoading(false)
  }, [timeframe, initialData])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, loadMore])

  const handleTabChange = (tab: Timeframe) => {
    setIsTransitioning(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('timeframe', tab)
    router.replace(`/?${params.toString()}`, { scroll: false })
    setTimeout(() => setIsTransitioning(false), 100)
  }

  return (
    <>
      {isCached && (
        <div className="mb-4 text-sm text-foreground/80 bg-muted px-4 py-2 rounded-md">
          Using cached data
        </div>
      )}
      <LeaderboardTabs activeTab={timeframe} onTabChange={handleTabChange} />

      {isTransitioning ? (
        <LeaderboardSkeleton />
      ) : allData.length > 0 ? (
        <>
          <LeaderboardTable data={allData} />
          {/* Loading trigger element */}
          <div ref={observerTarget} className="h-20 flex items-center justify-center mt-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"></div>
                Loading more builders...
              </div>
            )}
            {!hasMore && allData.length >= 50 && (
              <div className="text-sm text-foreground/70 py-4">
                You&apos;ve reached the end of the leaderboard
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-lg font-medium mb-2">No builders yet</div>
          <div className="text-sm text-foreground/70">
            Connect your GitHub to be the first!
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LeaderboardTabs from './LeaderboardTabs'
import LeaderboardTable from './LeaderboardTable'
import LeaderboardSkeleton from './LeaderboardSkeleton'
import type { LeaderboardData } from '../page'

export type Timeframe = 'week' | 'month' | 'alltime'

interface LeaderboardClientProps {
  data: LeaderboardData[]
  timeframe: Timeframe
  isCached?: boolean
  languageKings?: Record<string, string[]>
  leagueTiers?: Record<string, string>
}

export default function LeaderboardClient({
  data: initialData,
  timeframe,
  isCached = false,
  languageKings = {},
  leagueTiers = {},
}: LeaderboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [allData, setAllData] = useState<LeaderboardData[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialData.length >= 50)
  const [page, setPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [minStreak, setMinStreak] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // User entry fetched from API (for users outside loaded data)
  const [fetchedUserEntry, setFetchedUserEntry] = useState<LeaderboardData | null>(null)

  // Current user's GitHub username from session
  const currentUsername =
    (session?.user as any)?.login ||
    (session?.user as any)?.name ||
    null

  // ---------- Infinite scroll ----------

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('timeframe', timeframe)
      params.set('page', String(page + 1))
      params.set('limit', '50')

      const response = await fetch(`/api/leaderboard?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const result = await response.json()

      if (result.data && result.data.length > 0) {
        const existingUsernames = new Set(allData.map((d) => d.username))
        const newData = result.data.filter(
          (item: LeaderboardData) => !existingUsernames.has(item.username)
        )

        if (newData.length > 0) {
          setAllData((prev) => [...prev, ...newData])
          setPage((prev) => prev + 1)
          setHasMore(result.hasMore)
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [timeframe, page, isLoading, hasMore, allData])

  // Reset pagination when timeframe or initial data changes
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
    if (currentTarget) observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [hasMore, isLoading, loadMore])

  // ---------- Current user detection ----------

  // Find user in loaded data
  const userInData = useMemo(
    () =>
      currentUsername
        ? allData.find((d) => d.username === currentUsername) || null
        : null,
    [currentUsername, allData]
  )

  // Fetch user's entry from API if not in loaded data
  useEffect(() => {
    if (!currentUsername || userInData) {
      setFetchedUserEntry(null)
      return
    }

    let cancelled = false
    fetch(
      `/api/leaderboard?timeframe=${timeframe}&username=${encodeURIComponent(currentUsername)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.userEntry) {
          setFetchedUserEntry(data.userEntry)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [currentUsername, timeframe, userInData])

  // The effective user row (from loaded data or API fetch)
  const effectiveUserRow = userInData || fetchedUserEntry
  const myRank = effectiveUserRow?.rank

  // ---------- Search & filters ----------

  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>()
    allData.forEach((d) => {
      if (d.top_language) langs.add(d.top_language)
    })
    return Array.from(langs).sort()
  }, [allData])

  const filteredData = useMemo(() => {
    return allData.filter((entry) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !entry.username.toLowerCase().includes(q) &&
          !(entry.display_name || '').toLowerCase().includes(q)
        ) {
          return false
        }
      }
      // Language
      if (languageFilter && entry.top_language !== languageFilter) return false
      // Min streak
      if (minStreak > 0 && (entry.streak || 0) < minStreak) return false
      return true
    })
  }, [allData, searchQuery, languageFilter, minStreak])

  const activeFilterCount = [
    languageFilter !== '',
    minStreak > 0,
  ].filter(Boolean).length

  // Check if user is in the filtered (visible) data
  const userInFilteredData = currentUsername
    ? filteredData.some((d) => d.username === currentUsername)
    : false

  // Check if search matches the current user
  const userMatchesSearch =
    !searchQuery ||
    (currentUsername || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (effectiveUserRow?.display_name || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())

  // Show appended row when user isn't in filtered list but should still be visible
  const showAppendedRow =
    !!effectiveUserRow && !userInFilteredData && userMatchesSearch

  const clearFilters = () => {
    setSearchQuery('')
    setLanguageFilter('')
    setMinStreak(0)
  }

  const scrollToMyRow = () => {
    const el = document.getElementById('my-row')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // ---------- Tab switching ----------

  const handleTabChange = (tab: Timeframe) => {
    setIsTransitioning(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('timeframe', tab)
    router.replace(`/?${params.toString()}`, { scroll: false })
    setTimeout(() => setIsTransitioning(false), 100)
  }

  // ---------- Empty state message ----------

  const emptyMessage = searchQuery
    ? `No builders found matching "${searchQuery}"`
    : activeFilterCount > 0
      ? 'No builders match the current filters'
      : undefined

  // ---------- Render ----------

  return (
    <>
      {isCached && (
        <div className="mb-4 text-sm text-foreground/80 bg-muted px-4 py-2 rounded-md">
          Using cached data
        </div>
      )}

      <LeaderboardTabs activeTab={timeframe} onTabChange={handleTabChange} />

      {/* Search, Jump-to-rank, Filters toggle */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search builders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 sm:h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            {currentUsername && myRank && (
              <Button
                variant="outline"
                onClick={scrollToMyRow}
                className="whitespace-nowrap h-11 sm:h-9 flex-1 sm:flex-none"
              >
                Jump to my rank →{' '}
                <span className="font-mono ml-1">#{myRank}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="gap-2 h-11 sm:h-9"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible filter bar */}
      {filtersOpen && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-4 p-4 border rounded-md bg-muted/30">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Language
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="h-11 sm:h-9 flex-1 sm:flex-initial rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">All languages</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Min streak
            </label>
            <select
              value={minStreak}
              onChange={(e) => setMinStreak(Number(e.target.value))}
              className="h-11 sm:h-9 flex-1 sm:flex-initial rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="0">Any</option>
              <option value="3">3+ days</option>
              <option value="7">7+ days</option>
              <option value="14">14+ days</option>
              <option value="30">30+ days</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-sm h-11 sm:h-9 w-full sm:w-auto"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {isTransitioning ? (
        <LeaderboardSkeleton />
      ) : filteredData.length > 0 || showAppendedRow ? (
        <>
          <LeaderboardTable
            data={filteredData}
            currentUsername={currentUsername}
            appendedUserRow={showAppendedRow ? effectiveUserRow! : undefined}
            languageKings={languageKings}
            leagueTiers={leagueTiers}
          />
          {/* Infinite scroll trigger */}
          <div
            ref={observerTarget}
            className="h-20 flex items-center justify-center mt-4"
          >
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                Loading more builders...
              </div>
            )}
            {!hasMore &&
              allData.length >= 50 &&
              !searchQuery &&
              activeFilterCount === 0 && (
                <div className="text-sm text-foreground/70 py-4">
                  You&apos;ve reached the end of the leaderboard
                </div>
              )}
          </div>
        </>
      ) : emptyMessage ? (
        <LeaderboardTable data={[]} emptyMessage={emptyMessage} languageKings={languageKings} leagueTiers={leagueTiers} />
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

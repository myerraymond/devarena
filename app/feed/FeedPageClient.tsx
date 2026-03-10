'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Separator } from '@/components/ui/separator'
import FeedEventItem from '@/components/feed-event'
import type { FeedEvent, FeedEventType } from '@/lib/feed'

const EVENT_TABS: { label: string; value: FeedEventType | 'all'; emoji: string; tooltip: string }[] = [
  { label: 'All', value: 'all', emoji: '📢', tooltip: 'All activity from DevArena builders.' },
  { label: 'Streaks', value: 'streak_milestone', emoji: '🔥', tooltip: 'Triggered when a builder hits 7, 14, 30, 50, or 100 consecutive days of commits.' },
  { label: 'Cracked', value: 'language_king', emoji: '👑', tooltip: 'Triggered when a builder becomes #1 ranked for a programming language.' },
  { label: 'Promotions', value: 'league_promoted', emoji: '↑', tooltip: 'Triggered at the end of a season when a builder moves up a tier.' },
  { label: 'Rankings', value: 'rank_milestone', emoji: '🏆', tooltip: 'Triggered when a builder enters the global top 10 for the first time in a season.' },
  { label: 'New Builders', value: 'first_commit', emoji: '👋', tooltip: 'Triggered when someone joins DevArena for the first time.' },
]

interface FeedPageClientProps {
  initialEvents: FeedEvent[]
}

export default function FeedPageClient({ initialEvents }: FeedPageClientProps) {
  const [events, setEvents] = useState<FeedEvent[]>(initialEvents)
  const [activeTab, setActiveTab] = useState<FeedEventType | 'all'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialEvents.length >= 50)
  const [offset, setOffset] = useState(initialEvents.length)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Reset when tab changes
  useEffect(() => {
    setEvents([])
    setOffset(0)
    setHasMore(true)
    setIsLoading(true)

    const params = new URLSearchParams()
    params.set('limit', '50')
    params.set('offset', '0')
    if (activeTab !== 'all') {
      params.set('type', activeTab)
    }

    fetch(`/api/feed?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || [])
        setOffset(data.events?.length || 0)
        setHasMore(data.hasMore || false)
      })
      .catch(() => {
        setEvents([])
        setHasMore(false)
      })
      .finally(() => setIsLoading(false))
  }, [activeTab])

  // Load more for infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      params.set('offset', String(offset))
      if (activeTab !== 'all') {
        params.set('type', activeTab)
      }

      const res = await fetch(`/api/feed?${params.toString()}`)
      const data = await res.json()

      if (data.events && data.events.length > 0) {
        setEvents((prev) => [...prev, ...data.events])
        setOffset((prev) => prev + data.events.length)
        setHasMore(data.hasMore || false)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, offset, activeTab])

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

  return (
    <>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {EVENT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === tab.value
                ? 'bg-foreground text-background font-medium'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <Separator className="mb-4" />

      {/* Events list */}
      <div className="space-y-0">
        {events.length === 0 && !isLoading ? (
          <p className="text-center text-muted-foreground py-12">
            No events yet. Activity will appear here as builders compete.
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id}>
              <FeedEventItem event={event} />
              <Separator className="my-0" />
            </div>
          ))
        )}
      </div>

      {/* Infinite scroll trigger */}
      <div
        ref={observerTarget}
        className="h-20 flex items-center justify-center mt-4"
      >
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
            Loading more events...
          </div>
        )}
        {!hasMore && events.length > 0 && (
          <p className="text-sm text-muted-foreground py-4">
            You&apos;ve reached the end of the feed
          </p>
        )}
      </div>
    </>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import FeedEventItem from '@/components/feed-event'
import type { FeedEvent } from '@/lib/feed'

interface LiveFeedSidebarProps {
  initialEvents?: FeedEvent[]
}

export default function LiveFeedSidebar({ initialEvents = [] }: LiveFeedSidebarProps) {
  const [events, setEvents] = useState<FeedEvent[]>(initialEvents)
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set())
  const previousIdsRef = useRef<Set<string>>(
    new Set(initialEvents.map((e) => e.id))
  )

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/feed?limit=20')
      if (!res.ok) return
      const data = await res.json()

      if (data.events && Array.isArray(data.events)) {
        // Find truly new events (not in previous set)
        const freshIds = new Set<string>()
        for (const event of data.events) {
          if (!previousIdsRef.current.has(event.id)) {
            freshIds.add(event.id)
          }
        }

        // Update the previous IDs ref
        previousIdsRef.current = new Set(data.events.map((e: FeedEvent) => e.id))

        setNewEventIds(freshIds)
        setEvents(data.events)

        // Clear animation after it plays
        if (freshIds.size > 0) {
          setTimeout(() => setNewEventIds(new Set()), 600)
        }
      }
    } catch {
      // Silently fail
    }
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    // Initial fetch if no initial events
    if (initialEvents.length === 0) {
      fetchEvents()
    }

    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents, initialEvents.length])

  return (
    <div className="w-[280px] flex-shrink-0 hidden lg:block">
      <div className="sticky top-20">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <h3 className="text-sm font-semibold">Live Feed</h3>
        </div>

        <Separator className="mb-2" />

        <div className="space-y-0 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No activity yet. Be the first!
            </p>
          ) : (
            events.map((event) => (
              <FeedEventItem
                key={event.id}
                event={event}
                animate={newEventIds.has(event.id)}
              />
            ))
          )}
        </div>

        <Separator className="mt-2 mb-2" />

        <Link
          href="/feed"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View full feed →
        </Link>
      </div>
    </div>
  )
}

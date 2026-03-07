'use client'

import Link from 'next/link'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import StreakBadge from '@/components/streak-badge'
import type { FeedEvent } from '@/lib/feed'

function timeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function getEventContent(event: FeedEvent): { emoji: string; text: React.ReactNode; streakDays?: number } {
  const username = event.username

  switch (event.event_type) {
    case 'streak_milestone':
      return {
        emoji: '🔥',
        text: (
          <>
            <strong>{username}</strong> hit a{' '}
            <strong>{event.payload.streak_days} day</strong> streak
          </>
        ),
        streakDays: event.payload.streak_days,
      }

    case 'language_king':
      return {
        emoji: '👑',
        text: (
          <>
            <strong>{username}</strong> is now #1 in{' '}
            <strong>{event.payload.language}</strong> worldwide
          </>
        ),
      }

    case 'league_promoted':
      return {
        emoji: '↑',
        text: (
          <>
            <strong>{username}</strong> was promoted to{' '}
            <strong>{event.payload.to}</strong>
          </>
        ),
      }

    case 'rank_milestone': {
      const rank = event.payload.rank
      const label =
        rank === 1
          ? '#1 overall'
          : rank <= 3
            ? 'the top 3'
            : 'the top 10'
      return {
        emoji: '🏆',
        text: (
          <>
            <strong>{username}</strong> just entered {label}
          </>
        ),
      }
    }

    case 'first_commit':
      return {
        emoji: '👋',
        text: (
          <>
            <strong>{username}</strong> just joined DevArena
          </>
        ),
      }

    case 'season_winner':
      return {
        emoji: '👑',
        text: (
          <>
            <strong>{username}</strong> finished the season in{' '}
            <strong>{event.payload.tier}</strong>
          </>
        ),
      }

    default:
      return {
        emoji: '📢',
        text: (
          <>
            <strong>{username}</strong> did something awesome
          </>
        ),
      }
  }
}

interface FeedEventItemProps {
  event: FeedEvent
  animate?: boolean
}

export default function FeedEventItem({ event, animate = false }: FeedEventItemProps) {
  const { emoji, text, streakDays } = getEventContent(event)
  const avatarUrl = `https://github.com/${event.username}.png`
  const isLegendaryStreak = event.event_type === 'streak_milestone' && streakDays && streakDays >= 100

  return (
    <div
      className={`flex items-start gap-2.5 py-2.5 px-1 transition-all duration-500 ${
        animate ? 'animate-slide-in' : ''
      } ${isLegendaryStreak ? 'border-l-4 border-amber-400 pl-3' : ''}`}
    >
      <span className="text-sm flex-shrink-0 mt-0.5">{emoji}</span>
      <Link
        href={`/u/${event.username}`}
        className="flex-shrink-0"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={avatarUrl} alt={event.username} />
          <AvatarFallback className="text-[10px]">
            {event.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground/90 leading-snug break-words">
          {text}
        </p>
        {isLegendaryStreak && (
          <div className="mt-1.5">
            <StreakBadge days={streakDays} size="lg" />
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {timeAgo(event.created_at)}
        </p>
      </div>
    </div>
  )
}

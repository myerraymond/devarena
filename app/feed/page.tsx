import { getFeedEvents } from '@/lib/feed'
import FeedPageClient from './FeedPageClient'
import InfoTooltip from '@/components/info-tooltip'

export const revalidate = 30

export const metadata = {
  title: 'Activity Feed — DevArena',
  description: 'Live activity feed of DevArena builders — streaks, promotions, and milestones.',
}

export default async function FeedPage() {
  const { events: initialEvents } = await getFeedEvents(50, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <h1 className="text-2xl font-bold">
              <InfoTooltip
                label="Activity Feed"
                explanation="Real-time activity from builders on DevArena. Events are generated automatically when milestones are hit — no manual posting."
              />
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Live updates from the DevArena community
          </p>
        </header>

        <FeedPageClient initialEvents={initialEvents} />
      </div>
    </div>
  )
}

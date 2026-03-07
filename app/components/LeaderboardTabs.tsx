'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InfoTooltip from '@/components/info-tooltip'
import type { Timeframe } from './LeaderboardClient'

interface LeaderboardTabsProps {
  activeTab: Timeframe
  onTabChange: (tab: Timeframe) => void
}

export default function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as Timeframe)} className="mb-4">
      <TabsList>
        <TabsTrigger value="week">
          <InfoTooltip
            label="This Week"
            explanation="Scores reset every Monday at 00:00 UTC."
            className="no-underline decoration-transparent"
          />
        </TabsTrigger>
        <TabsTrigger value="month">
          <InfoTooltip
            label="This Month"
            explanation="Cumulative score since the 1st of this month."
            className="no-underline decoration-transparent"
          />
        </TabsTrigger>
        <TabsTrigger value="alltime">
          <InfoTooltip
            label="All Time"
            explanation="Total score since joining DevArena."
            className="no-underline decoration-transparent"
          />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

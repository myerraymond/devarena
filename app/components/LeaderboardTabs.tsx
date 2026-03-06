'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Timeframe } from './LeaderboardClient'

interface LeaderboardTabsProps {
  activeTab: Timeframe
  onTabChange: (tab: Timeframe) => void
}

export default function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as Timeframe)} className="mb-8">
      <TabsList>
        <TabsTrigger value="week">This Week</TabsTrigger>
        <TabsTrigger value="month">This Month</TabsTrigger>
        <TabsTrigger value="alltime">All Time</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

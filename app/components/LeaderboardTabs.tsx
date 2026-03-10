'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Timeframe } from './LeaderboardClient'

interface LeaderboardTabsProps {
  activeTab: Timeframe
  onTabChange: (tab: Timeframe) => void
}

const TABS: { value: Timeframe; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'alltime', label: 'All Time' },
]

export default function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as Timeframe)} className="mb-4">
      <TabsList>
        {TABS.map(({ value, label }) => (
          <TabsTrigger key={value} value={value}>{label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

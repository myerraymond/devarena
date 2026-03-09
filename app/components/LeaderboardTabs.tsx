'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Timeframe } from './LeaderboardClient'

interface LeaderboardTabsProps {
  activeTab: Timeframe
  onTabChange: (tab: Timeframe) => void
}

const TABS: { value: Timeframe; label: string; explanation: string }[] = [
  { value: 'week', label: 'This Week', explanation: 'Scores reset every Monday at 00:00 UTC.' },
  { value: 'month', label: 'This Month', explanation: 'Cumulative score since the 1st of this month.' },
  { value: 'alltime', label: 'All Time', explanation: 'Total score since joining DevArena.' },
]

export default function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as Timeframe)} className="mb-4">
      <TabsList>
        <TooltipProvider delayDuration={0}>
          {TABS.map(({ value, label, explanation }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <TabsTrigger value={value}>{label}</TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="max-w-xs text-sm">{explanation}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </TabsList>
    </Tabs>
  )
}

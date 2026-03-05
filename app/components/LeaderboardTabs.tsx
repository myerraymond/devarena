'use client'

type Timeframe = 'week' | 'month' | 'alltime'

interface LeaderboardTabsProps {
  activeTab: Timeframe
  onTabChange: (tab: Timeframe) => void
}

export default function LeaderboardTabs({ activeTab, onTabChange }: LeaderboardTabsProps) {
  return (
    <div className="flex gap-3 flex-wrap mb-8">
      <button
        onClick={() => onTabChange('week')}
        className={`px-6 py-3 border-2 border-black font-sans font-bold text-base transition-all ${
          activeTab === 'week'
            ? 'bg-yellow text-black shadow-neobrutalism'
            : 'bg-white text-black shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm'
        }`}
      >
        WEEK
      </button>
      <button
        onClick={() => onTabChange('month')}
        className={`px-6 py-3 border-2 border-black font-sans font-bold text-base transition-all ${
          activeTab === 'month'
            ? 'bg-yellow text-black shadow-neobrutalism'
            : 'bg-white text-black shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm'
        }`}
      >
        MONTH
      </button>
      <button
        onClick={() => onTabChange('alltime')}
        className={`px-6 py-3 border-2 border-black font-sans font-bold text-base transition-all ${
          activeTab === 'alltime'
            ? 'bg-yellow text-black shadow-neobrutalism'
            : 'bg-white text-black shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm'
        }`}
      >
        ALL TIME
      </button>
    </div>
  )
}

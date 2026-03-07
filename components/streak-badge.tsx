import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function getStreakMotivation(days: number): string | null {
  if (days >= 100) return "Legendary status. You're an inspiration."
  if (days >= 50) return "Top 1% consistency. Don't stop."
  if (days >= 30) return 'A month of consistent building. That\'s rare.'
  if (days >= 14) return 'Two weeks straight. Most people quit by now.'
  if (days >= 7) return "Keep going. You're building momentum."
  return null
}

export { getStreakMotivation }

type StreakSize = 'sm' | 'md' | 'lg'

interface StreakBadgeProps {
  days: number
  size?: StreakSize
}

export default function StreakBadge({ days, size = 'md' }: StreakBadgeProps) {
  if (!days || days <= 0) {
    return null
  }

  // 1-2 days: plain text, no emoji
  if (days <= 2) {
    return (
      <span className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
        {days} {days === 1 ? 'day' : 'days'}
      </span>
    )
  }

  // 3-6 days: 🔥 + outline badge
  if (days <= 6) {
    return (
      <Badge variant="outline" className={size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : ''}>
        🔥 {days} days
      </Badge>
    )
  }

  // 7-13 days: 🔥 + orange badge
  if (days <= 13) {
    return (
      <Badge variant="outline" className={`border-orange-200 text-orange-600 bg-orange-50 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : ''}`}>
        🔥 {days} days
      </Badge>
    )
  }

  // 14-29 days: 🔥🔥 + amber badge
  if (days <= 29) {
    return (
      <Badge variant="outline" className={`border-amber-200 text-amber-700 bg-amber-50 font-semibold ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : ''}`}>
        🔥🔥 {days} days
      </Badge>
    )
  }

  // 30-49 days: 🔥🔥🔥 + red badge + tooltip
  if (days <= 49) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Badge variant="outline" className={`border-red-200 text-red-600 bg-red-50 font-bold ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : ''}`}>
                🔥🔥🔥 {days} days
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>On fire. 30+ day streak.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // 50-99 days: ⚡🔥 + purple badge + pulse + tooltip
  if (days <= 99) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Badge variant="outline" className={`border-purple-200 text-purple-700 bg-purple-50 font-bold animate-pulse ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : ''}`}>
                ⚡🔥 {days} days
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unstoppable. 50+ day streak.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // 100+ days — the "Legendary" badge with context-specific sizing
  return <LegendaryBadge days={days} size={size} />
}

function LegendaryBadge({ days, size }: { days: number; size: StreakSize }) {
  const sizeConfig = {
    sm: {
      borderPad: 'p-[1px]',
      innerPad: 'px-2 py-0.5',
      emojiSize: 'text-xs',
      textSize: 'text-xs font-black',
      blur: 'blur-[2px]',
      glowOpacity: 'opacity-50',
    },
    md: {
      borderPad: 'p-[1.5px]',
      innerPad: 'px-2.5 py-1',
      emojiSize: 'text-sm',
      textSize: 'text-sm font-black',
      blur: 'blur-sm',
      glowOpacity: 'opacity-60',
    },
    lg: {
      borderPad: 'p-[2px]',
      innerPad: 'px-4 py-1.5',
      emojiSize: 'text-base',
      textSize: 'text-lg font-black',
      blur: 'blur',
      glowOpacity: 'opacity-75',
    },
  }

  const cfg = sizeConfig[size]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex items-center">
            {/* Animated gradient glow behind the badge */}
            <div
              className={`absolute inset-0 rounded-md ${cfg.blur} ${cfg.glowOpacity} animate-pulse`}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)',
                backgroundSize: '200% 200%',
              }}
            />
            {/* Gradient border wrapper */}
            <div
              className={`relative ${cfg.borderPad} rounded-md streak-gradient-border`}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f97316, #ef4444, #fbbf24)',
                backgroundSize: '300% 300%',
                animation: 'gradientShift 3s ease infinite',
              }}
            >
              {/* Inner badge */}
              <div className={`relative flex items-center gap-1 ${cfg.innerPad} rounded-[5px] bg-white overflow-hidden ${size === 'lg' ? 'streak-shimmer' : ''}`}>
                <span className={cfg.emojiSize}>👑🔥</span>
                <span
                  className={cfg.textSize}
                  style={{
                    background: 'linear-gradient(135deg, #d97706, #dc2626)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {days} days
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Legendary. {days} day streak.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

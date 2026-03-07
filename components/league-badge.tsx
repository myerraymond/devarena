import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type LeagueTier = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'

interface LeagueBadgeProps {
  tier: LeagueTier
  className?: string
}

const tierConfig: Record<LeagueTier, { emoji: string; label: string; className: string }> = {
  diamond: {
    emoji: '👑',
    label: 'Diamond',
    className: 'bg-cyan-50 border-cyan-300 text-cyan-700',
  },
  platinum: {
    emoji: '💎',
    label: 'Platinum',
    className: 'bg-slate-50 border-slate-300 text-slate-600',
  },
  gold: {
    emoji: '🥇',
    label: 'Gold',
    className: 'bg-yellow-50 border-yellow-300 text-yellow-700',
  },
  silver: {
    emoji: '🥈',
    label: 'Silver',
    className: 'bg-gray-50 border-gray-300 text-gray-600',
  },
  bronze: {
    emoji: '🥉',
    label: 'Bronze',
    className: 'bg-orange-50 border-orange-200 text-orange-600',
  },
}

export function getTierEmoji(tier: LeagueTier): string {
  return tierConfig[tier].emoji
}

export function getTierLabel(tier: LeagueTier): string {
  return tierConfig[tier].label
}

export default function LeagueBadge({ tier, className }: LeagueBadgeProps) {
  const config = tierConfig[tier]

  return (
    <Badge variant="outline" className={cn('text-xs', config.className, className)}>
      {config.emoji} {config.label}
    </Badge>
  )
}

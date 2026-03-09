import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string
  accentColor?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'
}

const colorConfig = {
  blue: {
    card: 'bg-blue-50 border-blue-200',
    label: 'text-blue-600',
    value: 'text-blue-900',
  },
  green: {
    card: 'bg-green-50 border-green-200',
    label: 'text-green-600',
    value: 'text-green-900',
  },
  red: {
    card: 'bg-red-50 border-red-200',
    label: 'text-red-600',
    value: 'text-red-900',
  },
  yellow: {
    card: 'bg-amber-50 border-amber-200',
    label: 'text-amber-600',
    value: 'text-amber-900',
  },
  purple: {
    card: 'bg-purple-50 border-purple-200',
    label: 'text-purple-600',
    value: 'text-purple-900',
  },
  orange: {
    card: 'bg-orange-50 border-orange-200',
    label: 'text-orange-600',
    value: 'text-orange-900',
  },
}

export default function StatCard({ label, value, accentColor }: StatCardProps) {
  const colors = accentColor ? colorConfig[accentColor] : null

  return (
    <Card className={colors?.card}>
      <CardContent className="pt-6">
        <div className={`text-xs tracking-wide mb-2 font-medium ${colors?.label ?? 'text-foreground/70'}`}>
          {label}
        </div>
        <div className={`font-mono text-2xl font-bold ${colors?.value ?? 'text-foreground'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

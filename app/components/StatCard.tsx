import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string
  accentColor?: 'blue' | 'green' | 'red' | 'yellow'
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-foreground/70 uppercase tracking-wider mb-2 font-medium">{label}</div>
        <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  )
}

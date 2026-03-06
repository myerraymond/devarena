'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ContributionData {
  date: string
  count: number
}

interface ContributionBarChartProps {
  data: ContributionData[]
}

export default function ContributionBarChart({ data }: ContributionBarChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Format data for recharts
  const chartData = data.map((day) => {
    const date = new Date(day.date)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      contributions: day.count,
      isToday,
    }
  })

  // Calculate total contributions
  const totalContributions = data.reduce((sum, day) => sum + day.count, 0)

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daily Contributions</CardTitle>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-md p-2 shadow-md">
          <p className="text-sm font-medium">{payload[0].payload.date}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} contributions
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Daily Contributions</CardTitle>
          <div className="text-sm font-mono text-muted-foreground">
            {totalContributions.toLocaleString()} total
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="contributions" 
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

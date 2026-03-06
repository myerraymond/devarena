'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ActivityData {
  date: string
  commits: number
  prs: number
}

interface ActivityBarChartProps {
  data: ActivityData[]
}

export default function ActivityBarChart({ data }: ActivityBarChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Format data for recharts
  const chartData = data.map((day) => {
    const date = new Date(day.date)
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      commits: day.commits || 0,
      prs: day.prs || 0,
    }
  })

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commits & PRs</CardTitle>
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
          <p className="text-sm font-medium mb-1">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commits & PRs</CardTitle>
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
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar 
                dataKey="commits" 
                fill="#22c55e"
                name="Commits"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="prs" 
                fill="#3b82f6"
                name="PRs"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

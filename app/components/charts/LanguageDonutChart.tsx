'use client'

import { useEffect, useState } from 'react'
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LanguageData {
  name: string
  size: number
  percentage: number
}

interface LanguageDonutChartProps {
  languages: LanguageData[]
  totalContributions: number
}

// More vibrant colors for better visibility
const LANGUAGE_COLORS: { [key: string]: string } = {
  TypeScript: '#3b82f6', // blue-500
  JavaScript: '#eab308', // yellow-500
  Python: '#22c55e', // green-500
  Java: '#ef4444', // red-500
  Go: '#8b5cf6', // violet-500
  C: '#64748b', // slate-500
  'C++': '#475569', // slate-600
  'C#': '#3b82f6', // blue-500
  PHP: '#06b6d4', // cyan-500
  Ruby: '#f43f5e', // rose-500
  HTML: '#f97316', // orange-500
  CSS: '#06b6d4', // cyan-500
  Shell: '#64748b', // slate-500
  Rust: '#f59e0b', // amber-500
  Kotlin: '#22c55e', // green-500
  Swift: '#eab308', // yellow-500
  Dart: '#3b82f6', // blue-500
  Vue: '#22c55e', // green-500
  React: '#3b82f6', // blue-500
  Svelte: '#ef4444', // red-500
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6']

export default function LanguageDonutChart({ languages, totalContributions }: LanguageDonutChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const topLanguages = languages.slice(0, 5).map((lang, index) => ({
    name: lang.name,
    value: lang.percentage,
    color: LANGUAGE_COLORS[lang.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }))

  if (topLanguages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No language data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Languages</CardTitle>
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
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Languages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Donut Chart */}
          <div className="relative">
            <ResponsiveContainer width={240} height={240}>
              <PieChart>
                <Pie
                  data={topLanguages}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {topLanguages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="font-mono text-3xl font-bold">
                {totalContributions.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Contributions
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-4 min-w-[200px]">
            {topLanguages.map((lang) => (
              <div key={lang.name} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: lang.color }}
                />
                <div className="flex-1 text-sm font-medium">
                  {lang.name}
                </div>
                <div className="text-sm font-mono font-semibold">
                  {lang.value.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

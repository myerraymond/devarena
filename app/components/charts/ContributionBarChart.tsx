'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

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
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      contributions: day.count,
    }
  })

  // Calculate total contributions
  const totalContributions = data.reduce((sum, day) => sum + day.count, 0)

  if (!mounted) {
    return (
      <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-black text-lg font-heading font-black">DAILY CONTRIBUTIONS</h3>
          <div className="text-black font-sans font-bold">Loading...</div>
        </div>
        <div className="w-full h-[300px] flex items-center justify-center">
          <div className="text-black font-sans font-bold">Loading chart...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-black text-lg font-heading font-black">DAILY CONTRIBUTIONS</h3>
        <div className="border-2 border-black bg-yellow px-4 py-2 text-black font-sans font-bold shadow-neobrutalism-sm">
          {totalContributions.toLocaleString()} total
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <BarChart width={Math.max(900, chartData.length * 120)} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeWidth={1} />
          <XAxis 
            dataKey="day" 
            tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold', fontFamily: 'DM Sans, sans-serif' }}
            tickLine={{ stroke: '#000', strokeWidth: 2 }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
          />
          <Bar 
            dataKey="contributions" 
            fill="#05E17A"
            stroke="#000"
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </div>
    </div>
  )
}

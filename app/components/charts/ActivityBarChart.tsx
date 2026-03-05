'use client'

import { Bar, BarChart, CartesianGrid, XAxis, Rectangle } from 'recharts'

interface ActivityData {
  date: string
  commits: number
  prs: number
}

interface ActivityBarChartProps {
  data: ActivityData[]
}

export default function ActivityBarChart({ data }: ActivityBarChartProps) {
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

  return (
    <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
      <h3 className="text-black text-lg mb-4 font-heading font-black">COMMITS & PRs</h3>
      <div className="w-full">
        <BarChart width={600} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeWidth={1} />
          <XAxis 
            dataKey="day" 
            tick={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }}
            tickLine={{ stroke: '#000', strokeWidth: 2 }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
          />
          <Bar 
            dataKey="commits" 
            fill="#05E17A"
            stroke="#000"
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="prs" 
            fill="#5294FF"
            stroke="#000"
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Pie, PieChart, Cell, Label } from 'recharts'

interface LanguageData {
  name: string
  size: number
  percentage: number
}

interface LanguageDonutChartProps {
  languages: LanguageData[]
  totalContributions: number
}

const LANGUAGE_COLORS: { [key: string]: string } = {
  TypeScript: '#5294FF',
  JavaScript: '#FACC00',
  Python: '#05E17A',
  Java: '#FF4D50',
  Go: '#7A83FF',
  C: '#000000',
  'C++': '#000000',
  'C#': '#5294FF',
  PHP: '#5294FF',
  Ruby: '#FF4D50',
  HTML: '#FF4D50',
  CSS: '#5294FF',
  Shell: '#000000',
  Rust: '#FFB700',
  Kotlin: '#05E17A',
  Swift: '#FACC00',
  Dart: '#5294FF',
  Vue: '#05E17A',
  React: '#5294FF',
  Svelte: '#FF4D50',
}

const DEFAULT_COLORS = ['#FACC00', '#5294FF', '#05E17A', '#FF4D50', '#7A83FF']

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
      <div className="border-2 border-black bg-white p-6 shadow-neobrutalism text-black text-center font-sans font-bold">
        No language data available.
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
        <h3 className="text-black text-lg mb-4 font-heading font-black">TOP LANGUAGES</h3>
        <div className="w-full h-[200px] flex items-center justify-center">
          <div className="text-black font-sans font-bold">Loading chart...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
      <h3 className="text-black text-lg mb-4 font-heading font-black">TOP LANGUAGES</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative">
          <PieChart width={200} height={200}>
            <Pie
              data={topLanguages}
              cx={100}
              cy={100}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="#000"
              strokeWidth={2}
            >
              {topLanguages.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-black text-2xl font-heading font-black">
              {totalContributions.toLocaleString()}
            </div>
            <div className="text-black text-xs font-sans font-bold">
              Contributions
            </div>
          </div>
        </div>

        {/* Legend with bars */}
        <div className="flex-1 space-y-2">
          {topLanguages.map((lang, index) => (
            <div key={lang.name} className="flex items-center gap-3">
              <div 
                className="w-4 h-4 border-2 border-black flex-shrink-0" 
                style={{ backgroundColor: lang.color }}
              />
              <div className="flex-1 text-black font-sans font-bold text-sm">
                {lang.name} ({lang.value.toFixed(1)}%)
              </div>
              <div className="w-24 h-4 border-2 border-black shadow-neobrutalism-sm relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{ width: `${lang.value}%`, backgroundColor: lang.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

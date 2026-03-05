'use client'

interface LanguageData {
  name: string
  percentage: number
  color: string
}

interface LanguageChartProps {
  languages: LanguageData[]
  totalContributions: number
}

// Predefined colors for languages (Neobrutalism palette)
const LANGUAGE_COLORS: Record<string, string> = {
  'JavaScript': '#FACC00', // Yellow
  'TypeScript': '#5294FF', // Blue
  'Python': '#05E17A', // Green
  'Java': '#FF4D50', // Red
  'Go': '#7A83FF', // Purple
  'Rust': '#FFB700', // Amber
  'C++': '#000000', // Black
  'C': '#000000', // Black
  'Ruby': '#FF4D50', // Red
  'PHP': '#5294FF', // Blue
  'Swift': '#FACC00', // Yellow
  'Kotlin': '#05E17A', // Green
  'Dart': '#5294FF', // Blue
  'Shell': '#000000', // Black
  'HTML': '#FF4D50', // Red
  'CSS': '#5294FF', // Blue
  'Vue': '#05E17A', // Green
  'React': '#5294FF', // Blue
  'Svelte': '#FF4D50', // Red
}

const DEFAULT_COLORS = ['#FACC00', '#5294FF', '#05E17A', '#FF4D50', '#7A83FF', '#FFB700', '#000000']

export default function LanguageChart({ languages, totalContributions }: LanguageChartProps) {
  if (!languages || languages.length === 0) {
    return (
      <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
        <h3 className="text-black text-lg mb-4 font-heading font-black">TOP LANGUAGES</h3>
        <div className="text-black font-sans font-bold text-center py-8">
          No language data available
        </div>
      </div>
    )
  }

  // Calculate angles for the donut chart
  let currentAngle = -90 // Start at top
  const segments = languages.map((lang, index) => {
    const angle = (lang.percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // Calculate path for SVG arc (donut segment)
    const radius = 60
    const innerRadius = 40
    const centerX = 100
    const centerY = 100

    const startAngleRad = ((startAngle - 90) * Math.PI) / 180
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    const x3 = centerX + innerRadius * Math.cos(endAngleRad)
    const y3 = centerY + innerRadius * Math.sin(endAngleRad)
    const x4 = centerX + innerRadius * Math.cos(startAngleRad)
    const y4 = centerY + innerRadius * Math.sin(startAngleRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `

    return {
      ...lang,
      path,
      startAngle,
      endAngle,
      color: LANGUAGE_COLORS[lang.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }
  })

  return (
    <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
      <h3 className="text-black text-lg mb-4 font-heading font-black">TOP LANGUAGES</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.path}
                fill={segment.color}
                stroke="#000"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity"
                style={{ cursor: 'pointer' }}
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-black text-2xl font-heading font-black">
              {totalContributions.toLocaleString()}
            </div>
            <div className="text-black text-xs font-sans font-bold">
              Contributions
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {languages.slice(0, 5).map((lang, index) => {
            const segment = segments[index]
            const barWidth = lang.percentage
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 border-2 border-black flex-shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="text-black font-sans font-bold text-sm">{lang.name}</span>
                  </div>
                  <span className="text-black font-sans font-bold text-sm">{lang.percentage.toFixed(1)}%</span>
                </div>
                {/* Bar visualization */}
                <div className="relative h-6 border-2 border-black bg-white">
                  <div
                    className="h-full border-r-2 border-black transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

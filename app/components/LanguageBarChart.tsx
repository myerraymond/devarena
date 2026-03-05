'use client'

interface LanguageData {
  name: string
  percentage: number
  size: number
}

interface LanguageBarChartProps {
  languages: LanguageData[]
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

export default function LanguageBarChart({ languages }: LanguageBarChartProps) {
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

  // Find max percentage for scaling
  const maxPercentage = Math.max(...languages.map(l => l.percentage), 1)

  return (
    <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
      <h3 className="text-black text-lg mb-6 font-heading font-black">TOP LANGUAGES</h3>
      <div className="space-y-4">
        {languages.slice(0, 5).map((lang, index) => {
          const color = LANGUAGE_COLORS[lang.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
          const width = maxPercentage > 0 ? (lang.percentage / maxPercentage) * 100 : 0
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-black font-sans font-bold text-sm">{lang.name}</span>
                <span className="text-black font-sans font-bold text-sm">{lang.percentage.toFixed(1)}%</span>
              </div>
              <div className="relative h-8 border-2 border-black bg-white">
                <div
                  className="h-full border-r-2 border-black transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DailyData {
  date: string
  count: number
}

interface DailyChartProps {
  data: DailyData[]
}

export default function DailyChart({ data }: DailyChartProps) {
  // Find max count for scaling
  const maxCount = Math.max(...data.map(d => d.count), 1)
  
  // Get day labels (e.g., "Mon", "Tue")
  const getDayLabel = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // Get date label (e.g., "Jan 15")
  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
      <h3 className="text-black text-lg mb-4 font-heading font-black">DAILY CONTRIBUTIONS</h3>
      <div className="flex items-end gap-3 h-40">
        {data.map((day, index) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
          const hasContributions = day.count > 0
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full relative" style={{ height: '120px' }}>
                {hasContributions ? (
                  <div
                    className="w-full bg-green border-2 border-black absolute bottom-0 transition-all hover:bg-blue"
                    style={{ height: `${height}%` }}
                    title={`${day.count} contributions on ${getDateLabel(day.date)}`}
                  />
                ) : (
                  <div
                    className="w-full bg-white border-2 border-black absolute bottom-0"
                    style={{ height: '4px' }}
                    title={`No contributions on ${getDateLabel(day.date)}`}
                  />
                )}
              </div>
              <div className="text-black text-xs font-sans font-bold uppercase">{getDayLabel(day.date)}</div>
              <div className="text-black text-xs font-sans font-bold">{day.count > 0 ? day.count : '0'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  accentColor?: 'blue' | 'green' | 'red' | 'yellow'
}

export default function StatCard({ label, value, accentColor = 'blue' }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue',
    green: 'bg-green',
    red: 'bg-red',
    yellow: 'bg-yellow',
  }
  
  return (
    <div className={`border-2 border-black ${colorMap[accentColor]} p-4 shadow-neobrutalism`}>
      <div className="text-black text-xs mb-2 font-sans font-bold">{label}</div>
      <div className="text-black text-2xl font-heading font-black">{value}</div>
    </div>
  )
}

export default function LeaderboardSkeleton() {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden md:block space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`border-2 border-black ${i % 2 === 0 ? 'bg-white' : 'bg-light-blue'} p-6 shadow-neobrutalism animate-pulse`}
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-16 bg-black/20"></div>
              <div className="flex-1">
                <div className="w-48 h-6 bg-black/20 mb-3"></div>
                <div className="w-64 h-4 bg-black/10"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`border-2 border-black ${i % 2 === 0 ? 'bg-white' : 'bg-light-blue'} p-4 shadow-neobrutalism animate-pulse`}
          >
            <div className="w-16 h-12 bg-black/20 mb-3"></div>
            <div className="w-32 h-5 bg-black/20 mb-2"></div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="w-20 h-4 bg-black/10"></div>
              <div className="w-20 h-4 bg-black/10"></div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

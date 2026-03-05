import NotFound from '@/app/components/NotFound'
import { notFound } from 'next/navigation'

export default function UserNotFound() {
  // This is a fallback - the actual username will be handled in the page component
  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <div className="text-center border-2 border-black bg-white p-8 shadow-neobrutalism max-w-md">
        <div className="font-heading text-4xl font-black text-black mb-4">
          USER NOT FOUND
        </div>
        <div className="text-black font-sans font-bold mb-8">
          This user does not exist or is not public
        </div>
        <div className="text-black font-sans font-bold text-sm">
          <span className="font-heading">404</span> - Page not found
        </div>
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Logo from '@/components/logo'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 text-center space-y-6">
        <Link href="/" className="inline-block mb-4">
          <Logo size="md" />
        </Link>
        <h1 className="text-6xl font-mono font-bold">404</h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist. Maybe the URL is wrong, or the page was removed.
        </p>
        <Button asChild>
          <Link href="/">Back to leaderboard</Link>
        </Button>
      </div>
    </div>
  )
}

import Link from 'next/link'
import Logo from '@/components/logo'

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DevArena
            </span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/how"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import Logo from '@/components/logo'
import TurnstileSignIn from '@/components/turnstile-signin'
import InfoTooltip from '@/components/info-tooltip'

const NAV_LINKS = [
  { href: '/', label: 'Leaderboard' },
  { href: '/feed', label: 'Feed' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/cracked', label: 'Cracked 👑' },
  { href: '/how', label: 'How it works' },
]

export default function Navbar() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [onlineCount, setOnlineCount] = useState<number | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch online count and refresh every 60 seconds
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await fetch('/api/online')
        if (res.ok) {
          const data = await res.json()
          setOnlineCount(data.count ?? 0)
        }
      } catch {
        // Silently fail
      }
    }

    fetchOnline()
    const interval = setInterval(fetchOnline, 60000)
    return () => clearInterval(interval)
  }, [])

  const githubUsername = 
    (session?.user as any)?.login || 
    (session?.user as any)?.name || 
    null
  
  const avatarUrl = githubUsername
    ? `https://github.com/${githubUsername}.png`
    : session?.user?.image || null
  const displayName = (session?.user as any)?.name || githubUsername
  const userInitials = githubUsername ? githubUsername[0].toUpperCase() : 'U'

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <nav className="bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Logo size="md" />
              </Link>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">DevArena</h4>
                <p className="text-sm text-muted-foreground">
                  A verified coding leaderboard that tracks GitHub activity. See who&apos;s building the hardest, ranked by builder score.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Online count */}
          {onlineCount !== null && onlineCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="hidden sm:inline">
                <InfoTooltip
                  label={`${onlineCount} building now`}
                  explanation="Builders who have pushed a commit in the last 2 hours."
                  className="no-underline decoration-transparent text-green-600"
                />
              </span>
            </div>
          )}
        </div>
        
        {/* Desktop navigation — hidden on mobile */}
        <div className="hidden lg:flex gap-4 items-center">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          
          {status === 'loading' && (
            <div className="text-muted-foreground text-sm">
              Loading...
            </div>
          )}

          {status === 'authenticated' && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 cursor-pointer"
                type="button"
              >
                <Avatar>
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={githubUsername || 'User'} />}
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-md shadow-md min-w-[180px] z-50 overflow-hidden">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/dashboard" onClick={() => setShowDropdown(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/dashboard/readme" onClick={() => setShowDropdown(false)}>
                      README Card
                    </Link>
                  </Button>
                  {githubUsername && (
                    <>
                      <Separator />
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href={`/u/${githubUsername}`} onClick={() => setShowDropdown(false)}>
                          View Profile
                        </Link>
                      </Button>
                    </>
                  )}
                  <Separator />
                  <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          )}

          {status === 'unauthenticated' && (
            <TurnstileSignIn>
              Sign in with GitHub
            </TurnstileSignIn>
          )}
        </div>

        {/* Mobile menu — visible only on < lg */}
        <div className="flex lg:hidden items-center gap-3">
          {status === 'authenticated' && (
            <Link href="/dashboard" className="cursor-pointer">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={githubUsername || 'User'} />}
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                {/* User info at top if signed in */}
                {status === 'authenticated' && githubUsername && (
                  <div className="px-6 pt-8 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={githubUsername} />}
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{displayName}</div>
                        <div className="text-sm text-muted-foreground truncate">@{githubUsername}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nav links */}
                <nav className="flex-1 px-4 py-4">
                  <div className="space-y-1">
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center h-12 px-3 rounded-md text-base font-medium hover:bg-muted transition-colors cursor-pointer"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {status === 'authenticated' && githubUsername && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center h-12 px-3 rounded-md text-base font-medium hover:bg-muted transition-colors cursor-pointer"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href={`/u/${githubUsername}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center h-12 px-3 rounded-md text-base font-medium hover:bg-muted transition-colors cursor-pointer"
                        >
                          View Profile
                        </Link>
                      </div>
                      <Separator className="my-3" />
                      <button
                        onClick={() => {
                          setMobileOpen(false)
                          handleSignOut()
                        }}
                        className="flex items-center h-12 px-3 rounded-md text-base font-medium text-muted-foreground hover:bg-muted transition-colors w-full text-left cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </nav>

                {/* Sign in button at bottom if not authenticated */}
                {status === 'unauthenticated' && (
                  <div className="px-4 pb-6 mt-auto">
                    <div onClick={() => setMobileOpen(false)}>
                      <TurnstileSignIn className="w-full">
                        Sign in with GitHub
                      </TurnstileSignIn>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <Separator />
    </nav>
  )
}

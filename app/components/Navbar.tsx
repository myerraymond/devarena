'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import Logo from '@/components/logo'
import TurnstileSignIn from '@/components/turnstile-signin'
import InfoTooltip from '@/components/info-tooltip'

export default function Navbar() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
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
  
  const avatarUrl = session?.user?.image || null
  const userInitials = githubUsername ? githubUsername[0].toUpperCase() : 'U'

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <nav className="bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
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
        
        <div className="flex gap-4 items-center">
          <Button variant="ghost" asChild>
            <Link href="/">Leaderboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/feed">Feed</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/leagues">Leagues</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/cracked">Cracked 👑</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/how">How it works</Link>
          </Button>
          
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
      </div>
      <Separator />
    </nav>
  )
}

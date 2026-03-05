'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
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

  // Get GitHub username from session - check multiple possible locations
  const githubUsername = 
    (session?.user as any)?.login || 
    (session?.user as any)?.name || 
    null
  
  const avatarUrl = session?.user?.image || null

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <nav className="bg-white border-b-2 border-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="font-heading text-2xl font-black text-black hover:underline">
          DEVARENA
        </Link>
        <div className="flex gap-6 items-center text-sm sm:text-base">
          <Link href="/" className="text-black font-sans font-bold hover:underline">
            LEADERBOARD
          </Link>
          <Link href="/how" className="text-black font-sans font-bold hover:underline">
            HOW IT WORKS
          </Link>
          
          {status === 'loading' && (
            <div className="text-black font-sans font-bold border-2 border-black px-4 py-2 bg-white shadow-neobrutalism">
              LOADING...
            </div>
          )}

          {status === 'authenticated' && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-3 py-2 border-2 border-black bg-white shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all cursor-pointer"
                type="button"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={githubUsername || 'User'}
                    width={32}
                    height={32}
                    className="rounded-base border-2 border-black"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-base border-2 border-black bg-white flex items-center justify-center text-black font-heading font-bold text-xs">
                    {(githubUsername || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-black font-sans font-bold text-sm">
                  {githubUsername || session?.user?.email?.split('@')[0] || 'User'}
                </span>
                <svg
                  className={`w-4 h-4 text-black transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 border-2 border-black bg-white font-sans text-sm min-w-[200px] z-50 shadow-neobrutalism">
                  <Link
                    href="/dashboard"
                    onClick={() => setShowDropdown(false)}
                    className="block px-4 py-3 text-black font-bold hover:bg-yellow border-b-2 border-black transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>DASHBOARD</span>
                    </div>
                  </Link>
                  {githubUsername && (
                    <Link
                      href={`/u/${githubUsername}`}
                      onClick={() => setShowDropdown(false)}
                      className="block px-4 py-3 text-black font-bold hover:bg-yellow border-b-2 border-black transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>VIEW PROFILE</span>
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-3 text-black font-bold hover:bg-red hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>SIGN OUT</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'unauthenticated' && (
            <Link
              href="/api/auth/signin"
              className="text-black font-sans font-bold border-2 border-black px-4 py-2 bg-yellow shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
            >
              Sign in with GitHub →
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

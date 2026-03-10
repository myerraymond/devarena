import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// ── Public routes (no auth required) ───────────────────────
const PUBLIC_PATHS = [
  '/',
  '/how',
  '/kings',
  '/waitlist',
  '/feed',
  '/leagues',
  '/cracked',
]

const PUBLIC_PATH_PREFIXES = [
  '/u/',          // User profiles
  '/api/auth/',   // NextAuth routes
  '/api/feed',    // Feed API (public read)
  '/api/leaderboard', // Leaderboard API (public read)
  '/api/online',  // Online count
  '/api/waitlist', // Waitlist signup
  '/badge/',      // Badge images
  '/readme/',     // README card images
  '/api/cron/',   // Cron jobs (protected by CRON_SECRET)
  '/_next/',      // Next.js internals
  '/favicon',     // Favicon
]

// Static file extensions to skip
const STATIC_EXTENSIONS = ['.ico', '.png', '.jpg', '.svg', '.css', '.js', '.woff', '.woff2']

function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.includes(pathname)) return true

  // Prefix match
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true

  // Static files
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return true

  return false
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('devarena-session')?.value

  if (!sessionToken) {
    // API routes → 401 JSON
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    // Page routes → redirect to home
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  // Verify the session JWT
  try {
    const secretKey = process.env.NEXTAUTH_SECRET
    if (!secretKey) {
      throw new Error('NEXTAUTH_SECRET not configured')
    }

    const key = new TextEncoder().encode(secretKey)
    await jwtVerify(sessionToken, key, { algorithms: ['HS256'] })

    return NextResponse.next()
  } catch {
    // Invalid or expired token
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }
    // Clear the bad cookie and redirect
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'session_expired')
    const response = NextResponse.redirect(url)
    response.cookies.delete('devarena-session')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

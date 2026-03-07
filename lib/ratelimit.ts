import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Gracefully handle missing Upstash credentials
function createRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

const redis = createRedis()

// ── Rate limiters ──────────────────────────────────────────

/** Auth endpoints: 5 attempts per IP per 10 minutes */
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'rl:auth',
    })
  : null

/** General API: 100 requests per IP per minute */
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      prefix: 'rl:api',
    })
  : null

/** Manual sync: 1 per user per 5 minutes */
export const syncLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(1, '5 m'),
      prefix: 'rl:sync',
    })
  : null

/** Profile views: 30 per IP per minute */
export const profileLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'rl:profile',
    })
  : null

// ── Helper ─────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit. Returns null if rate limiting is not configured
 * (graceful degradation when Upstash is not set up).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult | null> {
  if (!limiter) return null

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // If Redis is down, don't block requests
    console.error('Rate limit check failed:', error)
    return null
  }
}

/**
 * Build a 429 JSON response for rate-limited requests.
 */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
  return Response.json(
    { error: 'Too many requests', retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  )
}

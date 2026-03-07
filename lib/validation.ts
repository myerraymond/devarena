import { z } from 'zod'

// ── Username validation ────────────────────────────────────
// GitHub usernames: 1-39 chars, alphanumeric + hyphens, no double hyphens, no start/end with hyphen
export const usernameSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'Invalid username format')

export function isValidUsername(username: string): boolean {
  return usernameSchema.safeParse(username).success
}

// ── Leaderboard query params ───────────────────────────────
export const leaderboardQuerySchema = z.object({
  timeframe: z.enum(['week', 'month', 'alltime']).default('week'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  username: z.string().optional(),
})

// ── Feed query params ──────────────────────────────────────
export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(['first_commit', 'streak_milestone', 'rank_milestone', 'language_king']).optional(),
})

// ── Toggle public ──────────────────────────────────────────
export const togglePublicSchema = z.object({
  isPublic: z.boolean(),
})

// ── Profile update (allowlisted fields only) ───────────────
export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name is too long')
    .regex(/^[^<>"{}]+$/, 'Display name contains invalid characters')
    .optional(),
  is_public: z.boolean().optional(),
}).strict() // reject any fields not listed above

// ── Email ──────────────────────────────────────────────────
export const emailSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
})

// ── Turnstile token ────────────────────────────────────────
export const turnstileSchema = z.object({
  token: z.string().min(1, 'Turnstile token is required'),
})

import { z } from 'zod'

const envSchema = z.object({
  // Auth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Cron
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

  // Bot protection (Turnstile)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Rate limiting (Upstash) — optional, gracefully degrade if missing
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

function getEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    // In development, warn but don't crash for optional vars
    if (process.env.NODE_ENV === 'development') {
      const requiredIssues = parsed.error.issues.filter(
        (issue) =>
          !['TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'].includes(
            issue.path[0] as string
          )
      )
      if (requiredIssues.length > 0) {
        console.error(`❌ Missing required environment variables:\n${formatted}`)
        throw new Error('Missing required environment variables')
      }
      console.warn(`⚠️ Missing optional environment variables:\n${formatted}`)
      return process.env as unknown as z.infer<typeof envSchema>
    }

    console.error(`❌ Invalid environment variables:\n${formatted}`)
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = getEnv()

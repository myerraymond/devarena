import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — createClient is deferred until first property access.
// This prevents "supabaseUrl is required" during Next.js build-time page collection
// when environment variables aren't yet available.
let _supabase: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    _supabase = createClient(url, key)
  }
  return _supabase
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as any)[prop]
  },
})

// Server-side client with service role key for admin operations
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

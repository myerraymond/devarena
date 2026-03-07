import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// ═══════════════════════════════════════════════════════════
// ── CONFIG ──
// ═══════════════════════════════════════════════════════════

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Make sure .env.local contains:')
  console.error('     NEXT_PUBLIC_SUPABASE_URL=...')
  console.error('     SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ═══════════════════════════════════════════════════════════
// ── REAL ACCOUNTS TO PRESERVE ──
// Add your real GitHub usernames here so they are never deleted
// ═══════════════════════════════════════════════════════════

const REAL_ACCOUNTS: string[] = [
  // Add your real user github_usernames here, e.g.:
  // 'myerraymond',
]

// ═══════════════════════════════════════════════════════════
// ── CLEAR SEED DATA ──
// ═══════════════════════════════════════════════════════════

async function clearSeedData() {
  console.log('🧹 Clearing seeded data from DevArena...\n')

  // ── 1. Identify seeded users (those without a github_access_token) ──
  // Real users have connected via GitHub OAuth and have a token.
  // Seeded users have no token.
  // Also exclude any explicitly listed real accounts.

  const { data: seededUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, username, github_username')
    .is('github_access_token', null)

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError.message)
    process.exit(1)
  }

  if (!seededUsers || seededUsers.length === 0) {
    console.log('ℹ️  No seeded users found. Nothing to clear.')
    process.exit(0)
  }

  // Filter out real accounts
  const usersToDelete = seededUsers.filter(
    u => !REAL_ACCOUNTS.includes(u.github_username || '') &&
         !REAL_ACCOUNTS.includes(u.username || '')
  )

  console.log(`   Found ${seededUsers.length} users without github_access_token`)
  console.log(`   Preserving ${REAL_ACCOUNTS.length} real accounts`)
  console.log(`   Will delete ${usersToDelete.length} seeded users\n`)

  if (usersToDelete.length === 0) {
    console.log('ℹ️  No users to delete after filtering.')
    process.exit(0)
  }

  const idsToDelete = usersToDelete.map(u => u.id)

  // ── 2. Delete related data (cascade should handle this, but explicit is safer) ──

  // Delete feed events for seeded users
  console.log('   Deleting feed events...')
  const { error: feedErr, count: feedCount } = await supabase
    .from('feed_events')
    .delete({ count: 'exact' })
    .in('user_id', idsToDelete)
  if (feedErr) console.error('   ❌ Feed events:', feedErr.message)
  else console.log(`   ✓ Deleted ${feedCount ?? 0} feed events`)

  // Delete league memberships for seeded users
  console.log('   Deleting league memberships...')
  const { error: leagueErr, count: leagueCount } = await supabase
    .from('league_memberships')
    .delete({ count: 'exact' })
    .in('user_id', idsToDelete)
  if (leagueErr) console.error('   ❌ League memberships:', leagueErr.message)
  else console.log(`   ✓ Deleted ${leagueCount ?? 0} league memberships`)

  // Delete stats snapshots for seeded users
  console.log('   Deleting stats snapshots...')
  const { error: statsErr, count: statsCount } = await supabase
    .from('stats_snapshots')
    .delete({ count: 'exact' })
    .in('user_id', idsToDelete)
  if (statsErr) console.error('   ❌ Stats snapshots:', statsErr.message)
  else console.log(`   ✓ Deleted ${statsCount ?? 0} stats snapshots`)

  // ── 3. Delete the seeded users themselves ──
  // Process in batches to avoid query size limits
  console.log('   Deleting users...')
  const BATCH_SIZE = 50
  let deletedCount = 0

  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = idsToDelete.slice(i, i + BATCH_SIZE)
    const { error: userErr, count } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .in('id', batch)

    if (userErr) {
      console.error(`   ❌ User batch ${Math.floor(i / BATCH_SIZE) + 1}:`, userErr.message)
    } else {
      deletedCount += count ?? 0
    }
  }
  console.log(`   ✓ Deleted ${deletedCount} users`)

  // ── 4. Clean up orphan seasons with no memberships ──
  console.log('\n   Checking for orphan seasons...')
  const { data: seasons } = await supabase.from('seasons').select('id')
  if (seasons) {
    for (const season of seasons) {
      const { count } = await supabase
        .from('league_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', season.id)

      if (count === 0) {
        await supabase.from('seasons').delete().eq('id', season.id)
        console.log(`   ✓ Deleted orphan season ${season.id}`)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ── SUMMARY ──
  // ═══════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(50))
  console.log('✅ CLEAR COMPLETE')
  console.log('═'.repeat(50))
  console.log(`✓ Deleted ${deletedCount} seeded users`)
  console.log(`✓ Deleted ${feedCount ?? 0} feed events`)
  console.log(`✓ Deleted ${leagueCount ?? 0} league memberships`)
  console.log(`✓ Deleted ${statsCount ?? 0} stats snapshots`)
  console.log(`✓ Preserved ${REAL_ACCOUNTS.length} real accounts`)
  console.log('')
}

clearSeedData()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('💥 Clear failed:', err)
    process.exit(1)
  })

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import ReadmeCardConfigurator from './ReadmeCardConfigurator'

export const metadata = {
  title: 'README Card — DevArena',
  description: 'Add a live DevArena card to your GitHub profile README.',
}

async function getUsername(userId: string): Promise<string | null> {
  const serverClient = createServerClient()
  const { data } = await serverClient
    .from('users')
    .select('username, github_username')
    .eq('id', userId)
    .single()

  if (!data) return null
  return data.github_username || data.username || null
}

export default async function ReadmeCardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  const username = await getUsername(session.userId)

  if (!username) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <p className="text-muted-foreground">
            Could not load your profile. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <ReadmeCardConfigurator username={username} />
      </div>
    </div>
  )
}

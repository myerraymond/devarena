'use client'

import { useSession, signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function ConnectCTA() {
  const { status } = useSession()

  if (status === 'authenticated') {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6">
      <Button onClick={() => signIn('github')}>
        Sign in with GitHub →
      </Button>
    </div>
  )
}

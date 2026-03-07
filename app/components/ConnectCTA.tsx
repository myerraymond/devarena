'use client'

import { useSession } from 'next-auth/react'
import TurnstileSignIn from '@/components/turnstile-signin'

export default function ConnectCTA() {
  const { status } = useSession()

  if (status === 'authenticated') {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6">
      <TurnstileSignIn>
        Sign in with GitHub →
      </TurnstileSignIn>
    </div>
  )
}

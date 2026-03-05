'use client'

import { useSession, signIn } from 'next-auth/react'

export default function ConnectCTA() {
  const { status } = useSession()

  // Don't show if user is authenticated
  if (status === 'authenticated') {
    return null
  }

  return (
    <button
      onClick={() => signIn('github')}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-yellow text-black px-6 py-3 border-2 border-black shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all font-sans font-bold text-sm sm:text-base z-40"
    >
      Sign in with GitHub →
    </button>
  )
}

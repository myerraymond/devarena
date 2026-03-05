'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthCallback() {
  const { status, data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      // Create our session cookie
      fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      }).finally(() => {
        router.replace('/dashboard')
      })
    }
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <div className="text-center font-sans font-bold text-black border-2 border-black bg-white p-8 shadow-neobrutalism">
        Loading...
      </div>
    </div>
  )
}

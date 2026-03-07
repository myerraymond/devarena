'use client'

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'

interface TurnstileSignInProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  children?: React.ReactNode
}

export default function TurnstileSignIn({
  className,
  variant = 'default',
  children,
}: TurnstileSignInProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(!siteKey) // Skip if not configured

  const handleSuccess = useCallback((token: string) => {
    setTurnstileToken(token)
    setIsVerified(true)
  }, [])

  const handleSignIn = () => {
    if (!isVerified) return
    // Pass turnstile token as a query parameter for server-side verification
    signIn('github', {
      callbackUrl: '/dashboard',
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {siteKey && (
        <Turnstile
          siteKey={siteKey}
          onSuccess={handleSuccess}
          options={{
            theme: 'light',
            size: 'compact',
          }}
        />
      )}
      <Button
        onClick={handleSignIn}
        disabled={!isVerified}
        variant={variant}
        className={className}
      >
        {children || 'Sign in with GitHub'}
      </Button>
    </div>
  )
}

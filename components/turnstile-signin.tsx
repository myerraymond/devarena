'use client'

import { signIn } from 'next-auth/react'
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
  const handleSignIn = () => {
    signIn('github', {
      callbackUrl: '/dashboard',
    })
  }

  return (
    <Button
      onClick={handleSignIn}
      variant={variant}
      className={className}
    >
      {children || 'Sign in with GitHub'}
    </Button>
  )
}

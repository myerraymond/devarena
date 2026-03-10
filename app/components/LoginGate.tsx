import TurnstileSignIn from '@/components/turnstile-signin'

interface LoginGateProps {
  icon: string
  title: string
  description: string
}

export default function LoginGate({ icon, title, description }: LoginGateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm space-y-6">
        <div className="text-5xl">{icon}</div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <TurnstileSignIn>Sign in with GitHub</TurnstileSignIn>
      </div>
    </div>
  )
}

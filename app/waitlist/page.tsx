'use client'

import { useState } from 'react'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setSubmitted(true)
        setEmail('')
      }
    } catch (error) {
      console.error('Failed to submit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-heading font-black text-black mb-4">
            JOIN THE LEADERBOARD
          </h1>
        </header>

        {!submitted ? (
          <>
            {/* Email Form */}
            <form onSubmit={handleSubmit} className="mb-12 border-2 border-black bg-white p-6 shadow-neobrutalism">
              <div className="relative mb-6">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-transparent text-black font-sans font-bold text-xl pb-2 border-b-2 border-black focus:outline-none placeholder:text-black/50"
                  disabled={isSubmitting}
                />
                <span className="absolute right-0 bottom-2 text-black font-sans font-bold animate-pulse">
                  _
                </span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="border-2 border-black bg-yellow text-black px-6 py-3 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
              </button>
            </form>

            {/* Sign in with GitHub */}
            <div className="border-2 border-black bg-white p-6 shadow-neobrutalism">
              <h2 className="text-2xl font-heading font-black mb-6 text-black">
                GET STARTED
              </h2>
              <div className="space-y-4 text-black font-sans font-bold text-sm mb-6">
                <div>
                  Sign in with GitHub to instantly join the leaderboard. Your commit activity, 
                  contribution streak, and top language are pulled directly from your GitHub profile.
                </div>
              </div>
              <a
                href="/api/auth/signin"
                className="inline-block border-2 border-black bg-black text-white px-6 py-3 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
              >
                SIGN IN WITH GITHUB →
              </a>
            </div>
          </>
        ) : (
          <div className="text-center py-12 border-2 border-black bg-green p-8 shadow-neobrutalism">
            <div className="text-4xl font-heading font-black text-white mb-4">
              ✓ YOU&apos;RE ON THE LIST. START BUILDING.
            </div>
            <div className="text-white font-sans font-bold mb-8">
              We&apos;ll notify you when you can join the leaderboard.
            </div>
            <a
              href="/api/auth/signin"
              className="inline-block border-2 border-black bg-black text-white px-6 py-3 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
            >
              SIGN IN WITH GITHUB →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function HowPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-black mb-4">
            HOW IT WORKS
          </h1>
          <p className="text-xl font-sans font-bold text-black">
            Join the leaderboard in seconds. No setup required.
          </p>
        </header>

        <div className="space-y-6 mb-12">
          {/* Step 1: Get Started */}
          <div className="border-2 border-black bg-yellow p-8 shadow-neobrutalism">
            <div className="flex items-start gap-4 mb-4">
              <div className="border-2 border-black bg-black text-white w-12 h-12 flex items-center justify-center font-heading font-black text-2xl flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-heading font-black text-black mb-3">
                  SIGN IN WITH GITHUB
                </h2>
                <p className="text-black leading-relaxed mb-4 font-sans font-bold text-lg">
                  Click the button below to instantly join the leaderboard. Your commit activity, 
                  contribution streak, and top language are pulled directly from your GitHub profile. 
                  No configuration needed.
                </p>
                <button
                  onClick={() => signIn('github')}
                  className="border-2 border-black bg-black text-white px-8 py-4 font-sans font-bold text-lg shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
                >
                  SIGN IN WITH GITHUB →
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Verification */}
          <div className="border-2 border-black bg-blue p-8 shadow-neobrutalism">
            <div className="flex items-start gap-4 mb-4">
              <div className="border-2 border-black bg-white text-black w-12 h-12 flex items-center justify-center font-heading font-black text-2xl flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-heading font-black text-white mb-3">
                  AUTOMATIC VERIFICATION
                </h2>
                <p className="text-white leading-relaxed font-sans font-bold text-lg mb-4">
                  Your GitHub stats are pulled directly from the GitHub GraphQL API. We never self-report. 
                  Stats are synced every 60 minutes automatically.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="border-2 border-white bg-white/20 p-4">
                    <div className="text-white font-heading font-black text-2xl mb-1">COMMITS</div>
                    <div className="text-white font-sans font-bold text-sm">Total commits this year</div>
                  </div>
                  <div className="border-2 border-white bg-white/20 p-4">
                    <div className="text-white font-heading font-black text-2xl mb-1">STREAK</div>
                    <div className="text-white font-sans font-bold text-sm">Contribution streak days</div>
                  </div>
                  <div className="border-2 border-white bg-white/20 p-4">
                    <div className="text-white font-heading font-black text-2xl mb-1">LANGUAGE</div>
                    <div className="text-white font-sans font-bold text-sm">Most used language</div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Privacy */}
          <div className="border-2 border-black bg-white p-8 shadow-neobrutalism">
            <div className="flex items-start gap-4">
              <div className="border-2 border-black bg-black text-white w-12 h-12 flex items-center justify-center font-heading font-black text-2xl flex-shrink-0">
                🔒
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-heading font-black text-black mb-3">
                  PRIVACY & CONTROL
                </h2>
                <p className="text-black leading-relaxed font-sans font-bold text-lg mb-4">
                  You control your visibility. Toggle your profile between public and private 
                  in your dashboard. Private profiles don&apos;t appear on the leaderboard.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="border-2 border-black bg-light-blue p-4">
                    <div className="text-black font-heading font-black text-xl mb-2">PUBLIC</div>
                    <div className="text-black font-sans font-bold text-sm">
                      Visible on leaderboard, shareable profile
                    </div>
                  </div>
                  <div className="border-2 border-black bg-white p-4">
                    <div className="text-black font-heading font-black text-xl mb-2">PRIVATE</div>
                    <div className="text-black font-sans font-bold text-sm">
                      Hidden from leaderboard, stats still tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="border-2 border-black bg-white p-8 shadow-neobrutalism">
          <h2 className="text-3xl font-heading font-black text-black mb-6">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-heading font-black text-black mb-2">
                How often are stats updated?
              </h3>
              <p className="text-black font-sans font-bold">
                GitHub stats sync every 60 minutes automatically.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-heading font-black text-black mb-2">
                What data do you access?
              </h3>
              <p className="text-black font-sans font-bold">
                We only access your public GitHub contribution data (commits, languages, streak). 
                We never access private repositories or personal information.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-heading font-black text-black mb-2">
                Can I disconnect my account?
              </h3>
              <p className="text-black font-sans font-bold">
                Yes! You can make your profile private at any time from your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block border-2 border-black bg-yellow text-black px-8 py-4 font-sans font-bold text-lg shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
          >
            VIEW LEADERBOARD →
          </Link>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import StreakBadge from '@/components/streak-badge'
import InfoTooltip from '@/components/info-tooltip'
import { getLanguageKings } from '@/lib/language-kings'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Cracked 👑 — DevArena',
  description: 'The #1 ranked developer per language this week on DevArena.',
}

const PRESET_LANGUAGES = [
  'Python',
  'TypeScript',
  'JavaScript',
  'Rust',
  'Go',
  'Swift',
  'Kotlin',
  'Ruby',
  'C++',
  'C#',
  'Java',
  'PHP',
  'Dart',
  'Elixir',
  'Haskell',
  'Zig',
]

export default async function CrackedPage() {
  const kings = await getLanguageKings()

  // Build a set of claimed languages and a map for quick lookup
  const claimedMap = new Map(kings.map((k) => [k.language, k]))

  // Merge: all claimed languages + any preset languages not yet claimed
  const allLanguages = new Set<string>()
  for (const k of kings) allLanguages.add(k.language)
  for (const lang of PRESET_LANGUAGES) allLanguages.add(lang)

  // Sort: claimed first (by score descending), unclaimed last (alphabetical)
  const sorted = Array.from(allLanguages).sort((a, b) => {
    const aKing = claimedMap.get(a)
    const bKing = claimedMap.get(b)
    if (aKing && !bKing) return -1
    if (!aKing && bKing) return 1
    if (aKing && bKing) return bKing.score - aKing.score
    return a.localeCompare(b)
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">
            <InfoTooltip
              label="Cracked 👑"
              explanation="The #1 ranked builder per programming language this week. Rankings are based on Builder Score and update every 6 hours. Kingdoms can be taken at any time — stay active or lose your crown."
            />
          </h1>
          <p className="text-muted-foreground">
            The #1 ranked developer per language this week
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((lang) => {
            const king = claimedMap.get(lang)

            if (!king) {
              // Unclaimed card
              return (
                <Card key={lang} className="bg-muted/30 border-dashed">
                  <CardContent className="pt-6">
                    <p className="font-mono font-bold text-lg text-muted-foreground mb-3">
                      {lang}
                    </p>
                    <div className="text-3xl mb-2 opacity-30">👑</div>
                    <p className="text-sm font-medium text-muted-foreground">
                      <InfoTooltip
                        label="Unclaimed"
                        explanation={`No one has been ranked for this language yet. Start pushing commits in ${lang} to claim this kingdom.`}
                      />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      First to build in {lang} claims the crown
                    </p>
                  </CardContent>
                </Card>
              )
            }

            // Claimed card with shimmer
            return (
              <Card
                key={lang}
                className="relative overflow-hidden bg-yellow-50 border-yellow-200"
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
                <CardContent className="relative pt-6">
                  <p className="font-mono font-bold text-lg mb-3">
                    <InfoTooltip
                      label={lang}
                      explanation={`${king.display_name || king.username} is currently ranked #1 in ${lang} on DevArena. They earned this by having the highest Builder Score among all ${lang} developers this week.`}
                    />
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          king.avatar_url ||
                          `https://github.com/${king.username}.png`
                        }
                        alt={king.username}
                      />
                      <AvatarFallback>
                        {king.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {king.display_name || king.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{king.username}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    <span className="font-mono font-semibold">
                      {king.score.toLocaleString()}
                    </span>
                  </div>
                  {king.streak && king.streak > 0 && (
                    <div className="mb-3">
                      <StreakBadge days={king.streak} size="sm" />
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="px-0 text-sm" asChild>
                    <Link href={`/u/${king.username}`}>View profile →</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

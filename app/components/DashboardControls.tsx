'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import InfoTooltip from '@/components/info-tooltip'

interface DashboardControlsProps {
  username: string
  isPublic: boolean
  rank?: number | null
  streak?: number | null
  league?: string | null
  score?: number | null
}

export default function DashboardControls({ username, isPublic, rank, streak, league, score }: DashboardControlsProps) {
  const [isPublicState, setIsPublicState] = useState(isPublic)
  const [isToggling, setIsToggling] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleShare = async () => {
    const url = `${window.location.origin}/u/${username}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const handleTogglePublic = async () => {
    setIsToggling(true)
    try {
      const response = await fetch('/api/user/toggle-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublicState }),
      })

      if (response.ok) {
        setIsPublicState(!isPublicState)
        router.refresh()
      }
    } catch {
      // Toggle failed silently
    } finally {
      setIsToggling(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const githubResponse = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (githubResponse.ok) {
        router.refresh()
      } else {
        const errorData = await githubResponse.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Sync failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch {
      alert('Sync failed. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Build preview stat columns from real data
  const previewStats: { label: string; value: string }[] = []
  if (rank) previewStats.push({ label: 'RANK', value: `# ${rank}` })
  if (streak && streak > 0) previewStats.push({ label: 'STREAK', value: `🔥 ${streak}d` })
  if (league) previewStats.push({ label: 'LEAGUE', value: league })
  if (score) previewStats.push({ label: 'SCORE', value: `${score.toLocaleString()} pts` })

  return (
    <div className="mb-8 space-y-4">
      {/* README Card */}
      {isPublicState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <InfoTooltip
                label="README Card"
                explanation="A live SVG card you can embed in your GitHub profile README. Updates automatically whenever your stats sync."
              />
            </CardTitle>
            <CardDescription>Add a live card to your GitHub profile</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Static mockup of the SVG card */}
            <div className="rounded-md border bg-white p-4 max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-[#0d0d0d] rounded flex items-center justify-center shrink-0">
                  <span className="font-mono text-[8px] font-bold text-white leading-none" style={{ letterSpacing: '-1px' }}>~/</span>
                </div>
                <span className="font-mono text-xs font-semibold text-[#0d0d0d]">DevArena</span>
              </div>
              <p className="font-mono text-xs text-[#999] mb-3">@{username}</p>
              {previewStats.length > 0 ? (
                <div className="flex items-center gap-4">
                  {previewStats.slice(0, 4).map((s) => (
                    <div key={s.label} className="text-center flex-1">
                      <div className="text-[9px] text-[#999] tracking-wider mb-0.5">{s.label}</div>
                      <div className="font-mono text-xs font-bold text-[#0d0d0d]">{s.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <span className="font-mono text-[10px] text-[#999]">No stats available</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/readme">Configure your card →</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Share */}
        <button
          onClick={handleShare}
          className="group rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
              {copied ? '✓' : '🔗'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                {copied ? 'Link copied!' : 'Share profile'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                devarena.app/u/{username}
              </p>
            </div>
          </div>
        </button>

        {/* Visibility */}
        <button
          onClick={handleTogglePublic}
          disabled={isToggling}
          className="group rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg ${
              isPublicState ? 'bg-green-100 text-green-700' : 'bg-muted'
            }`}>
              {isPublicState ? '🌐' : '🔒'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                {isPublicState ? 'Public profile' : 'Private profile'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap to {isPublicState ? 'hide' : 'show'} on leaderboard
              </p>
            </div>
          </div>
        </button>

        {/* Sync */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="group rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-lg ${
              isSyncing ? 'animate-spin' : ''
            }`}>
              {isSyncing ? '⟳' : '🔄'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pull latest from GitHub
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Danger Zone */}
      <Separator className="my-2" />
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                This will permanently delete your profile, stats, league memberships, and feed events.
                This action cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true)
                    try {
                      const response = await fetch('/api/user/delete', {
                        method: 'DELETE',
                      })
                      if (response.ok) {
                        router.push('/')
                        router.refresh()
                      } else {
                        alert('Failed to delete account. Please try again.')
                      }
                    } catch {
                      alert('Failed to delete account. Please try again.')
                    } finally {
                      setIsDeleting(false)
                    }
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Yes, delete everything'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

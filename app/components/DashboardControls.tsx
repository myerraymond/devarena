'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardControlsProps {
  username: string
  isPublic: boolean
}

export default function DashboardControls({ username, isPublic }: DashboardControlsProps) {
  const [isPublicState, setIsPublicState] = useState(isPublic)
  const [isToggling, setIsToggling] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [badgeCopied, setBadgeCopied] = useState(false)
  const [badgeUrl, setBadgeUrl] = useState('')
  const [badgeMarkdown, setBadgeMarkdown] = useState('')
  const router = useRouter()
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/badge/${username}`
      const markdown = `[![DevArena](${url})](${window.location.origin}/u/${username})`
      setBadgeUrl(url)
      setBadgeMarkdown(markdown)
    }
  }, [username])

  const handleShare = async () => {
    const url = `${window.location.origin}/u/${username}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
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
    } catch (error) {
      console.error('Failed to toggle:', error)
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
        console.error('Sync failed:', errorData)
        alert(`Sync failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      alert(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCopyBadge = async () => {
    try {
      await navigator.clipboard.writeText(badgeMarkdown)
      setBadgeCopied(true)
      setTimeout(() => setBadgeCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy badge:', error)
    }
  }

  return (
    <div className="mb-8 space-y-4">
      {isPublicState && (
        <Card>
          <CardHeader>
            <CardTitle>Embed Badge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {badgeUrl && (
              <div className="flex items-center gap-4">
                <Image 
                  src={badgeUrl} 
                  alt="DevArena Badge" 
                  className="border rounded-md"
                  width={200}
                  height={60}
                />
                <div className="flex-1">
                  <div className="bg-muted p-3 font-mono text-xs break-all rounded-md">
                    {badgeMarkdown}
                  </div>
                </div>
              </div>
            )}
            <Button variant="outline" onClick={handleCopyBadge}>
              {badgeCopied ? 'Copied!' : 'Copy badge code'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 flex-wrap">
        <Button variant="outline" onClick={handleShare}>
          {copied ? 'Copied!' : 'Share your card'}
        </Button>
        <Button variant="outline" onClick={handleTogglePublic} disabled={isToggling}>
          Profile is {isPublicState ? 'public' : 'private'}
        </Button>
        <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? 'Syncing...' : 'Sync now'}
        </Button>
      </div>
    </div>
  )
}

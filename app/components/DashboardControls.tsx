'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      // Sync GitHub stats
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
    <>
      {/* Badge Embed Section */}
      {isPublicState && (
        <div className="mb-6 border-2 border-black bg-blue p-6 shadow-neobrutalism">
          <div className="text-white font-heading font-black mb-3 text-lg">
            EMBED BADGE IN YOUR README
          </div>
          <div className="text-white font-sans font-bold text-sm mb-4">
            Add this to your GitHub README to show your DevArena stats live
          </div>
          
          {/* Badge Preview */}
          {badgeUrl && (
            <div className="mb-4 flex items-center gap-4">
              <img 
                src={badgeUrl} 
                alt="DevArena Badge" 
                className="border-2 border-black"
                width={200}
                height={60}
              />
              <div className="flex-1">
                <div className="bg-white border-2 border-black p-3 font-mono text-xs text-black break-all">
                  {badgeMarkdown}
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleCopyBadge}
            className="border-2 border-black bg-black text-white px-4 py-2 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
          >
            {badgeCopied ? '✓ COPIED!' : 'Copy Badge Code →'}
          </button>
        </div>
      )}

      <div className="mb-8 flex gap-4 flex-wrap">
        <button
          onClick={handleShare}
          className="border-2 border-black bg-white text-black px-4 py-2 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all"
        >
          {copied ? '✓ COPIED!' : 'Share your card →'}
        </button>

        <button
          onClick={handleTogglePublic}
          disabled={isToggling}
          className="border-2 border-black bg-white text-black px-4 py-2 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Your profile is {isPublicState ? 'PUBLIC' : 'PRIVATE'}
        </button>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="border-2 border-black bg-yellow text-black px-4 py-2 font-sans font-bold shadow-neobrutalism hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neobrutalism-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'SYNCING...' : 'Sync now'}
        </button>
      </div>
    </>
  )
}

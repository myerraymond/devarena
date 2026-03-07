'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface StatOption {
  id: string
  label: string
  description: string
}

const ALL_STATS: StatOption[] = [
  { id: 'rank', label: 'Global Rank', description: '# 4' },
  { id: 'streak', label: 'Streak', description: '🔥 23d' },
  { id: 'score', label: 'Builder Score', description: '1,240 pts' },
  { id: 'language', label: 'Top Language', description: 'TypeScript' },
  { id: 'league', label: 'League Tier', description: '🥇 Gold' },
  { id: 'king', label: 'Cracked', description: '👑 Rust' },
]

const MAX_STATS = 4

const BASE_URL = 'https://devarena.so'

interface Props {
  username: string
}

export default function ReadmeCardConfigurator({ username }: Props) {
  // Selected stat IDs in display order
  const [selectedStats, setSelectedStats] = useState<string[]>([
    'rank',
    'streak',
    'score',
    'language',
  ])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [style, setStyle] = useState<'compact' | 'expanded'>('compact')
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const toggleStat = useCallback((id: string) => {
    setSelectedStats((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id)
      }
      if (prev.length >= MAX_STATS) return prev
      return [...prev, id]
    })
  }, [])

  const moveUp = useCallback((id: string) => {
    setSelectedStats((prev) => {
      const idx = prev.indexOf(id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback((id: string) => {
    setSelectedStats((prev) => {
      const idx = prev.indexOf(id)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }, [])

  // Build the image URL
  const imageUrl = useMemo(() => {
    const statsParam = selectedStats.join(',')
    const params = new URLSearchParams()
    if (statsParam) params.set('stats', statsParam)
    if (theme !== 'light') params.set('theme', theme)
    if (style !== 'compact') params.set('style', style)
    return `/readme/${username}?${params.toString()}`
  }, [username, selectedStats, theme, style])

  const fullImageUrl = useMemo(() => {
    const statsParam = selectedStats.join(',')
    const params = new URLSearchParams()
    if (statsParam) params.set('stats', statsParam)
    if (theme !== 'light') params.set('theme', theme)
    if (style !== 'compact') params.set('style', style)
    return `${BASE_URL}/readme/${username}?${params.toString()}`
  }, [username, selectedStats, theme, style])

  const profileUrl = `${BASE_URL}/u/${username}`

  const markdownCode = `[![DevArena](${fullImageUrl})](${profileUrl})`
  const htmlCode = `<a href="${profileUrl}">
  <img src="${fullImageUrl}" alt="DevArena Card" />
</a>`

  const copyToClipboard = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-1">README Card</h1>
        <p className="text-sm text-muted-foreground">
          Add a live card to your GitHub profile README.
        </p>
      </header>

      {/* Live preview */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`rounded-lg p-4 flex items-center justify-center ${
              theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-50'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="DevArena README Card"
              width={480}
              height={style === 'expanded' ? 160 : 120}
              key={imageUrl} // force re-render on URL change
            />
          </div>
        </CardContent>
      </Card>

      {/* Stat toggles */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Stats to show
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {selectedStats.length}/{MAX_STATS} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ALL_STATS.map((stat) => {
              const isSelected = selectedStats.includes(stat.id)
              const isDisabled = !isSelected && selectedStats.length >= MAX_STATS
              const orderIdx = selectedStats.indexOf(stat.id)

              return (
                <div
                  key={stat.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors ${
                    isSelected ? 'bg-muted/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`stat-${stat.id}`}
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => toggleStat(stat.id)}
                    />
                    <Label
                      htmlFor={`stat-${stat.id}`}
                      className={`text-sm cursor-pointer ${
                        isDisabled ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {stat.label}
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        {stat.description}
                      </span>
                    </Label>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className="text-xs font-mono w-5 h-5 p-0 flex items-center justify-center"
                      >
                        {orderIdx + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => moveUp(stat.id)}
                        disabled={orderIdx === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => moveDown(stat.id)}
                        disabled={orderIdx === selectedStats.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Style options */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">Style</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Theme</Label>
              <Select
                value={theme}
                onValueChange={(v) => setTheme(v as 'light' | 'dark')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">☀️ Light</SelectItem>
                  <SelectItem value="dark">🌙 Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <Select
                value={style}
                onValueChange={(v) => setStyle(v as 'compact' | 'expanded')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact (120px)</SelectItem>
                  <SelectItem value="expanded">Expanded (160px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">
            Embed code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="markdown">
            <TabsList className="mb-3">
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
            </TabsList>

            <TabsContent value="markdown">
              <div className="relative">
                <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {markdownCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 text-xs"
                  onClick={() => copyToClipboard(markdownCode, 'markdown')}
                >
                  {copiedTab === 'markdown' ? '✓ Copied!' : 'Copy'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="html">
              <div className="relative">
                <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {htmlCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 text-xs"
                  onClick={() => copyToClipboard(htmlCode, 'html')}
                >
                  {copiedTab === 'html' ? '✓ Copied!' : 'Copy'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}

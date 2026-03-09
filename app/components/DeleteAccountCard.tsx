'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeleteAccountCardProps {
  username: string
}

export default function DeleteAccountCard({ username }: DeleteAccountCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const isConfirmed = confirmText === username

  const handleDelete = async () => {
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
  }

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-red-600">Danger Zone</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText('') }}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto h-10 cursor-pointer"
            >
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <span className="block">
                  This will permanently delete your profile, stats, league memberships, feed events, and all associated data.
                  This action <strong className="text-foreground">cannot be undone</strong>.
                </span>
                <span className="block text-sm">
                  Type <strong className="font-mono text-foreground">{username}</strong> to confirm.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              placeholder="Type your username to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
              autoComplete="off"
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!isConfirmed || isDeleting}
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete everything'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

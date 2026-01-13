import type React from 'react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EmailOTPRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (email: string) => Promise<void>
  isLoading?: boolean
  title?: string
  description?: string
  canEditEmail?: boolean
  defaultEmail?: string
}

export function EmailOTPRequestModal({
  isOpen,
  onClose,
  onSubmit,
  defaultEmail,
  canEditEmail = true,
  isLoading = false,
  title = 'Continue with Email OTP',
  description = 'Enter your email address to receive a verification code.',
}: EmailOTPRequestModalProps) {
  const [email, setEmail] = useState(defaultEmail || '')
  const [error, setError] = useState('')
  const emailId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setError('')
      await onSubmit(email.trim())
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP')
    }
  }

  const handleClose = () => {
    setEmail('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={emailId}>Email Address</Label>
            <Input
              readOnly={!canEditEmail}
              id={emailId}
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

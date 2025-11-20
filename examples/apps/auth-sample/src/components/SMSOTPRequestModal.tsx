import type React from 'react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SMSOTPRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (phone: string) => Promise<void>
  isLoading?: boolean
  title?: string
  description?: string
}

export function SMSOTPRequestModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  title = 'Continue with SMS OTP',
  description = 'Enter your phone number to receive a verification code.',
}: SMSOTPRequestModalProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const phoneId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }

    if (!/^\+?[\d\s\-()]+$/.test(phone)) {
      setError('Please enter a valid phone number')
      return
    }

    try {
      setError('')
      await onSubmit(phone.trim())
      setPhone('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP')
    }
  }

  const handleClose = () => {
    setPhone('')
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
            <Label htmlFor={phoneId}>Phone Number</Label>
            <Input
              id={phoneId}
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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

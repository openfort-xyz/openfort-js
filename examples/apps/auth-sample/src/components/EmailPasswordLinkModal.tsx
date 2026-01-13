import type React from 'react'
import { useState } from 'react'
import { TextField } from '@/components/Fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EmailOTPRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (params: { email: string; password: string }) => Promise<void>
  isLoading?: boolean
  title?: string
  description?: string
}

export function EmailPasswordRequestModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  title = 'Continue with Email OTP',
  description = 'Enter your email address to receive a verification code.',
}: EmailOTPRequestModalProps) {
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

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
      await onSubmit({ password: password.trim(), email: email })
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP')
    }
  }

  const handleClose = () => {
    setPassword('')
    setEmail('')
    setError('')
    onClose()
  }
  const [show, setShow] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <TextField
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="emailId"
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <TextField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              id="passwordId"
              label="Password"
              name="password"
              show={show}
              setShow={setShow}
              type="password"
              autoComplete="current-password"
              required
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

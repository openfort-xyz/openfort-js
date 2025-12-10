import type React from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (otpCode: string) => Promise<void>
  onResendOTP: () => Promise<void>
  email: string
  isLoading?: boolean
  type?: 'email' | 'phone'
  codeLength?: 6 | 9
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  onSubmit,
  onResendOTP,
  email,
  isLoading = false,
  type = 'email',
  codeLength = 9,
}: OTPVerificationModalProps) {
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const otpCodeId = useId()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otpCode.trim()) {
      setError('Verification code is required')
      return
    }

    if (otpCode.trim().length < codeLength) {
      setError('Please enter the complete verification code')
      return
    }

    try {
      setError('')
      await onSubmit(otpCode.trim())
      setOtpCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return

    try {
      setIsResending(true)
      setError('')
      await onResendOTP()
      setCountdown(60) // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setIsResending(false)
    }
  }

  const handleClose = () => {
    setOtpCode('')
    setError('')
    setCountdown(0)
    onClose()
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, codeLength) // Only numbers, max codeLength digits
    setOtpCode(value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Verification Code</DialogTitle>
          <DialogDescription>
            We've sent a {codeLength}-digit verification code to your {type === 'phone' ? 'phone' : 'email'}{' '}
            <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={otpCodeId}>Verification Code</Label>
            <Input
              ref={inputRef}
              id={otpCodeId}
              type="text"
              placeholder={codeLength === 6 ? '000000' : '000000000'}
              value={otpCode}
              onChange={handleOtpChange}
              disabled={isLoading}
              className="w-full text-center text-2xl tracking-widest"
              maxLength={codeLength}
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={handleResend}
              disabled={isResending || countdown > 0}
              className="text-sm"
            >
              {isResending ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || otpCode.length < codeLength}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

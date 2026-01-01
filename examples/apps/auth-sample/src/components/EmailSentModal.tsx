import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EmailSentModalProps {
  isOpen: boolean
  onClose: () => void
  onResendEmail: () => Promise<void>
  email: string
}

export function EmailSentModal({ isOpen, onClose, onResendEmail, email }: EmailSentModalProps) {
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleResend = async () => {
    if (countdown > 0) return

    try {
      setIsResending(true)
      setError('')
      await onResendEmail()
      setCountdown(60) // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setIsResending(false)
    }
  }
  const handleClose = () => {
    setError('')
    setCountdown(0)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Sent!</DialogTitle>
          <DialogDescription>
            You should receive an email shortly. Please check your inbox and spam folder.
            <div>
              Email: <strong>{email}</strong>
            </div>
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}

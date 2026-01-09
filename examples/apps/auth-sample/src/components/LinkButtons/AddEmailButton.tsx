import { useState } from 'react'
import { EmailOTPRequestModal } from '@/components/EmailOTPRequestModal'
import { EmailSentModal } from '@/components/EmailSentModal'
import { type StatusType, Toast } from '@/components/Toasts'
import { useOpenfort } from '@/contexts/OpenfortContext'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

export const AddEmailButton = () => {
  const { state: _state } = useOpenfort()
  const [showSMSOTPRequestModal, setShowSMSOTPRequestModal] = useState(false)
  const [isOTPLoading, setIsOTPLoading] = useState(false)
  const [status, setStatus] = useState<StatusType>(null)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')

  const handleSMSOTPRequest = async (email: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Sending OTP...',
    })

    try {
      await openfort.auth.addEmail({ email: email, callbackURL: location.href })
      setOtpEmail(email)
      setShowSMSOTPRequestModal(false)
      setShowOTPModal(true)
      setStatus({
        type: 'success',
        title: 'OTP sent to your email',
      })
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Error sending OTP',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  const handleSMSOTPRequestSubmit = async (email: string) => {
    try {
      await handleSMSOTPRequest(email)
      setIsOTPLoading(true)
    } catch (err) {
      console.error('Failed to request SMS OTP:', err)
      alert('Failed to request SMS OTP. Please try again.')
    } finally {
      setIsOTPLoading(false)
    }
  }

  return (
    <div className="my-2">
      <Button className="w-full" onClick={() => setShowSMSOTPRequestModal(true)} variant="outline">
        {isOTPLoading ? <Loading /> : `Link email`}
      </Button>

      <EmailOTPRequestModal
        isOpen={showSMSOTPRequestModal}
        onClose={() => setShowSMSOTPRequestModal(false)}
        onSubmit={handleSMSOTPRequestSubmit}
        isLoading={isOTPLoading}
        title="Continue with Email OTP"
        description="You will receive a verification code at this email address."
      />
      <EmailSentModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onResendEmail={() => handleSMSOTPRequest(otpEmail)}
        email={otpEmail}
      />
      <Toast status={status} setStatus={setStatus} />
    </div>
  )
}

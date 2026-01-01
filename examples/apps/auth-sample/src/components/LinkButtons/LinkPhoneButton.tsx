import { useState } from 'react'
import { OTPVerificationModal } from '@/components/OTPVerificationModal'
import { SMSOTPRequestModal } from '@/components/SMSOTPRequestModal'
import { type StatusType, Toast } from '@/components/Toasts'
import { useOpenfort } from '@/contexts/OpenfortContext'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

export const LinkPhoneButton = () => {
  const { state: _state } = useOpenfort()
  const [showSMSOTPRequestModal, setShowSMSOTPRequestModal] = useState(false)
  const [isOTPLoading, setIsOTPLoading] = useState(false)
  const [status, setStatus] = useState<StatusType>(null)
  const [showSMSOTPModal, setShowSMSOTPModal] = useState(false)
  const [otpPhone, setOtpPhone] = useState('')

  const handleSMSOTPRequest = async (phone: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Sending OTP...',
    })

    try {
      await openfort.auth.requestPhoneOtp({ phoneNumber: phone })
      setOtpPhone(phone)
      setShowSMSOTPRequestModal(false)
      setShowSMSOTPModal(true)
      setStatus({
        type: 'success',
        title: 'OTP sent to your phone',
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

  const handleSMSOTPVerify = async (otp: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Verifying OTP...',
    })

    try {
      await openfort.auth.linkPhoneOtp({ phoneNumber: otpPhone, otp })
      setShowSMSOTPModal(false)
      setStatus({
        type: 'success',
        title: 'Phone linked successfully',
      })
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Error verifying OTP',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  const handleSMSOTPRequestSubmit = async (phone: string) => {
    try {
      await handleSMSOTPRequest(phone)
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
        {isOTPLoading ? <Loading /> : `Link Phone`}
      </Button>

      <SMSOTPRequestModal
        isOpen={showSMSOTPRequestModal}
        onClose={() => setShowSMSOTPRequestModal(false)}
        onSubmit={handleSMSOTPRequestSubmit}
        isLoading={isOTPLoading}
        title="Continue with SMS OTP"
        description="Enter your phone number to receive a verification code."
      />
      <OTPVerificationModal
        isOpen={showSMSOTPModal}
        onClose={() => setShowSMSOTPModal(false)}
        onSubmit={handleSMSOTPVerify}
        onResendOTP={() => handleSMSOTPRequest(otpPhone)}
        email={otpPhone}
        isLoading={isOTPLoading}
        type="phone"
        codeLength={6}
      />
      <Toast status={status} setStatus={setStatus} />
    </div>
  )
}

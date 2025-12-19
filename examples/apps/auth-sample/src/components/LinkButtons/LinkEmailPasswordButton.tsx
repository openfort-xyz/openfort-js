import { useState } from 'react'
import { EmailPasswordRequestModal } from '@/components/EmailPasswordLinkModal'
import { type StatusType, Toast } from '@/components/Toasts'
import { useOpenfort } from '@/contexts/OpenfortContext'
import { getURL } from '@/utils/getUrl'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

export const LinkEmailPasswordButton = () => {
  const { state: _state } = useOpenfort()
  const [showSMSOTPRequestModal, setShowSMSOTPRequestModal] = useState(false)
  const [isOTPLoading, setIsOTPLoading] = useState(false)
  const [status, setStatus] = useState<StatusType>(null)

  const handleSMSOTPRequest = async ({ email, password }: { email: string; password: string }) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Verifying password...',
    })

    try {
      const user = await openfort.user.get()
      console.log(user)

      const res = await openfort.auth.addEmail({
        email,
        password,
        method: 'password',
        callbackURL: `${getURL()}/login`,
      })

      if (res.status === 'action_required') {
        alert(`Additional action required to link email: ${res.action}`)
      }
      setStatus({
        type: 'success',
        title: 'Email linked successfully',
      })
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Error verifying password',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  const handleSMSOTPRequestSubmit = async ({ email, password }: { email: string; password: string }) => {
    try {
      await handleSMSOTPRequest({ email, password })
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
        {isOTPLoading ? <Loading /> : `Link Email with Password`}
      </Button>

      <EmailPasswordRequestModal
        isOpen={showSMSOTPRequestModal}
        onClose={() => setShowSMSOTPRequestModal(false)}
        onSubmit={handleSMSOTPRequestSubmit}
        isLoading={isOTPLoading}
        title="Continue with Email and Password"
        description="Enter your email address and password to link your account."
      />

      <Toast status={status} setStatus={setStatus} />
    </div>
  )
}

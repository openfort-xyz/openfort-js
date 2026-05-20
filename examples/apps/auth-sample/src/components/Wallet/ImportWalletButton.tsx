import { RecoveryMethod } from '@openfort/openfort-js'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useOpenfort } from '@/contexts/OpenfortContext'
import { OTPRequestModal } from '../OTPRequestModal'
import { OTPVerificationModal } from '../OTPVerificationModal'
import { Button } from '../ui/button'

const PasswordRecoveryForm = ({
  privateKey,
  onSuccess,
  handleSetMessage,
}: {
  privateKey: string
  onSuccess: () => void
  handleSetMessage: (message: string) => void
}) => {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { importWallet } = useOpenfort()

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!privateKey) {
          setError('Private key is required')
          return
        }
        setIsLoading(true)
        setError(null)
        try {
          const response = await importWallet({
            privateKey,
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSWORD,
              password,
            },
          })
          handleSetMessage(`Imported wallet with password recovery.\nwallet: ${JSON.stringify(response, null, 2)}`)
          onSuccess()
        } catch (error) {
          console.error('Error importing wallet:', error)
          setError('Failed to import wallet. Check console log for more details.')
        }
        setIsLoading(false)
      }}
      className="p-4 border border-gray-200 rounded-lg"
    >
      <h3 className="font-medium text-black text-sm mb-2">Password Recovery</h3>
      <p className="mb-2 text-sm text-gray-600">
        Make sure to remember this password, as it will be required for wallet recovery.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter a strong password"
        autoComplete="new-password"
        spellCheck={false}
        className="w-full p-2 mb-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50"
        required
      />
      <Button className="w-full" type="submit" variant="outline" loading={isLoading}>
        Import with Password Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}

const AutomaticRecovery = ({
  privateKey,
  onSuccess,
  handleSetMessage,
}: {
  privateKey: string
  onSuccess: () => void
  handleSetMessage: (message: string) => void
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [showOTPRequest, setShowOTPRequest] = useState(false)
  const [showOTPVerification, setShowOTPVerification] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [otpRequestLoading, setOtpRequestLoading] = useState(false)
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false)
  const { getEncryptionSession, importWallet, requestOTP, getUserEmail } = useOpenfort()

  const importWalletWithSession = async (otpCode?: string) => {
    try {
      const encSessionResponse = await getEncryptionSession(otpCode)
      const response = await importWallet({
        privateKey,
        recoveryParams: {
          recoveryMethod: RecoveryMethod.AUTOMATIC,
          encryptionSession: encSessionResponse,
        },
      })
      handleSetMessage(`Imported wallet with automatic recovery.\nwallet: ${JSON.stringify(response, null, 2)}`)
      onSuccess()
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_REQUIRED') {
        const storedEmail = getUserEmail()
        if (storedEmail) {
          setUserEmail(storedEmail)
          try {
            await requestOTP({ email: storedEmail }, true)
            importWalletWithSession('')
          } catch (otpError) {
            if (otpError instanceof Error && otpError.message === 'OTP_RATE_LIMIT') {
              setErrorModal('OTP generation rate limit exceeded. Please contact an admin to resolve it.')
            } else {
              console.error('Error requesting OTP with stored email:', otpError)
              setShowOTPRequest(true)
            }
          }
        } else {
          setShowOTPRequest(true)
        }
      } else {
        console.error('Error importing wallet:', error)
        setError('Failed to import wallet. Check console log for more details.')
      }
    }
  }

  const handleOTPRequest = async (contact: { email?: string; phone?: string }) => {
    const contactValue = contact.email || contact.phone || ''
    setOtpRequestLoading(true)
    try {
      await requestOTP(contact, true)
      setUserEmail(contactValue)
      setShowOTPRequest(false)
      handleOTPVerification('')
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_RATE_LIMIT') {
        throw new Error('OTP generation rate limit exceeded. Please contact an admin to resolve it.')
      } else if (error instanceof Error && error.message === 'USER_CONTACTS_MISMATCH') {
        throw new Error('User contact information doesnt match with saved one')
      } else {
        throw error
      }
    } finally {
      setOtpRequestLoading(false)
    }
  }

  const handleOTPVerification = async (otpCode: string) => {
    setOtpVerifyLoading(true)
    try {
      await importWalletWithSession(otpCode)
    } catch (error) {
      console.error('Error verifying OTP:', error)
      throw new Error('Invalid verification code. Please try again.')
    } finally {
      setOtpVerifyLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      await requestOTP({ email: userEmail }, true)
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_RATE_LIMIT') {
        throw new Error('OTP generation rate limit exceeded. Please contact an admin to resolve it.')
      } else if (error instanceof Error && error.message === 'USER_CONTACTS_MISMATCH') {
        throw new Error('User contact information doesnt match with saved one')
      } else {
        throw error
      }
    }
  }

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!privateKey) {
            setError('Private key is required')
            return
          }
          setIsLoading(true)
          setError(null)
          try {
            await importWalletWithSession()
          } finally {
            setIsLoading(false)
          }
        }}
        className="p-4 border border-gray-200 rounded-lg"
      >
        <h3 className="font-medium text-black text-sm mb-2">Automatic Recovery</h3>
        <p className="mb-2 text-sm text-gray-600">
          Your wallet will be automatically recovered using the encryption session.
        </p>
        <Button className="w-full" type="submit" variant="outline" loading={isLoading}>
          Import with Automatic Recovery
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      <OTPRequestModal
        isOpen={showOTPRequest}
        onClose={() => setShowOTPRequest(false)}
        onSubmit={handleOTPRequest}
        isLoading={otpRequestLoading}
        title="Setup OTP for Recovery"
        description="Put your OTP information here for future key recovery"
      />

      <OTPVerificationModal
        isOpen={showOTPVerification}
        onClose={() => setShowOTPVerification(false)}
        onSubmit={handleOTPVerification}
        onResendOTP={handleResendOTP}
        email={userEmail}
        isLoading={otpVerifyLoading}
      />

      {errorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Error</h3>
              <button type="button" onClick={() => setErrorModal(null)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <p className="text-gray-700 mb-4">{errorModal}</p>
            <button
              type="button"
              onClick={() => setErrorModal(null)}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const PasskeyRecovery = ({
  privateKey,
  onSuccess,
  handleSetMessage,
}: {
  privateKey: string
  onSuccess: () => void
  handleSetMessage: (message: string) => void
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { importWallet } = useOpenfort()

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!privateKey) {
          setError('Private key is required')
          return
        }
        setIsLoading(true)
        setError(null)
        try {
          const response = await importWallet({
            privateKey,
            recoveryParams: {
              recoveryMethod: RecoveryMethod.PASSKEY,
            },
          })
          handleSetMessage(`Imported wallet with passkey recovery.\nwallet: ${JSON.stringify(response, null, 2)}`)
          onSuccess()
        } catch (error) {
          console.error('Error importing wallet:', error)
          setError('Failed to import wallet. Check console log for more details.')
        }
        setIsLoading(false)
      }}
      className="p-4 border border-gray-200 rounded-lg"
    >
      <h3 className="font-medium text-black text-sm mb-2">Passkey Recovery</h3>
      <p className="mb-2 text-sm text-gray-600">Your wallet will be recovered using hosted passkey.</p>
      <Button className="w-full" type="submit" variant="outline" loading={isLoading}>
        Import with Passkey Recovery
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}

const Content = ({
  onSuccess,
  handleSetMessage,
}: {
  onSuccess: () => void
  handleSetMessage: (message: string) => void
}) => {
  const [privateKey, setPrivateKey] = useState('')

  const handleSuccess = () => {
    setPrivateKey('')
    onSuccess()
  }

  return (
    <div className="space-y-2">
      <div className="p-4 border border-gray-200 rounded-lg">
        <label htmlFor="import-private-key" className="font-medium text-black text-sm">
          Private key
        </label>
        <p className="mb-2 text-sm text-gray-600">
          Hex-encoded private key for EVM chains, or base58-encoded secret key for Solana.
        </p>
        <input
          id="import-private-key"
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value.trim())}
          placeholder="0x... or base58 string"
          autoComplete="off"
          spellCheck={false}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <p className="font-medium text-black text-sm">Choose a recovery method for the imported wallet:</p>
      <AutomaticRecovery privateKey={privateKey} onSuccess={handleSuccess} handleSetMessage={handleSetMessage} />
      <PasswordRecoveryForm privateKey={privateKey} onSuccess={handleSuccess} handleSetMessage={handleSetMessage} />
      <PasskeyRecovery privateKey={privateKey} onSuccess={handleSuccess} handleSetMessage={handleSetMessage} />
    </div>
  )
}

const ImportWalletButton = ({ handleSetMessage }: { handleSetMessage: (message: string) => void }) => {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="w-full" variant="outline">
          Import wallet
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="mb-4">Import a wallet from private key</SheetTitle>
        <Content onSuccess={() => setOpen(false)} handleSetMessage={handleSetMessage} />
      </SheetContent>
    </Sheet>
  )
}

export default ImportWalletButton

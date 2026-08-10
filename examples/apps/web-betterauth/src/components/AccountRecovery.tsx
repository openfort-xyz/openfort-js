import { RecoveryMethod } from '@openfort/openfort-js'
import { useId, useState } from 'react'
import openfortService from '../services/openfortService'

export default function AccountRecovery() {
  const passwordId = useId()
  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethod | null>(null)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRecoveryMethodSelect = async (method: RecoveryMethod) => {
    if (method !== RecoveryMethod.PASSWORD) {
      setIsLoading(true)
      setError(null)
      try {
        if (method === RecoveryMethod.AUTOMATIC) {
          await openfortService.setAutomaticRecoveryMethod()
        } else if (method === RecoveryMethod.PASSKEY) {
          await openfortService.setPasskeyRecoveryMethod()
        }
        // Reload to update embedded state
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to configure recovery method')
        setIsLoading(false)
      }
    } else {
      setSelectedMethod(method)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await openfortService.setPasswordRecoveryMethod(password)
      // Reload to update embedded state
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure recovery method')
      setIsLoading(false)
    }
  }

  if (selectedMethod === RecoveryMethod.PASSWORD) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Set Password Recovery</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 mb-2">
              Enter Password
            </label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter at least 4 characters"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Configuring...' : 'Set Password'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod(null)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Choose Recovery Method</h2>
      <p className="text-gray-600 mb-6">Select how you want to secure and recover your wallet</p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleRecoveryMethodSelect(RecoveryMethod.PASSKEY)}
          disabled={isLoading}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
        >
          <div className="font-semibold text-lg mb-1">🔐 Passkey</div>
          <div className="text-sm text-gray-600">Use biometric authentication (fingerprint, face ID)</div>
        </button>

        <button
          type="button"
          onClick={() => handleRecoveryMethodSelect(RecoveryMethod.AUTOMATIC)}
          disabled={isLoading}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
        >
          <div className="font-semibold text-lg mb-1">🔄 Automatic</div>
          <div className="text-sm text-gray-600">Automatic recovery with encryption session</div>
        </button>

        <button
          type="button"
          onClick={() => handleRecoveryMethodSelect(RecoveryMethod.PASSWORD)}
          disabled={isLoading}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
        >
          <div className="font-semibold text-lg mb-1">🔑 Password</div>
          <div className="text-sm text-gray-600">Secure with a custom password</div>
        </button>
      </div>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      {isLoading && <p className="mt-4 text-gray-600 text-sm">Configuring recovery method...</p>}
    </div>
  )
}

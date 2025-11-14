/* eslint-disable react-hooks/exhaustive-deps */
import { EmbeddedState, RecoveryMethod } from '@openfort/openfort-js'
import { useId, useState } from 'react'
import EventMonitor from './components/EventMonitor'
import TruncatedData from './components/TruncatedData'
import { useOpenfort } from './contexts/OpenfortContext'
import { Login } from './Login'
import SolanaExternalSignerComponent from './solana'

export const Content = () => {
  const {
    state: embeddedState,
    user,
    account,
    accounts,
    solanaAddress,
    isLoadingAccounts,
    refetchUser,
    createAccount,
    recoverAccount,
    signMessage: signMessageContext,
    exportPrivateKey: exportPrivateKeyContext,
    logout,
    getEncryptionSession,
  } = useOpenfort()

  const [showAccounts, setShowAccounts] = useState(false)
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isSigningMessage, setIsSigningMessage] = useState(false)
  const [isExportingKey, setIsExportingKey] = useState(false)
  const [recoveringAccountId, setRecoveringAccountId] = useState<string | null>(null)
  const messageId = useId()

  const handleListAccounts = () => {
    setShowAccounts(true)
  }

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true)
    try {
      console.log('Creating new Solana account...')
      const encryptionSession = await getEncryptionSession()
      const newAccount = await createAccount({
        recoveryMethod: RecoveryMethod.AUTOMATIC,
        encryptionSession,
      })
      console.log('New account created:', newAccount)
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleRecoverAccount = async (accountId: string) => {
    setRecoveringAccountId(accountId)
    try {
      console.log('Recovering account with ID:', accountId)
      const encryptionSession = await getEncryptionSession()
      const recoveredAccount = await recoverAccount(accountId, {
        recoveryMethod: RecoveryMethod.AUTOMATIC,
        encryptionSession,
      })
      console.log('Account recovered:', recoveredAccount)
    } catch (error) {
      console.error('Error recovering account:', error)
    } finally {
      setRecoveringAccountId(null)
    }
  }

  const handleSignMessage = async () => {
    if (!message.trim()) {
      console.error('Please enter a message to sign')
      return
    }

    setIsSigningMessage(true)
    try {
      console.log('Signing message:', message)
      const { data, error } = await signMessageContext(message)
      if (error) {
        console.error('Error signing message:', error)
        return
      }
      console.log('Message signed:', data)
      setSignature(data || '')
    } catch (error) {
      console.error('Error signing message:', error)
    } finally {
      setIsSigningMessage(false)
    }
  }

  const handleExportPrivateKey = async () => {
    setIsExportingKey(true)
    try {
      console.log('Exporting private key...')
      const { data, error } = await exportPrivateKeyContext()
      if (error) {
        console.error('Error exporting private key:', error)
        return
      }
      console.log('Private key exported:', data)
      setPrivateKey(data || '')
    } catch (error) {
      console.error('Error exporting private key:', error)
    } finally {
      setIsExportingKey(false)
    }
  }

  if (embeddedState === EmbeddedState.NONE || embeddedState === EmbeddedState.UNAUTHENTICATED) {
    return (
      <div className="text-white flex flex-col items-center gap-4">
        <Login />
      </div>
    )
  }

  return (
    <div className="text-white flex flex-col items-center gap-6 py-6">
      <div className="w-full max-w-4xl bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p
            className="text-sm md:text-lg cursor-pointer break-all"
            onClick={() => refetchUser()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                refetchUser()
              }
            }}
          >
            <span className="text-gray-400">Openfort user:</span>
            <span className="text-blue-200 ml-2">{user?.id}</span>
          </p>
          <button type="button" onClick={() => logout()} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
            Logout
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleListAccounts}
          className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoadingAccounts}
        >
          {isLoadingAccounts ? 'Loading...' : 'List Accounts'}
        </button>
        <button
          type="button"
          onClick={handleCreateAccount}
          className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isCreatingAccount}
        >
          {isCreatingAccount ? 'Creating...' : 'Create Account'}
        </button>
      </div>

      {showAccounts && (
        <div className="w-full max-w-4xl mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">All Accounts ({accounts.length})</h3>
            <button type="button" onClick={() => setShowAccounts(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No accounts found</p>
            ) : (
              accounts.map((acc) => {
                const isActiveAccount = account?.id === acc.id
                const isRecovering = recoveringAccountId === acc.id
                const displayAddress = isActiveAccount && solanaAddress ? solanaAddress : acc.address

                return (
                  <div
                    key={acc.id}
                    className={`bg-gray-800 rounded-lg p-4 border ${isActiveAccount ? 'border-green-500' : 'border-gray-600'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm flex-1">
                        <div>
                          <span className="text-gray-400">ID:</span> <span className="font-mono">{acc.id}</span>
                          {isActiveAccount && <span className="ml-2 text-green-400 text-xs">(Active)</span>}
                        </div>
                        <div>
                          <span className="text-gray-400">Address:</span>{' '}
                          <span className="font-mono">{displayAddress}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Chain Type:</span> <span>{acc.chainType}</span>
                        </div>
                      </div>
                      {!isActiveAccount && (
                        <button
                          type="button"
                          onClick={() => handleRecoverAccount(acc.id)}
                          disabled={isRecovering}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm ml-4 flex-shrink-0"
                        >
                          {isRecovering ? 'Recovering...' : 'Recover'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
      <div className="w-full max-w-4xl">
        {solanaAddress && <SolanaExternalSignerComponent publicKey={solanaAddress} />}
      </div>

      {account && (
        <div className="w-full max-w-4xl mt-6 p-4 md:p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">Sign Message</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor={messageId} className="block text-sm font-medium text-gray-300 mb-2">
                Message to sign:
              </label>
              <input
                id={messageId}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleSignMessage}
                disabled={!message.trim() || isSigningMessage}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-white font-medium transition-colors"
              >
                {isSigningMessage ? 'Signing...' : 'Sign Message'}
              </button>
              <button
                type="button"
                onClick={handleExportPrivateKey}
                disabled={isExportingKey}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-white font-medium transition-colors"
              >
                {isExportingKey ? 'Exporting...' : 'Export Private Key'}
              </button>
            </div>
            {signature && (
              <div className="mt-4 bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="block text-sm font-medium text-gray-300 mb-2">Signature:</div>
                <TruncatedData data={signature} maxLength={40} className="text-green-400" />
              </div>
            )}
            {privateKey && (
              <div className="mt-4 bg-gray-700 rounded-lg p-4 border border-red-600">
                <div className="block text-sm font-medium text-gray-300 mb-2">Private Key:</div>
                <TruncatedData data={privateKey} maxLength={40} className="text-red-400" />
              </div>
            )}
          </div>
        </div>
      )}

      <EventMonitor />
    </div>
  )
}

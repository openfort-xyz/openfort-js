import { EmbeddedState } from '@openfort/openfort-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi'
import AccountRecovery from '../components/AccountRecovery'
import { useOpenfort } from '../hooks/useOpenfort'
import { BetterAuthCard, useSession } from '../integrations/betterauth'
import { ActionsCard } from '../ui/openfort/blockchain/ActionsCard'
import { SignCard } from '../ui/openfort/blockchain/SignCard'

export default function HomePage() {
  const { data: session } = useSession()
  const user = session?.user
  const { embeddedState, initializeEvmProvider, isReady } = useOpenfort()
  const [isInitializing, setIsInitializing] = useState(false)
  const providerInitializedRef = useRef(false)
  const connectionAttemptedRef = useRef(false)

  const { connectors, connect } = useConnect()
  const { status, isConnected, address } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()

  // Initialize EVM provider
  const initializeProvider = useCallback(async () => {
    if (!isReady || providerInitializedRef.current || isInitializing) {
      return
    }

    try {
      setIsInitializing(true)
      console.log('[HomePage] Initializing EVM provider...')
      const provider = await initializeEvmProvider()

      if (provider) {
        providerInitializedRef.current = true
        console.log('[HomePage] EVM provider initialized successfully')
      }
    } catch (error) {
      console.error('[HomePage] Provider initialization failed:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [isReady, isInitializing, initializeEvmProvider])

  useEffect(() => {
    initializeProvider()
  }, [initializeProvider])

  // Auto-connect to Openfort
  const connectToOpenfort = useCallback(async () => {
    if (
      !isReady ||
      !providerInitializedRef.current ||
      isConnected ||
      status === 'connecting' ||
      connectionAttemptedRef.current ||
      isInitializing
    ) {
      return
    }

    const injectedConnector = connectors.find((c) => c.id === 'injected')
    if (!injectedConnector) {
      console.error('[HomePage] Injected connector not found')
      return
    }

    try {
      connectionAttemptedRef.current = true
      console.log('[HomePage] Attempting to connect to Openfort...')
      await connect({ connector: injectedConnector, chainId })
      console.log('[HomePage] Connected to Openfort successfully')
    } catch (error) {
      connectionAttemptedRef.current = false
      console.error('[HomePage] Connection failed:', error)
    }
  }, [isReady, isConnected, status, connectors, chainId, connect, isInitializing])

  useEffect(() => {
    connectToOpenfort()
  }, [connectToOpenfort])

  // Reset connection attempt flag when disconnected
  useEffect(() => {
    if (!isConnected && status === 'disconnected') {
      connectionAttemptedRef.current = false
    }
  }, [isConnected, status])

  // Not authenticated - show Better Auth login
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <BetterAuthCard />
        </div>
      </div>
    )
  }

  // Authenticated but need to set up recovery
  if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <p className="text-gray-400 mb-4">Welcome, {user.name || user.email}!</p>
          <AccountRecovery />
        </div>
      </div>
    )
  }

  // Loading state
  if (!isReady || isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-400">{isInitializing ? 'Initializing provider...' : 'Initializing wallet...'}</p>
        </div>
      </div>
    )
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-zinc-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-2">Account Details</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">User:</span> {user.name || user.email}
            </p>
            <p>
              <span className="font-medium">Wallet Address:</span> {address || 'Not available'}
            </p>
            <p>
              <span className="font-medium">Chain ID:</span> {chainId || 'Not available'}
            </p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={`font-medium ${status === 'connected' ? 'text-green-600' : 'text-gray-600'}`}>
                {status}
              </span>
            </p>
          </div>
          {isConnected && (
            <button
              type="button"
              onClick={() => disconnect()}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6">
            <SignCard />
          </div>
          <div className="bg-white rounded-lg p-6">
            <ActionsCard />
          </div>
        </div>
      </div>
    </div>
  )
}

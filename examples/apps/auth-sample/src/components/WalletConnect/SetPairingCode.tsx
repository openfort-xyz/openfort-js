import { EmbeddedState } from '@openfort/openfort-js'
import { WalletKit, type WalletKitTypes } from '@reown/walletkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Core } from '@walletconnect/core'
import type { SessionTypes } from '@walletconnect/types'
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils'
import { useCallback, useEffect, useState } from 'react'
import { fromHex, type Transport } from 'viem'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { base, mainnet, polygonAmoy, type Chain as WagmiChain } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { useOpenfort } from '../../hooks/useOpenfort'
import { Chain } from '../../utils/constants'
import Loading from '../Loading'
import { Button } from '../ui/button'

const SetPairingCode: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { state, getEOAAddress, signMessage } = useOpenfort()
  const [loading, setLoading] = useState<boolean>(false)
  const [walletKit, setWalletKit] = useState<any>()
  const [activeSessions, setActiveSessions] = useState<any>(false)

  // Init Reown WalletKit
  useEffect(() => {
    let isMounted = true

    ;(async () => {
      const wKit = await WalletKit.init({
        core: new Core({
          projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
        }),
        metadata: {
          name: 'openfort',
          description: 'AppKit Example',
          url: 'https://openfort.io', // origin must match your domain & subdomain
          icons: ['https://assets.reown.com/reown-profile-pic.png'],
        },
      })

      if (isMounted) {
        setWalletKit(wKit)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const updateSessions = useCallback(() => {
    if (!walletKit) return
    setActiveSessions(walletKit.getActiveSessions())
  }, [walletKit])

  useEffect(updateSessions, [])

  const handleSetPairingCode = async () => {
    if (!walletKit) console.error('WalletKit not initialized')

    setLoading(true)
    try {
      const uri = (document.querySelector(`input[name="walletConnectPairingCode"]`) as HTMLInputElement).value
      // Remove the value from the input
      ;(document.querySelector(`input[name="walletConnectPairingCode"]`) as HTMLInputElement).value = ''

      walletKit.on('session_proposal', onSessionProposal)
      walletKit.on('session_request', onSessionRequest)
      await walletKit.pair({ uri })
    } catch (err) {
      console.error('Failed to set pairing code:', err)
      setLoading(false)
    }
    setLoading(false)
  }
  const onSessionProposal = async (proposal: WalletKitTypes.SessionProposal) => {
    if (!walletKit) console.error('WalletKit not initialized')
    if (state !== EmbeddedState.READY) return

    handleSetMessage(JSON.stringify(proposal, null, 2))

    const accountAddress = await getEOAAddress()

    try {
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces: {
          eip155: {
            chains: ['eip155:1', 'eip155:8453', 'eip155:80002'],
            accounts: [`eip155:1:${accountAddress}`, `eip155:8453:${accountAddress}`, `eip155:80002:${accountAddress}`],
            methods: [
              'eth_accounts',
              'eth_requestAccounts',
              'eth_sendRawTransaction',
              'eth_sign',
              'eth_signTransaction',
              'eth_signTypedData',
              'eth_signTypedData_v3',
              'eth_signTypedData_v4',
              'eth_sendTransaction',
              'personal_sign',
              'wallet_switchEthereumChain',
              'wallet_addEthereumChain',
              'wallet_getPermissions',
              'wallet_requestPermissions',
              'wallet_registerOnboarding',
              'wallet_watchAsset',
              'wallet_scanQRCode',
              'wallet_sendCalls',
              'wallet_getCallsStatus',
              'wallet_showCallsStatus',
              'wallet_getCapabilities',
            ],
            events: ['chainChanged', 'accountsChanged', 'message', 'disconnect', 'connect'],
          },
        },
      })

      await walletKit.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      })
      setTimeout(updateSessions, 1000)
    } catch (err: any) {
      await walletKit.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED'),
      })

      console.error(err.message)
    }
  }

  const onSessionRequest = async (event: WalletKitTypes.SessionRequest) => {
    if (!walletKit) console.error('WalletKit not initialized')

    handleSetMessage(JSON.stringify(event, null, 2))

    const { topic, params, id } = event
    const { request } = params
    const requestParamsMessage = request.params[0]
    const message = fromHex(requestParamsMessage, 'string')

    try {
      const signedMessage = (await signMessage(message)).data
      const response = { id, result: signedMessage, jsonrpc: '2.0' }
      await walletKit.respondSessionRequest({ topic, response })
    } catch (err) {
      console.error('Failed to sign message:', err)
    }

    updateSessions()
  }

  const onDisconnect = async (session: SessionTypes.Struct) => {
    setLoading(true)
    try {
      await walletKit.disconnectSession(session)
    } catch (err) {
      console.error('Failed to disconnect session:', err)
    }
    updateSessions()
    setLoading(false)
  }

  return (
    <div>
      <input
        name={`walletConnectPairingCode`}
        placeholder="Pairing Code"
        className="w-full p-2 border border-gray-200 rounded-lg mb-2"
      />
      <Button className="w-full" onClick={handleSetPairingCode} disabled={loading} variant="outline">
        {loading ? <Loading /> : 'Pair with dApp'}
      </Button>

      {activeSessions && (
        <ul className="mt-5">
          {Object.keys(activeSessions).map((key) => {
            if (!activeSessions[key].acknowledged) return null

            return (
              <li key={key} className="border p-2 mt-2">
                <p>
                  {activeSessions[key].peer.metadata.name.length > 23
                    ? `${activeSessions[key].peer.metadata.name.slice(0, 23)}...`
                    : activeSessions[key].peer.metadata.name}
                </p>
                <button
                  type="button"
                  disabled={loading}
                  className={
                    'mt-2 w-56 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'
                  }
                  onClick={() => onDisconnect(activeSessions[key])}
                >
                  Disconnect
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!activeSessions ||
        (Object.keys(activeSessions).length === 0 && (
          <p className="text-red-400 mt-4 text-xs">No dApps are connected yet.</p>
        ))}
    </div>
  )
}

export default SetPairingCode

// Wagmi Wrapper
export const SetPairingCodeWithWagmi: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { getEvmProvider } = useOpenfort()
  useEffect(() => {
    getEvmProvider()
  }, [getEvmProvider])

  const chainToWagmiChain = {
    mainnet: mainnet,
    base: base,
    [Chain.AMOY]: polygonAmoy,
  }

  const chains = ['mainnet', 'base', Chain.AMOY].map(
    (chain) => chainToWagmiChain[chain as keyof typeof chainToWagmiChain]
  ) as WagmiChain[]
  const transports: Record<WagmiChain['id'], Transport> = {}
  chains.forEach((chain) => {
    transports[chain.id] = http()
  })

  const wagmiConfig = createConfig({
    chains: [mainnet, base, polygonAmoy],
    connectors: [injected()],
    transports,
    ssr: true,
  })
  const queryClient = new QueryClient()

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SetPairingCode handleSetMessage={handleSetMessage} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

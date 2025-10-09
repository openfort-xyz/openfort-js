'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { sepolia } from 'viem/chains'
import { type State, useChainId, WagmiProvider } from 'wagmi'
import { openfortInstance } from '../openfort'
import { getConfig } from '../wagmi'

interface ProvidersProps {
  children: ReactNode
  initialState?: State
}

// Inner component that uses Wagmi hooks
function OpenfortSetup({ children }: { children: ReactNode }) {
  const chainId = useChainId()

  useEffect(() => {
    const setupProvider = async () => {
      if (!openfortInstance) return
      console.log('Setting up Openfort provider for chainId:', chainId)
      await openfortInstance.embeddedWallet.getEthereumProvider({
        policy:
          chainId === sepolia.id ? process.env.NEXT_PUBLIC_POLICY_SEPOLIA : process.env.NEXT_PUBLIC_POLICY_BASE_SEPOLIA,
      })
    }

    setupProvider()
  }, [chainId])

  return children
}

// Main Providers component
export function Providers({ children, initialState }: ProvidersProps) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OpenfortSetup>{children}</OpenfortSetup>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

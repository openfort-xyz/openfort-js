'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type State, useAccount, useConnect, WagmiProvider } from 'wagmi'
import { useRouter } from 'next/navigation'
import { EmbeddedState } from '@openfort/openfort-js'

import { getConfig } from '../wagmi'
import { openfortInstance } from '../openfort'
import { sepolia } from 'viem/chains'
import { configureEmbeddedSigner } from '../lib/utils'

interface ProvidersProps {
  children: ReactNode
  initialState?: State
}

// Inner component that uses Wagmi hooks
function OpenfortSetup({ children }: { children: ReactNode }) {
  const poller = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const { chainId, connector, address } = useAccount()

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const currentState = await openfortInstance.getEmbeddedState()
        if (currentState === EmbeddedState.READY) {
          if (poller.current) clearInterval(poller.current);
          router.push('/')
        }
        if(connector?.name==="Openfort" && currentState !== EmbeddedState.READY) {
          router.push('/authentication')
        }
      } catch (err) {
        console.error('Error checking embedded state with Openfort:', err)
        if (poller.current) clearInterval(poller.current)
      }
    }

    if (!poller.current) {
      poller.current = setInterval(pollEmbeddedState, 300)
    }

    return () => {
      if (poller.current) clearInterval(poller.current)
      poller.current = null
    }
  }, [chainId, router, connector])

  useEffect(() => {
    const setupProvider = async () => {
      if (!openfortInstance) return;
      openfortInstance.getEthereumProvider(
        {
          policy: chainId === sepolia.id ? process.env.NEXT_PUBLIC_POLICY_SEPOLIA : process.env.NEXT_PUBLIC_POLICY_BASE_SEPOLIA
        }
      );
      const user = await openfortInstance.getUser().catch((err) => {
        return null
      })
      if (user) {
        await configureEmbeddedSigner(chainId ?? sepolia.id);
      }
    };

    setupProvider();
  }, [chainId]);

  return children
}

// Main Providers component
export function Providers({ children, initialState }: ProvidersProps) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OpenfortSetup>
          {children}
        </OpenfortSetup>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

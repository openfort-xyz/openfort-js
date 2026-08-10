import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'viem'
import { beamTestnet, polygonAmoy, sepolia } from 'viem/chains'
import { createConfig, WagmiProvider } from 'wagmi'
import { injected } from 'wagmi/connectors'

const wagmiConfig = createConfig({
  chains: [beamTestnet, polygonAmoy, sepolia],
  connectors: [injected()],
  transports: {
    [beamTestnet.id]: http(),
    [polygonAmoy.id]: http(),
    [sepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

export function OpenfortProviders({ children }: { children: any }) {
  const openfortPublishableKey = import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY
  const shieldPublishableKey = import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY

  if (!openfortPublishableKey) {
    throw new Error('VITE_OPENFORT_PUBLISHABLE_KEY is required')
  }
  if (!shieldPublishableKey) {
    throw new Error('VITE_SHIELD_PUBLISHABLE_KEY is required')
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

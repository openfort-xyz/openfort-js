import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type Config, WagmiProvider as CoreWagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

export const WagmiProvider = ({ wagmiConfig, children }: { wagmiConfig: Config; children: React.ReactNode }) => {
  return (
    <CoreWagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </CoreWagmiProvider>
  )
}

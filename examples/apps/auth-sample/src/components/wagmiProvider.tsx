import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import { type Config, WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

export const withWagmi = <P extends object>(
  WrappedComponent: ComponentType<P>,
  wagmiConfig: Config
): ComponentType<P> => {
  // eslint-disable-next-line react/display-name
  return (props: P) => {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WrappedComponent {...props} />
        </QueryClientProvider>
      </WagmiProvider>
    )
  }
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { Connect } from './components/Connect'
import openfortInstance from './utils/openfortConfig'
import { config } from './wagmi'

const queryClient = new QueryClient()

export default function App() {
  useEffect(() => {
    if (!openfortInstance) return
    openfortInstance.embeddedWallet.getEthereumProvider() // EIP-6963
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Connect />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

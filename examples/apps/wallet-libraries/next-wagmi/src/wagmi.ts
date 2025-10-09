import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { arbitrumSepolia, baseSepolia, polygonAmoy, sepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export function getConfig() {
  return createConfig({
    chains: [sepolia, baseSepolia, polygonAmoy, arbitrumSepolia],
    connectors: [injected(), coinbaseWallet()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(),
      [sepolia.id]: http(),
      [polygonAmoy.id]: http(),
      [arbitrumSepolia.id]: http(),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}

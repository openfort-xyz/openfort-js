import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { baseSepolia, sepolia } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export function getConfig() {
    return createConfig({
        chains: [sepolia, baseSepolia],
        connectors: [
            injected(),
            coinbaseWallet()
        ],
        storage: createStorage({
            storage: cookieStorage,
        }),
        ssr: true,
        transports: {
            [baseSepolia.id]: http(),
            [sepolia.id]: http(),
        },
    })
}

declare module 'wagmi' {
    interface Register {
        config: ReturnType<typeof getConfig>
    }
}
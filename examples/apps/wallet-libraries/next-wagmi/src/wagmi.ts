import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { baseSepolia, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export function getConfig() {
    return createConfig({
        chains: [sepolia, baseSepolia],
        connectors: [
            injected(),
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
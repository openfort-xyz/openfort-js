import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export function getConfig() {
    return createConfig({
        chains: [baseSepolia],
        connectors: [
            injected(),
        ],
        transports: {
            [baseSepolia.id]: http('https://base-sepolia.gateway.tenderly.co'),
        },
    })
}

declare module 'wagmi' {
    interface Register {
        config: ReturnType<typeof getConfig>
    }
}
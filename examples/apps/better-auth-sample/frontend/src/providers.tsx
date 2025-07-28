import React from 'react'
import { OpenfortKitProvider, getDefaultConfig, RecoveryMethod, AuthProvider, OpenfortWalletConfig } from '@openfort/openfort-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig } from 'wagmi'
import { baseSepolia } from 'viem/chains'

const config = createConfig(
  getDefaultConfig({
    appName: 'OpenfortKit demo',
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
    chains: [ baseSepolia ], // Add your chain here
  })
);

const queryClient = new QueryClient()

const walletConfig: OpenfortWalletConfig = {
  createEmbeddedSigner: true,
  embeddedSignerConfiguration: {
    shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY,
    recoveryMethod: RecoveryMethod.PASSWORD,
    shieldEncryptionKey: import.meta.env.VITE_SHIELD_ENCRYPTION_SHARE
  }
}

const authProviders: AuthProvider[] = [
  AuthProvider.EMAIL,
  AuthProvider.GUEST,
]

export function Providers({ children }: { children?: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OpenfortKitProvider
          // Set the publishable key of your OpenfortKit account. This field is required.
          publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}

          options={{
            authProviders,
          }}

          theme="auto"

          walletConfig={walletConfig}
        >
          {children}
        </OpenfortKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

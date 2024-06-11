import {ComponentType} from 'react';
import {WagmiProvider, Config} from 'wagmi';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {signMessage} from '@wagmi/core';

const queryClient = new QueryClient();

const createWagmiSignMessage = (config: Config) => (message: string) => {
  return signMessage(config, {
    message,
  });
};

export const withWagmi = <P extends object>(
  WrappedComponent: ComponentType<P>,
  wagmiConfig: Config
): ComponentType<P> => {
  // eslint-disable-next-line react/display-name
  return (props: P) => {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WrappedComponent
            {...props}
            signMessage={createWagmiSignMessage(wagmiConfig)}
          />
        </QueryClientProvider>
      </WagmiProvider>
    );
  };
};

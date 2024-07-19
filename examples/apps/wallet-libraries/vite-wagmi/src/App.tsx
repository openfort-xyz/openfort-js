import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {WagmiProvider} from 'wagmi';

import {Connect} from './components/Connect';
import {config} from './wagmi';
import {useEffect} from 'react';
import {openfortInstance} from './main';

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    if (!openfortInstance) return;
    openfortInstance.getEmbeddedState();
    openfortInstance.getEthereumProvider(); // EIP-6963
  }, [openfortInstance]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Connect />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

import { mainnet, polygonAmoy } from 'viem/chains';
import { Connector, useConnect, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { Address, parseEther } from 'viem';
import { useEffect, useState } from 'react';

export const AddFundsWithWagmi: React.FC<{
  callback: () => void;
  fundAddress: Address;
  fundAmount: string;
}> = ({callback, fundAddress, fundAmount}) => {
  const config = getDefaultConfig({
    appName: 'My RainbowKit App',
    projectId: 'YOUR_PROJECT_ID',
    chains: [polygonAmoy],
    ssr: true, // If your dApp uses server side rendering (SSR),
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AddFundsWW
            fundAddress={fundAddress}
            fundAmount={fundAmount}
            callback={callback}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const AddFundsWW: React.FC<{
  callback: () => void;
  fundAddress: Address;
  fundAmount: string;
}> = ({callback, fundAddress, fundAmount}) => {
    const {connectors, connect} = useConnect();
    const {data: hash, sendTransaction} = useSendTransaction();
    const [loading, setLoading] = useState<string>(null!);
    const {isLoading: isConfirming, isSuccess: isConfirmed} = useWaitForTransactionReceipt({ hash});
    const {switchChain} = useSwitchChain();

    useEffect(() => {
        if(isConfirmed) {
            callback();
        }
    }, [isConfirmed]);

    const handleSuccess = async () => {
        switchChain({chainId: polygonAmoy.id}, {
            onSuccess: () => {
                sendTransaction({to: fundAddress, value: parseEther(fundAmount)});
            }
        });
    };

    // Remove duplicated connectors
    let uniqueConnectors = connectors.filter(
        (connector, index, self) =>
            index === self.findIndex((t) => t.id === connector.id)
    ); 
    
    const initConnect = async (connector: Connector) => {
        setLoading(connector.id);
        connect(
            {connector},
            {
                onError: () => {
                    setLoading(null!);
                },
                onSettled: () => {
                    handleSuccess();
                    setLoading(null!);
                },
                onSuccess: async ({accounts}) => {
                    const address = accounts[0];
                    if (address) {
                        try {
                            handleSuccess();
                        } finally {
                            setLoading(null!);
                        }
                    }
                },
            }
        );
    };

    return (
      <>
        {uniqueConnectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => initConnect(connector)}
            type="button"
            className="text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2 mb-2"
          >
            <img
              src={
                loading == connector.id
                  ? 'spinner.svg'
                  : `${connector.type.toLowerCase()}.${
                      connector.type === 'injected' ? 'webp' : 'svg'
                    }`
              }
              width={24}
              height={24}
              className={
                loading == connector.id
                  ? 'inline me-3 text-gray-200 animate-spin'
                  : 'inline me-3 text-gray-200'
              }
              alt={
                loading == connector.id
                  ? 'Loading icon'
                  : `${connector.name} logo`
              }
            />
            {connector.name}
          </button>
        ))}
      </>
    );
};
import {baseSepolia, polygonAmoy} from 'wagmi/chains';
import React, {FunctionComponent, useState} from 'react';
import {withWagmi} from './wagmiProvider';
import {Connector, createConfig, http, useChainId, useConnect} from 'wagmi';
import {Chain, WalletConnector} from '../utils/constants';
import type {Chain as WagmiChain} from 'wagmi/chains';
import {coinbaseWallet, metaMask, walletConnect} from 'wagmi/connectors';
import {Transport} from '@wagmi/core';
import {OnSuccess, SignMessageFunction} from '../utils/types';
import {createSIWEMessage} from '../utils/create-siwe-message';
import openfort from '../utils/openfortConfig';

type GetWalletButtonsParams = {
  chains: (typeof Chain)[keyof typeof Chain][];
  connectors: (typeof WalletConnector)[keyof typeof WalletConnector][];
  walletConnectProjectId?: string;
};

type WalletConnectButtonsOwnProps = {
  onSuccess: OnSuccess;
  link: boolean;
};

type WalletConnectButtonsProps = WalletConnectButtonsOwnProps & {
  signMessage: SignMessageFunction;
};

type WalletConnectButtonProps = {
  title: string;
  isLoading: boolean;
  icon: string;
  initConnect: () => void;
};

const WalletConnectButton = ({
  title,
  isLoading,
  icon,
  initConnect,
}: WalletConnectButtonProps) => {
  return (
    <button
      onClick={initConnect}
      type="button"
      className="text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2 mb-2"
    >
      <img
        src={isLoading ? 'spinner.svg' : icon}
        width={24}
        height={24}
        className={
          isLoading
            ? 'inline me-3 text-gray-200 animate-spin'
            : 'inline me-3 text-gray-200'
        }
        alt={isLoading ? 'Loading icon' : `${title} logo`}
      />
      {title}
    </button>
  );
};

const WalletConnectButtons = ({
  onSuccess,
  link,
  signMessage,
}: WalletConnectButtonsProps) => {
  const {connectors, connect} = useConnect();
  const chainId = useChainId()
  const [loading, setLoading] = useState<string>(null!);

  const initConnect = async (connector: Connector) => {
    setLoading(connector.id);
    connect(
      {connector},
      {
        onError: () => {
          setLoading(null!);
        },
        onSettled: () => {
          setLoading(null!);
        },
        onSuccess: async ({accounts}) => {
          const address = accounts[0];
          if (connector.name === 'Openfort') onSuccess();
          if (address) {
            try {
              const {nonce} = await openfort.auth.initSIWE({address});
              const SIWEMessage = createSIWEMessage(address, nonce, chainId);
              const signature = await signMessage(SIWEMessage);
              link
                ? await openfort.auth.linkWallet({
                    authToken: (await openfort.getAccessToken()) as string,
                    signature,
                    message: SIWEMessage,
                    connectorType: connector?.type,
                    walletClientType: connector?.name,
                  })
                : await openfort.auth.authenticateWithSIWE({
                    signature,
                    message: SIWEMessage,
                    connectorType: connector?.type,
                    walletClientType: connector?.name,
                  });
              onSuccess();
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : typeof error === 'string'
                  ? error
                  : null;
              if (message) {
                console.error(`Openfort request failed: ${message}`);
              } else {
                console.error('Openfort request failed.', error);
              }
              throw error;
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
      {connectors.map((connector) => (
        <WalletConnectButton
          key={connector.uid}
          initConnect={() => initConnect(connector)}
          isLoading={loading === connector.id}
          icon={`${connector.type.toLowerCase()}.${
            connector.type === 'injected' ? 'webp' : 'svg'
          }`}
          title={connector.name}
        />
      ))}
    </>
  );
};

const chainToWagmiChain = {
  [Chain.AMOY]: polygonAmoy,
  [Chain.BASE_SEPOLIA]: baseSepolia,
};
const connectorToWagmiConnector = {
  [WalletConnector.METAMASK]: metaMask,
  [WalletConnector.WALLET_CONNECT]: walletConnect,
  [WalletConnector.COINBASE]: coinbaseWallet,
};

export const getWalletButtons = (params: GetWalletButtonsParams) => {
  const chains = params.chains.map(
    (chain) => chainToWagmiChain[chain]
  ) as WagmiChain[];
  const transports: Record<WagmiChain['id'], Transport> = {};
  chains.forEach((chain) => {
    transports[chain.id] = http();
  });

  const connectors = params.connectors.map((connector) =>
    connector === 'walletConnect'
      ? connectorToWagmiConnector[connector]({
          projectId: params.walletConnectProjectId as string,
        })
      : connectorToWagmiConnector[connector]({dappMetadata: {name: 'Openfort'}})
  );
  const config = createConfig({
    chains: chains as any,
    connectors,
    ssr: true,
    transports,
  });
  return withWagmi<WalletConnectButtonsOwnProps>(
    WalletConnectButtons as FunctionComponent<WalletConnectButtonsOwnProps>,
    config
  );
};

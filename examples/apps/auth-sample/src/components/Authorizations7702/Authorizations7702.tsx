import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';

import { Address, createPublicClient, createWalletClient, Hex, http, parseSignature } from "viem";
import { privateKeyToAccount, toAccount } from "viem/accounts";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { sepolia } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { zeroAddress } from "viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { hashAuthorization, hashTypedData } from "viem/utils";

const Authorizations7702: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {signMessage, state, account, exportPrivateKey} = useOpenfort();
  const [loading, setLoading] = useState(false);

  const handleSignAuthorization = async () => {
    try {
      setLoading(true);
      const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_ID!;

      const pimlicoClient = createPimlicoClient({
          chain: sepolia,
          transport: http(
              `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoAPIKey}`,
          ),
      });
      const eoa7702 = toAccount({
        address: (account?.ownerAddress ?? account?.address) as Address,
        async signMessage({ message }) {
          console.log("Signing message:", message);
          return '0x'
        },
        async signTransaction(transaction, { serializer } = {}) {
          console.log("Signing transaction:", transaction);
          return '0x'
        },
        async signTypedData(typedData) {
          console.log("Signing typed data:", typedData);
          return (await signMessage(
            hashTypedData(typedData),
            {
              arrayifyMessage: true,
              hashMessage: false,
            }
          )).data as `0x${string}`;
        },
      })
      const client = createPublicClient({
          chain: sepolia,
          transport: http(),
      });
      const walletClient = createWalletClient({
          chain: sepolia,
          transport: http(),
          account: eoa7702,
      });
      const simple7702Account = await to7702SimpleSmartAccount({
          client,
          owner: eoa7702,
      });
      const smartAccountClient = createSmartAccountClient({
          client,
          chain: sepolia,
          account: simple7702Account,
          paymaster: pimlicoClient,
          bundlerTransport: http(
              `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoAPIKey}`,
          ),
      });

      const preAuthorization = await walletClient.prepareAuthorization({
          contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
      });

      const message = hashAuthorization(preAuthorization);
      const signature = await signMessage(
        message,
        {
          arrayifyMessage: true,
          hashMessage: false,
        }
      )
      const parsedSignature = parseSignature(signature.data as `0x${string}`);
      const isSmartAccountDeployed = await smartAccountClient.account.isDeployed();
      let transactionHash: Hex;
      if (!isSmartAccountDeployed) {
          transactionHash = await smartAccountClient.sendTransaction({
              to: zeroAddress,
              value: BigInt(0),
              data: "0x",
              authorization: {
                  ...preAuthorization,
                  ...parsedSignature
              }
          });
          handleSetMessage(`Smart Account Deployment Tx Hash: ${transactionHash}`);
      } else {
        handleSetMessage("Smart Account already deployed");
      }

      setLoading(false);

    } catch (err) {
      console.error('Failed to send authorization:', err);
      alert('Failed to send authorization. Please try again.');
    }
  }

  return (
    <div>
      <Button
        className='w-full' 
        onClick={handleSignAuthorization}
        disabled={state !== EmbeddedState.READY}
        variant="outline"
      >
        {loading ? <Loading /> : 'Sign Authorization'}
      </Button>
    </div>
  );
};

export default Authorizations7702;

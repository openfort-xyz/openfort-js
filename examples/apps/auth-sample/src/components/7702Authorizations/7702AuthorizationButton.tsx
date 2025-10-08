import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';

import { Address, createPublicClient, createWalletClient, Hex, http, parseSignature } from "viem";
import { toAccount } from "viem/accounts";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { polygonAmoy, sepolia } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { zeroAddress } from "viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { hashAuthorization } from "viem/utils";

const SignMessageButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {signMessage, state, account} = useOpenfort();
  const [loading, setLoading] = useState(false);

  const handleSignAuthorization = async () => {
    try {
      setLoading(true);
      const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_ID!;

      const pimlicoClient = createPimlicoClient({
          chain: sepolia,
          transport: http(
              `https://api.pimlico.io/v2/80002/rpc?apikey=${pimlicoAPIKey}`,
          ),
      });
      const eoa7702 = toAccount({
        address: (account?.ownerAddress ?? account?.address) as Address,
        async signMessage({ message }) {
          return '0x'
        },
        async signTransaction(transaction, { serializer } = {}) {
          return '0x'
        },
        async signTypedData(typedData) {
          return '0x'
        },
      })
      
      const client = createPublicClient({
          chain: polygonAmoy,
          transport: http(),
      });
      const walletClient = createWalletClient({
          chain: polygonAmoy,
          transport: http(),
          account: eoa7702,
      });
      const simple7702Account = await to7702SimpleSmartAccount({
          client,
          owner: eoa7702,
      });
      const smartAccountClient = createSmartAccountClient({
          client,
          chain: polygonAmoy,
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
      console.error('Failed to sign message:', err);
      alert('Failed to sign message. Please try again.');
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
        {loading ? <Loading /> : 'Sign Message'}
      </Button>
    </div>
  );
};

export default SignMessageButton;

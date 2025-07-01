import React, {useCallback, useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import BackendMintButton from './BackendMintButton';
import { Button } from '../ui/button';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, custom } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { erc7715Actions } from 'viem/experimental'

const EIP1193CreateSessionButton: React.FC<{
  handleSetMessage: (message: string) => void;
  setSessionKey: (sessionKey: `0x${string}` | null) => void;
  sessionKey: `0x${string}` | null;
}> = ({handleSetMessage, setSessionKey, sessionKey}) => {
  const {state, getEvmProvider} = useOpenfort();
  const [loading, setLoading] = useState(false);

  const createSession = useCallback(async (): Promise<{
    address: `0x${string}`;
    privateKey: `0x${string}`;
  } | null> => {
    const provider = await getEvmProvider();
    if (!provider) {
      throw new Error('Failed to get EVM provider');
    }
    const sessionKey = generatePrivateKey();
    const accountSession = privateKeyToAccount(sessionKey).address;

    const walletClient = createWalletClient({
      chain: polygonAmoy, 
      transport: custom(provider),
    }).extend(erc7715Actions()) 
    const [account] = await walletClient.getAddresses()
    try {
      await walletClient.grantPermissions({
        signer:{
          type: "account",
          data:{
            id: accountSession
          }
        },
        expiry: 60 * 60 * 24,
        permissions: [
          {
            type: 'contract-call',
            data: {
              address: '0x2522f4fc9af2e1954a3d13f7a5b2683a00a4543a',
              calls: []
            },
            policies: []
          }
        ],
      });
      setSessionKey(sessionKey);
      return {
        address: account,
        privateKey: sessionKey,
      };
    } catch (error) {
      console.error('Failed to register session:', error);
      handleSetMessage('Failed to register session: ' + (error as Error).message);
      return null
    }
  }, []);

  const handleCreateSession = async () => {
    setLoading(true);
    const session = await createSession();
    setLoading(false);
    if (session) {
      handleSetMessage(
        `Session key registered successfully:\n   Address: ${session.address}\n   Private Key: ${session.privateKey}`
      );
    }
  };

  return (
    <div>
      <Button
        className='w-full' 
        disabled={state !== EmbeddedState.READY || sessionKey !== null} 
        onClick={handleCreateSession}
        variant="outline"
      >
        {loading ? (
          <Loading />
        ) :'Create session'
        }
      </Button>
      <BackendMintButton
        handleSetMessage={handleSetMessage}
        sessionKey={sessionKey as `0x${string}`}
      />
    </div>
  );
};

export default EIP1193CreateSessionButton;

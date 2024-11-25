import React, {useCallback, useState} from 'react';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';
import { Button } from '../ui/button';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';

const BackendMintButton: React.FC<{
  handleSetMessage: (message: string) => void;
  sessionKey: `0x${string}` | null;
}> = ({handleSetMessage, sessionKey}) => {
  const [loading, setLoading] = useState(false);

  const mintNFT = useCallback(async (): Promise<string | null> => {
    if (!sessionKey) {
      return null;
    }
    const collectResponse = await fetch(`/api/protected-collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openfort.getAccessToken()}`,
      },
    });

    if (!collectResponse.ok) {
      alert(`Failed to mint NFT status: ${collectResponse.status}`);
      return null;
    }
    const collectResponseJSON = await collectResponse.json();
    const walletClient = createWalletClient({
      account: privateKeyToAccount(sessionKey),
      transport: http()
    })
    const signature = await walletClient.signMessage({message: {raw: collectResponseJSON.userOperationHash}});
    if (!signature) {
      throw new Error('Failed to sign message with session key');
    }

    const response = await openfort.sendSignatureTransactionIntentRequest(
      collectResponseJSON.transactionIntentId,
      null,
      signature
    );
    return response?.response?.transactionHash ?? null;
  }, [sessionKey]);

  const handleMintNFT = async () => {
    setLoading(true);
    const transactionHash = await mintNFT();
    setLoading(false);
    if (transactionHash) {
      handleSetMessage(`https://amoy.polygonscan.com/tx/${transactionHash}`);
    }
  };

  return (
    <div className='mt-4'>
      <Button
        className='w-full' 
        onClick={handleMintNFT}
        disabled={!sessionKey}
        variant="outline"
      >
        {loading ? <Loading /> : 'Mint NFT with session key'}
      </Button>
      {!sessionKey && (
        <p className="text-red-400 text-xs mt-2">
          Create a session before minting an NFT signed with a session key.
        </p>
      )}
    </div>
  );
};

export default BackendMintButton;

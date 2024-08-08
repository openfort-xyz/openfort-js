import React, {useCallback, useState} from 'react';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';
import {ethers} from 'ethers';
import {arrayify} from 'ethers/lib/utils';

const MintNFTSessionButton: React.FC<{
  handleSetMessage: (message: string) => void;
  sessionKey: string | null;
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
      alert('Failed to mint NFT status: ' + collectResponse.status);
      return null;
    }
    const collectResponseJSON = await collectResponse.json();

    if (collectResponseJSON.data?.nextAction) {
      const message = arrayify(
        collectResponseJSON.data.nextAction.payload.userOperationHash
      );
      const sessionSigner = new ethers.Wallet(sessionKey);
      const signature = await sessionSigner?.signMessage(message);
      if (!signature) {
        throw new Error('Failed to sign message with session key');
      }

      const response = await openfort.sendSignatureTransactionIntentRequest(
        collectResponseJSON.transactionIntentId,
        null,
        signature
      );
      return response?.response?.transactionHash ?? null;
    } else {
      return collectResponseJSON.userOperationHash;
    }
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
    <div>
      <button
        onClick={handleMintNFT}
        disabled={!sessionKey}
        className={`mt-4 w-32 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Loading /> : 'Mint NFT'}
      </button>
      {!sessionKey && (
        <p className="text-red-400 text-xs mt-2">
          Create a session before minting an NFT signed with a session key.
        </p>
      )}
    </div>
  );
};

export default MintNFTSessionButton;

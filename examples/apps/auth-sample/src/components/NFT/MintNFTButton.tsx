import React, {useCallback, useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';

const MintNFTButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {state} = useOpenfort();
  const [loading, setLoading] = useState(false);

  const mintNFT = useCallback(async (): Promise<string | null> => {
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

    const response = await openfort.sendSignatureTransactionIntentRequest(
      collectResponseJSON.transactionIntentId,
      collectResponseJSON.userOperationHash
    );
    return response?.response?.transactionHash ?? null;
  }, []);

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
        disabled={state !== EmbeddedState.READY}
        className={`mt-4 w-32 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Loading /> : 'Mint NFT'}
      </button>
    </div>
  );
};

export default MintNFTButton;

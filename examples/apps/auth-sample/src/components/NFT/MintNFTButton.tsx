import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';

const MintNFTButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {mintNFT, state} = useOpenfort();
  const [loading, setLoading] = useState(false);

  const handleMintNFT = async () => {
    try {
      setLoading(true);
      const transactionHash = await mintNFT();
      setLoading(false);
      if (!transactionHash) {
        throw new Error('Failed to mint NFT');
      }
      handleSetMessage(`https://www.oklink.com/amoy/tx/${transactionHash}`);
    } catch (err) {
      // Handle errors from minting process
      console.error('Failed to mint NFT:', err);
      alert('Failed to mint NFT. Please try again.');
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

import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import {ethers} from 'ethers';
import Loading from '../Loading';

const Provider1193ActionButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {getEvmProvider, state} = useOpenfort();
  const [loading, setLoading] = useState(false);

  const handleSendTransaction = async () => {
    const provider = getEvmProvider();
    if (!provider) {
      throw new Error('Failed to get EVM provider');
    }
    setLoading(true);
    const web3Provider = new ethers.providers.Web3Provider(provider);

    const signer = web3Provider.getSigner();

    const erc721Address = '0x2522f4fc9af2e1954a3d13f7a5b2683a00a4543a';

    // The Application Binary Interface (ABI) of a contract provides instructions for
    // encoding and decoding typed transaction data.
    // Read more about [ABI Formats](https://docs.ethers.org/v5/api/utils/abi/formats/).
    const abi = ['function mint(address _to)'];

    // Ethers provides an helper class called `Contract` that allows us to interact with smart contracts
    // by abstracting away data-encoding using the contract ABI (definition of the contract's interface).
    const contract = new ethers.Contract(erc721Address, abi, signer);

    let tx;
    // Send the transaction
    try {
      tx = await contract.mint('0x64452Dff1180b21dc50033e1680bB64CDd492582');
      console.log('Transaction hash:', tx);
      handleSetMessage(`https://amoy.polygonscan.com/tx/${tx.hash}`);
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
    } catch (error: any) {
      console.error('Failed to send transaction:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={handleSendTransaction}
        disabled={state !== EmbeddedState.READY}
        className={`mt-2 w-60 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Loading /> : 'EIP-1193 Provider Action'}
      </button>
    </div>
  );
};

export default Provider1193ActionButton;

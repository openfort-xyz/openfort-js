import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';

const ExportPrivateKey: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {exportPrivateKey, state} = useOpenfort();
  const [loading, setLoading] = useState(false);
  const handleExportPrivateKey = async () => {
    try {
      setLoading(true);
      const privateKey = await exportPrivateKey();
      setLoading(false);
      if (privateKey.error) {
        throw new Error('Failed to export private key');
      }
      handleSetMessage(privateKey.data!);
    } catch (err) {
      // Handle errors from minting process
      console.error('Failed to export private key:', err);
      alert('Failed to export private key. Please try again.');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleExportPrivateKey}
        disabled={state !== EmbeddedState.READY}
        className={
          'mt-4 w-32 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'
        }
      >
        {loading ? <Loading /> : 'Export key'}
      </button>
    </div>
  );
};

export default ExportPrivateKey;

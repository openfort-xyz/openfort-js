import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';

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
      <Button
        className='w-full' 
        onClick={handleExportPrivateKey}
        disabled={state !== EmbeddedState.READY}
        variant="outline"
      >
        {loading ? <Loading /> : 'Export key'}
      </Button>
    </div>
  );
};

export default ExportPrivateKey;

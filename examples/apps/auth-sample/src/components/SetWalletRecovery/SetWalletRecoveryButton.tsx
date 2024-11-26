import type React from 'react';
import {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState, RecoveryMethod} from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';

const SetWalletRecovery: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {setWalletRecovery, state} = useOpenfort();
  const [loading, setLoading] = useState<RecoveryMethod | null>(null);

  const handleSetWalletRecovery = async (recoveryMethod: RecoveryMethod) => {
    try {
      setLoading(recoveryMethod);
      const password = (
        document.querySelector(
          `input[name="${recoveryMethod}-passwordRecovery"]`
        ) as HTMLInputElement
      ).value;
      const privateKey = await setWalletRecovery(recoveryMethod, password);
      setLoading(null);
      if (privateKey.error) {
        throw new Error('Failed to update recovery method');
      }
      handleSetMessage(`Set ${recoveryMethod} wallet recovery successful`);
      alert(`${recoveryMethod} Recovery method set successfully`);
    } catch (err) {
      // Handle errors from minting process
      console.error('Failed to updated recovery method:', err);
      alert('Failed to update recovery method. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div>
      <input
        name={`${RecoveryMethod.AUTOMATIC}-passwordRecovery`}
        placeholder="Old password recovery"
        className="w-full p-2 border border-gray-200 rounded-lg mb-2"
      />
      <Button
        className='w-full' 
        disabled={state !== EmbeddedState.READY} 
        onClick={async () =>
          await handleSetWalletRecovery(RecoveryMethod.AUTOMATIC)
        }
        variant="outline"
      >
        {loading === RecoveryMethod.AUTOMATIC ? (
          <Loading />
        ) : (
          'Set Automatic Recovery'
        )}
      </Button>
      <div className="my-4 flex w-full justify-center">
        <span className="text-gray-400">- or -</span>
      </div>

      <input
        name={`${RecoveryMethod.PASSWORD}-passwordRecovery`}
        placeholder="New password recovery"
        className="w-full p-2 border border-gray-200 rounded-lg mb-2"
      />
      <Button 
        className='w-full' 
        onClick={async () =>
          await handleSetWalletRecovery(RecoveryMethod.PASSWORD)
        }
        disabled={state !== EmbeddedState.READY}
        variant="outline"
      >
        {loading === RecoveryMethod.PASSWORD ? (
          <Loading />
        ) : (
          'Set Password Recovery'
        )}
      </Button>
    </div>
  );
};

export default SetWalletRecovery;

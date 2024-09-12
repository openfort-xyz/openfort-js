import type React from 'react';
import {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState, RecoveryMethod} from '@openfort/openfort-js';
import Loading from '../Loading';

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
          'input[name="passwordRecovery"]'
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
      <button
        type="button"
        onClick={async () =>
          await handleSetWalletRecovery(RecoveryMethod.AUTOMATIC)
        }
        disabled={state !== EmbeddedState.READY}
        className={
          'mt-4 w-56 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'
        }
      >
        {loading === RecoveryMethod.AUTOMATIC ? (
          <Loading />
        ) : (
          'Set Automatic Recovery'
        )}
      </button>
      <div className="my-4 flex w-full justify-center">
        <span className="text-gray-400">- or -</span>
      </div>

      <input
        name="passwordRecovery"
        placeholder="New password recovery"
        className="w-full p-2 border border-gray-200 rounded-lg"
      />

      <button
        type="button"
        onClick={async () =>
          await handleSetWalletRecovery(RecoveryMethod.PASSWORD)
        }
        disabled={state !== EmbeddedState.READY}
        className={
          'mt-4 w-56 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'
        }
      >
        {loading === RecoveryMethod.PASSWORD ? (
          <Loading />
        ) : (
          'Set Password Recovery'
        )}
      </button>
    </div>
  );
};

export default SetWalletRecovery;

import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';

const SignMessageButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {signMessage, state} = useOpenfort();
  const [loading, setLoading] = useState(false);
  const handleSignMessage = async () => {
    try {
      setLoading(true);
      const signature = await signMessage('Hello World!');
      setLoading(false);
      if (signature.error) {
        throw new Error('Failed to sign message');
      }
      handleSetMessage(signature.data!);
    } catch (err) {
      console.error('Failed to sign message:', err);
      alert('Failed to sign message. Please try again.');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSignMessage}
        disabled={state !== EmbeddedState.READY}
        className={
          'mt-2 w-44 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'
        }
      >
        {loading ? <Loading /> : 'Sign Message'}
      </button>
    </div>
  );
};

export default SignMessageButton;

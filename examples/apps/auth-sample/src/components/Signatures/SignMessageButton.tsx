import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';

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
      <Button
        className='w-full' 
        onClick={handleSignMessage}
        disabled={state !== EmbeddedState.READY}
        variant="outline"
      >
        {loading ? <Loading /> : 'Sign Message'}
      </Button>
    </div>
  );
};

export default SignMessageButton;

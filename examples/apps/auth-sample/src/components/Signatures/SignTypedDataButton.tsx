import React, {useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {EmbeddedState} from '@openfort/openfort-js';
import Loading from '../Loading';
import { Button } from '../ui/button';

const SignTypedDataButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const {signTypedData, state} = useOpenfort();
  const [loading, setLoading] = useState(false);
  const handleSignTypedData = async () => {
    try {
      setLoading(true);
      const domain = {
        name: 'Openfort',
        version: '0.5',
        chainId: 80002,
        verifyingContract: '0x9b5AB198e042fCF795E4a0Fa4269764A4E8037D2',
      };
      const types = {
        Mail: [
          {name: 'from', type: 'Person'},
          {name: 'to', type: 'Person'},
          {name: 'content', type: 'string'},
        ],
        Person: [
          {name: 'name', type: 'string'},
          {name: 'wallet', type: 'address'},
        ],
      };
      const data = {
        from: {
          name: 'Alice',
          wallet: '0x2111111111111111111111111111111111111111',
        },
        to: {
          name: 'Bob',
          wallet: '0x3111111111111111111111111111111111111111',
        },
        content: 'Hello!',
      };
      const signature = await signTypedData(domain, types, data);
      setLoading(false);
      if (signature.error) {
        throw new Error('Failed to sign message');
      }
      handleSetMessage(signature.data!);
    } catch (err) {
      // Handle errors from minting process
      console.error('Failed to sign message:', err);
      alert('Failed to sign message. Please try again.');
    }
  };

  return (
    <div>
      <Button
        className='w-full' 
        onClick={handleSignTypedData}
        disabled={state !== EmbeddedState.READY}
        variant="outline"
      >
        {loading ? <Loading /> : 'Sign Typed Message'}
      </Button>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://github.com/openfort-xyz/openfort-js/blob/main/examples/apps/auth-sample/src/components/Signatures/SignTypedDataButton.tsx#L32"
        className="text-blue-600 hover:underline text-xs"
      >
        {'View typed message'}
      </a>
    </div>
  );
};

export default SignTypedDataButton;

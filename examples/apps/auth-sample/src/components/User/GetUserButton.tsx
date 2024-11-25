import React, {useState} from 'react';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';
import { Button } from '../ui/button';

const GetUserButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({handleSetMessage}) => {
  const [loading, setLoading] = useState(false);

  const handleUserMessage = async () => {
    try {
      setLoading(true);
      const user = await openfort.getUser().catch((error: Error) => {
        console.log('error', error);
      });
      setLoading(false);
      if (!user) {
        throw new Error('Failed to get user');
      }
      handleSetMessage(JSON.stringify(user, null, 2));
    } catch (err) {
      // Handle errors from minting process
      console.error('Failed to get user:', err);
      alert('Failed to get user. Please try again.');
    }
  };

  return (
    <div>
      <Button
        className='w-full' 
        disabled={loading} 
        onClick={handleUserMessage}
        variant="outline"
      >
        {loading ? <Loading /> : 'Get user'}
        </Button>
    </div>
  );
};

export default GetUserButton;

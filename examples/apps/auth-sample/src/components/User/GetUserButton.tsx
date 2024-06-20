import React, {useState} from 'react';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';

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
      <button
        onClick={handleUserMessage}
        className={`mt-2 w-44 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Loading /> : 'Get user'}
      </button>
    </div>
  );
};

export default GetUserButton;

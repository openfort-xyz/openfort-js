import React, {useMemo, useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {AuthPlayerResponse, OAuthProvider} from '@openfort/openfort-js';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';
import {getURL} from '../../utils/getUrl';

const LinkOAuthButton: React.FC<{
  provider: OAuthProvider;
  user: AuthPlayerResponse | null;
}> = ({provider, user}) => {
  const {state} = useOpenfort();
  const [loading, setLoading] = useState(false);
  const handleLinkOAuth = async () => {
    try {
      setLoading(true);
      const accessToken = openfort.getAccessToken() as string;
      const {url} = await openfort.initLinkOAuth({
        authToken: accessToken,
        provider: provider,
        options: {
          redirectTo: getURL() + '/login',
        },
      });
      setLoading(false);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to sign message:', err);
      alert('Failed to sign message. Please try again.');
    }
  };

  const isLinked = useMemo(() => {
    if (!user) return false;
    return user.linkedAccounts.some((account) => account.provider === provider);
  }, [user]);

  return (
    <div>
      <button
        onClick={handleLinkOAuth}
        disabled={isLinked}
        className={`mt-2 w-44 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Loading /> : `${isLinked ? 'Linked' : 'Link'} ${provider}`}
      </button>
    </div>
  );
};

export default LinkOAuthButton;

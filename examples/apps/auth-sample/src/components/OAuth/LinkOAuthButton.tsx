import React, {useMemo, useState} from 'react';
import {useOpenfort} from '../../hooks/useOpenfort';
import {AuthPlayerResponse, OAuthProvider} from '@openfort/openfort-js';
import Loading from '../Loading';
import openfort from '../../utils/openfortConfig';
import {getURL} from '../../utils/getUrl';
import { Button } from '../ui/button';

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
    <div className='my-2'>
      <Button
        className='w-full' 
        onClick={handleLinkOAuth}
        disabled={isLinked}
        variant="outline"
      >
        {loading ? <Loading /> : `${isLinked ? 'Linked' : 'Link'} ${provider}`}
      </Button>
    </div>
  );
};

export default LinkOAuthButton;

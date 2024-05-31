import openfortService from '../services/openfortService';
import {useEffect} from 'react';
import {useRouter} from 'next/router';

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // check if accessToken and refreshToken are present in the URL
        const {accessToken, refreshToken, state} = router.query;
        if (accessToken && refreshToken) {
          openfortService.storeCredentials(
            accessToken as string,
            refreshToken as string
          );
          router.push('/');
        }
      } catch (error) {
        console.error('Error handling callback:', error);
        router.push('/');
      }
    };

    handleCallback();
  }, []);

  return null;
}

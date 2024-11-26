import Head from 'next/head';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {AuthLayout} from '../components/Layouts/AuthLayout';
import openfort from '../utils/openfortConfig';
import {StatusType, Toast} from '../components/Toasts';
import {AuthPlayerResponse} from '@openfort/openfort-js';
import {useRouter} from 'next/router';
import {getWalletButtons} from '../components/WalletConnectButton';
import {Chain, WalletConnector} from '../utils/constants';

function ConnectWalletPage() {
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log('error', error);
      });
      if (sessionData) setUser(sessionData);
    };
    fetchUser();
  }, [openfort]);

  const [status, setStatus] = useState<StatusType>(null);
  const WalletButtons = getWalletButtons({
    chains: [Chain.AMOY],
    connectors: [WalletConnector.METAMASK],
  });

  const redirect = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>Openfort Register | Sign up to the Openfort Dashboard</title>
        <meta
          name="description"
          content="Sign up to the Openfort Dashboard to manage your game accounts and more."
        />{' '}
      </Head>
      <AuthLayout
        title="Continue with your wallet"
        subtitle={
          <>
            {'Have an account? '}
            <Link href="/login" className="text-blue-600">
              Sign in
            </Link>
          </>
        }
      >
        <div>
          <WalletButtons onSuccess={redirect} link={false} />
        </div>
        <Toast status={status} setStatus={setStatus} />
      </AuthLayout>
    </>
  );
}

export default ConnectWalletPage;

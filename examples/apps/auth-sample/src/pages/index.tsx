import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {NextPage} from 'next';
import {useOpenfort} from '../hooks/useOpenfort';
import {EmbeddedState, OAuthProvider} from '@openfort/openfort-js';
import AccountRecovery from '../components/EmbeddedSignerRecovery/AccountRecovery';
import SignMessageButton from '../components/Signatures/SignMessageButton';
import SignTypedDataButton from '../components/Signatures/SignTypedDataButton';
import openfort from '../utils/openfortConfig';
import Loading from '../components/Loading';
import type {AuthPlayerResponse} from '@openfort/openfort-js';
import {useRouter} from 'next/router';
import {AuthLayout} from '../components/Layouts/AuthLayout';
import LogoutButton from '../components/Logout';
import Link from 'next/link';
import {Logo} from '../components/Logo';
import GetUserButton from '../components/User/GetUserButton';
import LinkOAuthButton from '../components/OAuth/LinkOAuthButton';
import ExportPrivateKey from '../components/Export/ExportPrivateKeyButton';
import SetWalletRecovery from '../components/SetWalletRecovery/SetWalletRecoveryButton';
import { SetPairingCodeWithWagmi } from '../components/WalletConnect/SetPairingCode';
import AddFunds from '../components/Funding/AddFunds';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import AccountActions from '@/components/AccountActions/AccountActions';
import { GitHubLogoIcon } from '@radix-ui/react-icons';

const HomePage: NextPage = () => {
  const {state} = useOpenfort();
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSetMessage = (message: string) => {
    const newMessage = `> ${message} \n\n`;
    setMessage((prev) =>  newMessage + prev);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log('error', error);
      });
      if (sessionData) {
        setUser(sessionData);
        handleSetMessage(JSON.stringify(sessionData, null, 2));
      } else router.push('/login');
    };
    if (!user) fetchUser();
  }, [openfort]);

  const linkedAccount = useMemo(() => {
    const linkedAccount = user?.linkedAccounts?.find(
      (account: any) => account.provider === 'email'
    );
    return linkedAccount;
  }, [user]);

  useEffect(() => {
    if (linkedAccount?.verified === false) {
      router.push('/register');
    }
  }, [linkedAccount, router]);

  if (state === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <AuthLayout title="Set up your embedded signer" subtitle={<div></div>}>
        <div>
          <p className="text-gray-400 mb-4">
            Welcome, {user?.player?.name ?? user?.id}!
          </p>
          <div className="absolute top-2 right-2">
            <LogoutButton />
          </div>
          <div className="mt-8">
            <AccountRecovery />
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (state !== EmbeddedState.READY) {
    return (
      <div className="absolute top-1/2 left-1/2 flex items-center">
        <Loading />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="flex justify-between items-center p-4">
          <div className='flex items-center space-x-4'>
            <Link href="/" aria-label="Home">
              <Logo className="h-8 w-auto md:flex hidden" />
            </Link>
            <span className='text-gray-300 md:flex hidden'>-</span>
            <p className='font-mono text-orange-600 font-medium pt-2'>
              Embedded Smart Wallet
            </p>
          </div>
          <div className='space-x-2 flex'>
          <a 
              className='hidden md:inline-flex border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
              target="_blank"
              href='https://github.com/openfort-xyz/openfort-js/tree/main/examples/apps/auth-sample'
              >
                <GitHubLogoIcon className='h-5 w-5 mr-2'/>
                {'View on Github'}
            </a>
            <a 
              className='h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
              target="_blank"
              href='https://dashboard.openfort.xyz/auth/register'
              >
                {'Get started with Openfort ->'}
            </a>
          </div>
        </div>
      </header>
      <main className="h-screen flex">
        <div className="w-full md:w-1/4 hidden md:flex max-w-sm bg-white border-r flex-col h-screen fixed">
          <div className="flex items-center space-x-2 p-4">
            <Wallet className="h-5 w-5" />
            <h2 className="font-semibold">Console</h2>
          </div>
          <div className="flex-1 w-full">
            <textarea
              ref={textareaRef}
              className="no-scrollbar h-full w-full border-0 bg-gray-100 p-4 font-mono text-xs text-black"
              value={message}
              readOnly
            />
          </div>
          <div className="p-6 mb-14 border-t bg-white">
            <p className="text-sm text-gray-600 mb-4">
              Openfort gives you modular components so you can customize your product for your users.
              <a href="https://www.openfort.xyz/docs/guides/getting-started/integration" className="text-blue-600 hover:underline">Learn more</a>.
            </p>
            <div className="flex gap-3">
              <LogoutButton/>
            </div>
          </div>
        </div>
        <div className="w-full my-4">
          <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
            <p className="text-gray-400 mb-2">Welcome, {user?.id}!</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <AccountActions handleSetMessage={handleSetMessage} />
              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Signatures
                </h2>
                <div>
                  <span className="font-medium text-black">Message: </span>Hello
                  World!
                  <SignMessageButton handleSetMessage={handleSetMessage} />
                </div>
                <div>
                  <span className="font-medium text-black">
                    Typed message:{' '}
                  </span>
                  <SignTypedDataButton handleSetMessage={handleSetMessage} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Linked socials
                </h2>

                <div>
                  <span className="font-medium text-black">Get user: </span>
                  <GetUserButton handleSetMessage={handleSetMessage} />
                </div>
                <div>
                  <span className="font-medium text-black">
                    {'OAuth methods'}
                  </span>
                  {[
                    OAuthProvider.GOOGLE,
                    OAuthProvider.TWITTER,
                    OAuthProvider.FACEBOOK,
                  ].map((provider) => (
                    <div key={provider}>
                      <LinkOAuthButton provider={provider} user={user} />
                    </div>
                  ))}
                </div>
                <div>
                <Button
                  className='w-full' 
                  onClick={() => {
                    router.push('/link-wallet');
                  }}
                  variant="outline"
                >
                  {'Link a Wallet'}
                  </Button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Embedded wallet
                </h2>
                <div>
                  <span className="font-medium text-black">
                    Export wallet private key:
                  </span>
                  <ExportPrivateKey handleSetMessage={handleSetMessage} />
                </div>
                <div>
                  <p className="font-medium text-black mb-4">
                    Change wallet recovery:
                  </p>
                  <SetWalletRecovery handleSetMessage={handleSetMessage} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Wallet Connect
                </h2>
                <div>
                  <p className="font-medium text-black mb-4">
                    Connect via WalletConnect:
                  </p>
                  <SetPairingCodeWithWagmi
                    handleSetMessage={handleSetMessage}
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Funding
                </h2>
                <div>
                  <p className="font-medium text-black mb-4">
                    Add funds is on-ramp or transfer funds from another wallet.
                  </p>
                  <AddFunds handleSetMessage={handleSetMessage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomePage;

import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {NextPage} from 'next';
import MintNFTButton from '../components/NFT/MintNFTButton';
import {useOpenfort} from '../hooks/useOpenfort';
import {EmbeddedState, OAuthProvider} from '@openfort/openfort-js';
import AccountRecovery from '../components/EmbeddedSignerRecovery/AccountRecovery';
import SignMessageButton from '../components/Signatures/SignMessageButton';
import SignTypedDataButton from '../components/Signatures/SignTypedDataButton';
import EvmProviderButton from '../components/EvmProvider/EvmProviderButton';
import openfort from '../utils/openfortConfig';
import Loading from '../components/Loading';
import type {AuthPlayerResponse} from '@openfort/openfort-js';
import {useRouter} from 'next/router';
import {AuthLayout} from '../components/Layouts/AuthLayout';
import LogoutButton from '../components/Logout';
import Link from 'next/link';
import {Logo} from '../components/Logo';
import GetUserButton from '../components/User/GetUserButton';
import CreateSessionButton from '../components/Sessions/CreateSessionButton';
import LinkOAuthButton from '../components/OAuth/LinkOAuthButton';
import ExportPrivateKey from '../components/Export/ExportPrivateKeyButton';
import SetWalletRecovery from '../components/SetWalletRecovery/SetWalletRecoveryButton';
import { SetPairingCodeWithWagmi } from '../components/WalletConnect/SetPairingCode';
import AddFunds from '../components/Funding/AddFunds';

const HomePage: NextPage = () => {
  const {state} = useOpenfort();
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSetMessage = (message: string) => {
    const newMessage = `> ${message} \n\n`;
    setMessage((prev) => prev + newMessage);
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [message]);

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
          <p className="text-gray-400 mb-2">
            Welcome, {user?.player?.name ?? user?.id}!
          </p>
          <div className="absolute top-2 right-2">
            {' '}
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
      <header>
        <div className="flex mb-4 justify-between p-2">
          <Link href="/" aria-label="Home">
            <Logo className="block h-8 w-auto" />
          </Link>

          <div className="">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex min-h-full overflow-hidden px-10">
        <div className="w-[400px]">
          <span className="font-medium text-black">Console: </span>
          <div className="mt-4 block h-full w-full">
            <textarea
              ref={textareaRef}
              className="no-scrollbar h-full w-full rounded-lg border-0 bg-gray-100 p-4 font-mono text-xs text-black"
              value={message}
              readOnly
            />
          </div>
        </div>
        <div className="w-full">
          <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
            <p className="text-gray-400 mb-2">Welcome, {user?.id}!</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Account actions
                </h2>
                <div>
                  <span className="font-medium text-black">
                    Backend action:{' '}
                  </span>
                  <MintNFTButton handleSetMessage={handleSetMessage} />
                </div>
                <div>
                  <span className="font-medium text-black">
                    EIP-1193 provider:{' '}
                  </span>
                  <EvmProviderButton handleSetMessage={handleSetMessage} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
                <h2 className="flex justify-left font-medium text-xl pb-4">
                  Session keys
                </h2>
                <div>
                  <CreateSessionButton handleSetMessage={handleSetMessage} />
                </div>
              </div>
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
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://github.com/openfort-xyz/sample-browser-nextjs-embedded-signer/blob/main/src/components/Signatures/SignTypedDataButton.tsx#L25"
                    className="text-blue-600 hover:underline"
                  >
                    {'View typed message.'}
                  </a>
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
                  <button
                    type="button"
                    onClick={() => {
                      router.push('/link-wallet');
                    }}
                    className={
                      'mt-4 w-40 px-4 py-2 border-black text-black font-semibold rounded-lg shadow-md hover:bg-gray-100 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'
                    }
                  >
                    {'Link a Wallet'}
                  </button>
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

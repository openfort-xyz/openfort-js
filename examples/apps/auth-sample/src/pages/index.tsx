import React, { useEffect, useMemo, useRef, useState } from "react";
import type { NextPage } from "next";
import { useOpenfort } from "../hooks/useOpenfort";
import { EmbeddedState, OAuthProvider } from "@openfort/openfort-js";
import AccountRecovery from "../components/EmbeddedSignerRecovery/AccountRecovery";
import SignMessageButton from "../components/Signatures/SignMessageButton";
import SignTypedDataButton from "../components/Signatures/SignTypedDataButton";
import openfort from "../utils/openfortConfig";
import Loading from "../components/Loading";
import type { AuthPlayerResponse } from "@openfort/openfort-js";
import { useRouter } from "next/router";
import { Layout } from "../components/Layouts/Layout";
import LogoutButton from "../components/Logout";
import GetUserButton from "../components/User/GetUserButton";
import LinkOAuthButton from "../components/OAuth/LinkOAuthButton";
import ExportPrivateKey from "../components/Export/ExportPrivateKeyButton";
import SetWalletRecovery from "../components/SetWalletRecovery/SetWalletRecoveryButton";
import { SetPairingCodeWithWagmi } from "../components/WalletConnect/SetPairingCode";
import AddFunds from "../components/Funding/AddFunds";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import AccountActions from "@/components/AccountActions/AccountActions";
import Link from "next/link";

const HomePage: NextPage = () => {
  const { state } = useOpenfort();
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSetMessage = (message: string) => {
    const newMessage = `> ${message} \n\n`;
    setMessage((prev) => newMessage + prev);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log("error", error);
      });
      if (sessionData) {
        setUser(sessionData);
        setMessage((prev) => !prev.includes("User:") ? `> User: ${JSON.stringify(sessionData, null, 2)}\n\n${prev}` : prev);
      } else router.push("/login");
    };
    if (!user) fetchUser();
  }, [openfort]);

  if (state === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <Layout sidebar={
        <>
          <div className='flex-1 flex-col space-y-4 p-8'>
            <div className='bg-white text-sm p-3 border-orange-400 border-4 rounded-sm'>
              <p className="font-medium pb-1">
                Explore Openfort
              </p>
              <p className='text-gray-500'>
              Sign in to the demo to access the dev tools.
              </p>
              <Button variant={'outline'} size={'sm'} className="mt-2">
                <Link href='https://www.openfort.io/docs' target="_blank">
                  Explore the Docs
                </Link>
              </Button>
            </div>
          </div>
          <div className="p-6 mb-14 border-t bg-white">
            <p className="text-sm text-gray-600 mb-4">
              Openfort gives you modular components to customize your app. {' '}
              <a
                href="https://www.openfort.io/docs/guides/getting-started"
                className="text-blue-600 hover:underline"
              >
                Learn more
              </a>
              .
            </p>
            <div className="flex gap-3">
              <LogoutButton />
            </div>
          </div>
        </>
      }>
        <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
          <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
            <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
              <h1>Secure your embedded wallet</h1>
              <p className="text-gray-400 mb-4">
                You're log in, {user?.player?.name ?? user?.id}!
              </p>
              <div className="absolute top-2 right-2">
                <LogoutButton />
              </div>
              <div className="mt-8">
                <AccountRecovery />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (state !== EmbeddedState.READY) {
    return (
      <Layout sidebar={<div />}>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout
      sidebar={
        <>
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
              Openfort gives you modular components so you can customize your
              product for your users.
              <a
                href="https://www.openfort.io/docs/guides/getting-started"
                className="text-blue-600 hover:underline"
              >
                Learn more
              </a>
              .
            </p>
            <div className="flex gap-3">
              <LogoutButton />
            </div>
          </div>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
        <p className="text-gray-400 mb-2">Welcome, {user?.id}!</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <AccountActions handleSetMessage={handleSetMessage} />
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-lg pb-4">
              Wallet Signatures
            </h2>
            <div>
              <span className="text-sm text-grey-400">Message: Hello
              World!</span>
              <SignMessageButton handleSetMessage={handleSetMessage} />
            </div>
            <div>
              <SignTypedDataButton handleSetMessage={handleSetMessage} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-lg pb-4">
              Linked Socials
            </h2>

            <div>
              <GetUserButton handleSetMessage={handleSetMessage} />
            </div>
            <div>
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
            <legend className="test-sm leading-6 text-black">
            Connect Wallet
            </legend>
            <div>
              <Button
                className="w-full"
                onClick={() => {
                  router.push("/link-wallet");
                }}
                variant="outline"
              >
                {"Link wallet"}
              </Button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-lg pb-4">
              Embedded wallet
            </h2>
            <div>
              <ExportPrivateKey handleSetMessage={handleSetMessage} />
            </div>
            <div>
              <SetWalletRecovery handleSetMessage={handleSetMessage} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-lg pb-4">
              Pair via WalletConnect
            </h2>
            <div>
              <SetPairingCodeWithWagmi handleSetMessage={handleSetMessage} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-lg pb-4">
              Funding
            </h2>
            <div>
                <p className="text-sm text-black mb-4">
                Add funds is on-ramp or transfer funds from another wallet.
                </p>
              <AddFunds handleSetMessage={handleSetMessage} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;

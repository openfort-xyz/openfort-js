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
        handleSetMessage(JSON.stringify(sessionData, null, 2));
      } else router.push("/login");
    };
    if (!user) fetchUser();
  }, [openfort]);

  const linkedAccount = useMemo(() => {
    const linkedAccount = user?.linkedAccounts?.find(
      (account: any) => account.provider === "email"
    );
    return linkedAccount;
  }, [user]);

  useEffect(() => {
    if (linkedAccount?.verified === false) {
      router.push("/register");
    }
  }, [linkedAccount, router]);

  if (state === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <Layout sidebar={<div />}>
        <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
          <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
            <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
              <h1>Set up your embedded signer</h1>
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
                href="https://www.openfort.xyz/docs/guides/getting-started/integration"
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
            <h2 className="flex justify-left font-medium text-xl pb-4">
              Signatures
            </h2>
            <div>
              <span className="font-medium text-black">Message: </span>Hello
              World!
              <SignMessageButton handleSetMessage={handleSetMessage} />
            </div>
            <div>
              <span className="font-medium text-black">Typed message: </span>
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
              <span className="font-medium text-black">{"OAuth methods"}</span>
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
                className="w-full"
                onClick={() => {
                  router.push("/link-wallet");
                }}
                variant="outline"
              >
                {"Link a Wallet"}
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
              <SetPairingCodeWithWagmi handleSetMessage={handleSetMessage} />
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
    </Layout>
  );
};

export default HomePage;

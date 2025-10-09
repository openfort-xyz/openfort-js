import type { AuthPlayerResponse } from '@openfort/openfort-js'
import { EmbeddedState, OAuthProvider } from '@openfort/openfort-js'
import { Wallet } from 'lucide-react'
import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import AccountActions from '@/components/AccountActions/AccountActions'
import Authorizations7702 from '@/components/Authorizations7702/Authorizations7702'
import { type StatusType, Toast } from '@/components/Toasts'
import { Button } from '@/components/ui/button'
import Wallets from '@/components/Wallet/Wallet'
import AccountRecovery from '../components/EmbeddedSignerRecovery/AccountRecovery'
import AddFunds from '../components/Funding/AddFunds'
import { Layout } from '../components/Layouts/Layout'
import Loading from '../components/Loading'
import LogoutButton from '../components/Logout'
import LinkOAuthButton from '../components/OAuth/LinkOAuthButton'
import SignMessageButton from '../components/Signatures/SignMessageButton'
import SignTypedDataButton from '../components/Signatures/SignTypedDataButton'
import GetUserButton from '../components/User/GetUserButton'
import { SetPairingCodeWithWagmi } from '../components/WalletConnect/SetPairingCode'
import { useOpenfort } from '../hooks/useOpenfort'
import openfort from '../utils/openfortConfig'

const HomePage: NextPage = () => {
  const { state } = useOpenfort()
  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const router = useRouter()
  const [message, setMessage] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [status, setStatus] = useState<StatusType>(null)

  const handleSetMessage = useCallback((message: string) => {
    const newMessage = `> ${message} \n\n`
    if (window.innerWidth < 768) setStatus({ type: 'information', description: `> ${message}` })
    setMessage((prev) => newMessage + prev)
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.user.get().catch((error: Error) => {
        console.log('error', error)
      })
      if (sessionData) {
        setUser(sessionData)
        setMessage((prev) =>
          !prev.includes('User:') ? `> User: ${JSON.stringify(sessionData, null, 2)}\n\n${prev}` : prev
        )
      } else router.push('/login')
    }
    if (!user) fetchUser()
  }, [router.push, user])

  if (state === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <Layout
        sidebar={
          <>
            <div className="flex-1 flex-col space-y-4 p-8">
              <div className="bg-white text-sm p-3 border-orange-400 border-4 rounded-sm">
                <p className="font-medium pb-1">Explore Openfort</p>
                <p className="text-gray-500">Sign in to the demo to access the dev tools.</p>
                <Button variant={'outline'} size={'sm'} className="mt-2" asChild>
                  <Link href="https://www.openfort.io/docs" target="_blank">
                    Explore the Docs
                  </Link>
                </Button>
              </div>
            </div>
            <div className="p-6 mb-14 border-t bg-white">
              <p className="text-sm text-gray-600 mb-4">
                Openfort gives you modular components so you can customize your product for your users.
                <a
                  href="https://www.openfort.io/docs/products/embedded-wallet/react/kit/create-react-app"
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
        <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
          <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
            <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
              <h1>Set up your embedded signer</h1>
              <p className="text-gray-400 mb-4">Welcome, {user?.player?.name ?? user?.id}!</p>
              <div className="mt-8">
                <AccountRecovery />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (state !== EmbeddedState.READY) {
    return (
      <Layout
        sidebar={
          <>
            <div className="flex-1 w-full" />
            <div className="p-6 mb-14 border-t bg-white">
              <p className="text-sm text-gray-600 mb-4">
                Openfort gives you modular components so you can customize your product for your users.
                <a
                  href="https://www.openfort.io/docs/products/embedded-wallet"
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
        <Loading />
        {state === EmbeddedState.CREATING_ACCOUNT && (
          <p className="text-gray-500 text-center">Creating your account, please wait...</p>
        )}
      </Layout>
    )
  }

  return (
    <Layout
      sidebar={
        <>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <h2 className="font-semibold">Console</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-muted-foreground"
              onClick={() => {
                setMessage('')
                if (textareaRef.current) {
                  textareaRef.current.scrollTop = 0
                }
              }}
            >
              Clear
            </Button>
          </div>
          <div className="flex-1 w-full">
            <textarea
              ref={textareaRef}
              className="no-scrollbar h-full w-full border-0 bg-gray-100 p-4 font-mono text-xs text-black resize-none focus:ring-0"
              value={message}
              readOnly
            />
          </div>
          <div className="p-6 mb-14 border-t bg-white">
            <p className="text-sm text-gray-600 mb-4">
              Openfort gives you modular components so you can customize your product for your users.
              <a
                href="https://www.openfort.io/docs/products/embedded-wallet/react"
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
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6 pb-8">
        <p className="text-gray-400 mb-2">Welcome, {user?.id}!</p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AccountActions handleSetMessage={handleSetMessage} />
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-xl pb-4">Signatures</h2>
            <div>
              <span className="font-medium text-black">Message: </span>Hello World!
              <SignMessageButton handleSetMessage={handleSetMessage} />
            </div>
            <div>
              <span className="font-medium text-black">Typed message: </span>
              <SignTypedDataButton handleSetMessage={handleSetMessage} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-xl pb-4">Linked socials</h2>

            <div>
              <span className="font-medium text-black">Get user: </span>
              <GetUserButton handleSetMessage={handleSetMessage} />
            </div>
            <div>
              <span className="font-medium text-black">{'OAuth methods'}</span>
              {[OAuthProvider.GOOGLE, OAuthProvider.TWITTER, OAuthProvider.FACEBOOK].map((provider) => (
                <div key={provider}>
                  <LinkOAuthButton provider={provider} user={user} />
                </div>
              ))}
            </div>
            <div>
              <Button
                className="w-full"
                onClick={() => {
                  router.push('/link-wallet')
                }}
                variant="outline"
              >
                {'Link a Wallet'}
              </Button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-xl pb-4">Embedded wallet</h2>

            <Wallets handleSetMessage={handleSetMessage} />
          </div>

          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-xl pb-4">Wallet Connect</h2>
            <div>
              <p className="font-medium text-black mb-4">Connect via WalletConnect:</p>
              <SetPairingCodeWithWagmi handleSetMessage={handleSetMessage} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-xl pb-4">Funding</h2>
            <div>
              <p className="font-medium text-black mb-4">Add funds is on-ramp or transfer funds from another wallet.</p>
              <AddFunds handleSetMessage={handleSetMessage} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
            <h2 className="flex justify-left font-medium text-xl pb-4">7702 Authorizations</h2>
            <div>
              <Authorizations7702 handleSetMessage={handleSetMessage} />
            </div>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  )
}

export default HomePage

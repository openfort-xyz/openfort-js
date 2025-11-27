import type { User } from '@openfort/openfort-js'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Layout } from '../components/Layouts/Layout'
import { type StatusType, Toast } from '../components/Toasts'
import { getWalletButtons } from '../components/WalletConnectButton'
import { Chain, WalletConnector } from '../utils/constants'
import openfort from '../utils/openfortConfig'

function LinkWalletPage() {
  const [_user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.user.get().catch((error: Error) => {
        console.log('error', error)
      })
      if (sessionData) setUser(sessionData)
    }
    fetchUser()
  }, [])

  const [status, setStatus] = useState<StatusType>(null)
  const WalletButtons = getWalletButtons({
    chains: [Chain.AMOY],
    connectors: [WalletConnector.WALLET_CONNECT],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  })

  const redirect = () => {
    router.push('/')
  }

  return (
    <Layout sidebar={<div />}>
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            <div className="relative mb-6">
              <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">
                {'Link with your wallet'}
              </h1>
            </div>
            <WalletButtons onSuccess={redirect} link={true} />
            <p className="my-5 text-left text-sm text-gray-600">
              {'Go back to '}
              <Link href="/" className="text-blue-600">
                dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  )
}

export default LinkWalletPage

import 'tailwindcss/tailwind.css'
import type { AppProps } from 'next/app'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Providers } from '../components/Providers'
import LogoutButton from '../components/Shared/LogoutButton'
import { Button } from '../components/ui/button'
import { AuthProvider } from '../contexts/AuthContext'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <AuthProvider>
        <Layout
          sidebar={
            <>
              <div className="flex-1 w-full">
                <div className="bg-white text-sm p-3 m-3 border-orange-400 border-4 rounded-sm">
                  <p className="font-medium pb-1">Explore Openfort</p>
                  <p className="text-gray-500">Sign in to the demo to access the dev tools.</p>
                  <Button variant={'outline'} size={'sm'} className="mt-2">
                    <Link href="https://openfort.io/docs" target="_blank">
                      Explore the Docs
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="p-6 mb-14 border-t bg-white">
                <p className="text-sm text-gray-600 mb-4">
                  {'Openfort gives you modular components so you can customize your product for your users. '}
                  <a
                    href="https://www.openfort.io/docs/products/embedded-wallet/javascript"
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
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </Providers>
  )
}

export default MyApp

import { Cross1Icon, GitHubLogoIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Logo } from '../Logo'

export function Layout({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center space-x-2 overflow-hidden">
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <Cross1Icon className="size-4" /> : <HamburgerMenuIcon className="size-4" />}
            </button>

            <Link href="/" aria-label="Home">
              <Logo className="h-8 w-auto md:flex hidden" />
            </Link>
            <span className="text-gray-300 md:flex hidden md:pt-2">-</span>
            <p className="font-mono text-orange-600 font-medium md:pt-2 whitespace-nowrap truncate">Embedded Wallets</p>
          </div>
          <div className="space-x-2 flex">
            <a
              className="hidden md:inline-flex border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              target="_blank"
              href="https://github.com/openfort-xyz/openfort-js/tree/main/examples/apps/auth-sample"
              rel="noopener"
            >
              <GitHubLogoIcon className="h-5 w-5 mr-2" />
              {'View on Github'}
            </a>
            <a
              className="h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              target="_blank"
              href="https://dashboard.openfort.io/auth/register"
              rel="noopener"
            >
              {'Get started with Openfort ->'}
            </a>
          </div>
        </div>
      </header>
      <main className="h-full flex w-full overflow-hidden">
        <div
          className={cn(
            sidebarOpen ? 'flex fixed w-screen' : 'hidden',
            'w-xs md:flex md:max-w-sm lg:shrink-0 bg-white border-r flex-col h-full 2xl:fixed min-h-screen z-50'
          )}
        >
          {sidebar}
        </div>
        <div className="w-full py-4 mx-auto overflow-auto">{children}</div>
      </main>
    </div>
  )
}

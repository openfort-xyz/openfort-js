import Link from "next/link";
import { Logo } from "../Logo";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

export function Layout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center space-x-4">
            <Link href="/" aria-label="Home">
              <Logo className="h-8 w-auto md:flex hidden" />
            </Link>
            <span className="text-gray-300 md:flex hidden">-</span>
            <p className="font-mono text-orange-600 font-medium pt-2">
              Embedded Smart Wallet
            </p>
          </div>
          <div className="space-x-2 flex">
            <a
              className="hidden md:inline-flex border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              target="_blank"
              href="https://github.com/openfort-xyz/openfort-js/tree/main/examples/apps/auth-sample"
            >
              <GitHubLogoIcon className="h-5 w-5 mr-2" />
              {"View on Github"}
            </a>
            <a
              className="h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              target="_blank"
              href="https://dashboard.openfort.xyz/auth/register"
            >
              {"Get started with Openfort ->"}
            </a>
          </div>
        </div>
      </header>
      <main className="h-screen flex">
        <div className="w-full md:w-1/4 hidden md:flex max-w-sm bg-white border-r flex-col h-screen fixed">
          {sidebar}
        </div>
        <div className="w-full my-4">{children}</div>
      </main>
    </>
  );
}

import Link from 'next/link';
// import { HeroPattern } from '@/components/HeroPattern'
import {Logo} from '../Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-full overflow-hidden pt-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
        <div className="flex pl-4 md:mb-4 md:pl-8">
          <Link href="/" aria-label="Home">
            <Logo className="block h-8 w-auto" />
          </Link>
        </div>
        <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
          <div className="relative mb-6">
            <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">
              {title}
            </h1>
          </div>
          {children}
        </div>
        {subtitle && (
          <p className="my-5 text-left text-sm text-gray-600">{subtitle}</p>
        )}
      </div>
    </main>
  );
}

import Head from 'next/head';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';

import {AuthLayout} from '../components/Layouts/AuthLayout';
import {Button} from '../components/Button';
import {TextField} from '../components/Fields';
import openfort from '../utils/openfortConfig';
import {CheckCircleIcon} from '@heroicons/react/24/outline';
import {StatusType, Toast} from '../components/Toasts';
import {AuthPlayerResponse, OAuthProvider} from '@openfort/openfort-js';
import {useRouter} from 'next/router';
import {getURL} from '../utils/getUrl';

type ErrorType = string | null;

function checkPassword(str: string) {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return re.test(str);
}

function RegisterPage() {
  const [show, setShow] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState(false);
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log('error', error);
      });
      if (sessionData) setUser(sessionData);
    };
    fetchUser();
  }, [openfort]);

  const [status, setStatus] = useState<StatusType>(null);
  const [error, setError] = useState<ErrorType>(null);

  const linkedAccount = useMemo(() => {
    // Find in linkedAccounts with provider email
    const linkedAccount = user?.linkedAccounts?.find(
      (account: any) => account.provider === 'email'
    );
    if (linkedAccount?.verified === false) {
      setEmailConfirmation(true);
    }
    return linkedAccount;
  }, [user]);

  // check if "state" exists in url query param and if it does make an api call:
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        if (
          linkedAccount &&
          linkedAccount.verified === false &&
          linkedAccount.email &&
          router.query.state
        ) {
          await openfort.verifyEmail({
            email: linkedAccount.email,
            state: router.query.state as string,
          });
          router.push('/');
        }
      } catch (error) {
        setStatus({
          type: 'error',
          title: 'Error verifying email',
        });
      }
    };
    verifyEmail();
  }, [linkedAccount, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const last_name = formData.get('last_name') as string;
    const first_name = formData.get('first_name') as string;

    if (!checkPassword(password)) {
      setError('invalidPassword');
      return;
    } else {
      setError(null);
    }
    // prevent default form submission
    setStatus({
      type: 'loading',
      title: 'Signing up...',
    });

    const data = await openfort
      .signUpWithEmailPassword({
        email: email,
        password: password,
        options: {
          data: {
            name: first_name + ' ' + last_name,
          },
        },
      })
      .catch((error) => {
        setStatus({
          type: 'error',
          title: 'Error signing up',
        });
      });
    await openfort.requestEmailVerification({
      email: email,
      redirectUrl: getURL() + '/register',
    });
    if (data) {
      setStatus({
        type: 'success',
        title: 'Successfully signed up',
      });
      setUser(data.player);
      setEmailConfirmation(true);
    }
  };

  return (
    <>
      <Head>
        <title>Openfort Register | Sign up to the Openfort Dashboard</title>
        <meta
          name="description"
          content="Sign up to the Openfort Dashboard to manage your game accounts and more."
        />{' '}
      </Head>
      <AuthLayout
        title="Sign up for an account"
        subtitle={
          <>
            {'Have an account? '}
            <Link href="/login" className="text-blue-600">
              Sign in
            </Link>
          </>
        }
      >
        {emailConfirmation ? (
          <div className="flex rounded border border-green-900 bg-green-200 p-4">
            <CheckCircleIcon className="h-8 w-8 text-green-900" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                Check your email to confirm
              </h3>
              <div className="text-xs font-medium text-green-900">
                {`You've successfully signed up. Please check your email to
                confirm your account before signing in to the Openfort dashboard`}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <TextField
                label="First name"
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                required
              />
              <TextField
                label="Last name"
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                required
              />
              <TextField
                className="col-span-full"
                label="Email address"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <TextField
                className="col-span-full"
                label="Password"
                id="password"
                name="password"
                show={show}
                setShow={setShow}
                type="password"
                autoComplete="new-password"
                required
              />
              <p
                className={`col-span-full text-xs ${
                  error === 'invalidPassword'
                    ? 'font-medium text-red-500'
                    : 'font-normal text-gray-400'
                }`}
              >
                {
                  'Your password must be at least 8 characters including a lowercase letter, an uppercase letter, and a special character (e.g. !@#%&*).'
                }
              </p>
            </div>
            <Button type="submit" color="orange" className="mt-8 w-full py-2">
              Get started today
            </Button>
          </form>
        )}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <div>
              <button
                onClick={async () => {
                  const {url} = await openfort.initOAuth({
                    provider: OAuthProvider.GOOGLE,
                    options: {
                      redirectTo: getURL() + '/login',
                    },
                  });
                  window.location.href = url;
                }}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <span>Continue with Google</span>
              </button>
            </div>
            <div>
              <button
                onClick={async () => {
                  const {url} = await openfort.initOAuth({
                    provider: OAuthProvider.TWITTER,
                    options: {
                      redirectTo: getURL() + '/login',
                    },
                  });
                  window.location.href = url;
                }}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <p>Continue with Twitter</p>
              </button>
            </div>
            <div>
              <button
                onClick={async () => {
                  const {url} = await openfort.initOAuth({
                    provider: OAuthProvider.FACEBOOK,
                    options: {
                      redirectTo: getURL() + '/login',
                    },
                  });
                  window.location.href = url;
                }}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <p>Continue with Facebook</p>
              </button>
            </div>
            <div>
              <a
                href="/connect-wallet"
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <p>Continue with wallet</p>
              </a>
            </div>
          </div>
          <div>
            <p className="mt-4 text-xs font-normal text-zinc-400">
              By signing up, you accept
              <Link
                className="mx-1 text-orange-500 hover:text-zinc-700"
                href="https://openfort.xyz/terms"
              >
                user terms
              </Link>
              ,
              <Link
                className="mx-1 text-orange-500 hover:text-zinc-700"
                href="https://openfort.xyz/privacy"
              >
                privacy policy
              </Link>
              and
              <Link
                className="mx-1 text-orange-500 hover:text-zinc-700"
                href="https://openfort.xyz/developer-terms"
              >
                developer terms of use.
              </Link>
            </p>
          </div>
        </div>
        <Toast status={status} setStatus={setStatus} />
      </AuthLayout>
    </>
  );
}

export default RegisterPage;

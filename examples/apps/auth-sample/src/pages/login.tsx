import {useState, useEffect} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {AuthLayout} from '../components/Layouts/AuthLayout';
import {Button, LinkButton} from '../components/Button';
import {TextField} from '../components/Fields';
import {StatusType, Toast} from '../components/Toasts';
import openfort from '../utils/openfortConfig';
import {getURL} from '../utils/getUrl';
import {AuthPlayerResponse} from '@openfort/openfort-js';

function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusType>(null);
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log('error', error);
      });
      if (sessionData) setUser(sessionData);
    };
    fetchUser();
  }, [openfort]);

  const [show, setShow] = useState(false);

  useEffect(() => {
    if (router.query.access_token && router.query.refresh_token) {
      console.log('router.query', router.query);
      openfort.storeCredentials({
        player: undefined,
        accessToken: router.query.access_token as string,
        refreshToken: router.query.refresh_token as string,
      });
      router.push('/');
    }
  }, [router.query]);
  useEffect(() => {
    try {
      const loadData = async () => {
        setStatus({
          type: 'loading',
          title: 'Signing in...',
        });

        location.href = '/';
      };

      if (user) loadData();
    } catch (error) {
      // console.log('error', error)
    }
  }, [user, openfort]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setStatus({
      type: 'loading',
      title: 'Signing in...',
    });
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    event.preventDefault();

    const data = await openfort
      .loginWithEmailPassword({
        email: email,
        password: password,
      })
      .catch((error) => {
        setStatus({
          type: 'error',
          title: 'Error signing in',
        });
      });
    if (data) {
      setStatus({
        type: 'success',
        title: 'Successfully signed in',
      });

      router.push('/');
    }
  };

  return (
    <>
      <Head>
        <title>Openfort Login | Sign in to the Openfort Dashboard</title>
        <meta
          name="description"
          content="Sign in to the Openfort Dashboard to manage your game accounts and more."
        />
      </Head>
      <AuthLayout
        title="Sign in to account"
        subtitle={
          <>
            Don’t have an account?{' '}
            <Link href="/register" className="text-orange-600">
              Sign up
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <TextField
              label="Email address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <TextField
              label="Password"
              id="password"
              name="password"
              show={show}
              setShow={setShow}
              type="password"
              autoComplete="current-password"
              required
            />
            <div className="flex w-full flex-row-reverse ">
              <LinkButton
                variant="text"
                href="/forgot-password"
                className="text-sm font-medium text-orange-600"
              >
                Forgot password?
              </LinkButton>
            </div>
          </div>
          <Button type="submit" color="orange" className="mt-8 w-full py-2">
            Sign in to account
          </Button>
        </form>
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
                    provider: 'google',
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
                    provider: 'twitter',
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
                    provider: 'facebook',
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
        </div>
        <Toast status={status} setStatus={setStatus} />
      </AuthLayout>
    </>
  );
}

export default LoginPage;

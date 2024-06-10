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

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div>
              <button
                onClick={async () => {
                  const result = await openfort.initOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: getURL() + '/login',
                    },
                  });
                  window.location.href = result.url;
                }}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Google</span>
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" />{' '}
                </svg>
              </button>
            </div>
            <div>
              <button
                onClick={async () => {
                  const result = await openfort.initOAuth({
                    provider: 'twitter',
                    options: {
                      redirectTo: getURL() + '/login',
                    },
                  });
                  window.location.href = result.url;
                }}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Twitter</span>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  x="0px"
                  y="0px"
                  viewBox="0 0 20 20"
                >
                  <linearGradient
                    id="U8Yg0Q5gzpRbQDBSnSCfPa_yoQabS8l0qpr_gr1"
                    x1="4.338"
                    x2="38.984"
                    y1="-10.056"
                    y2="49.954"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#4b4b4b"></stop>
                    <stop offset=".247" stopColor="#3e3e3e"></stop>
                    <stop offset=".686" stopColor="#2b2b2b"></stop>
                    <stop offset="1" stopColor="#252525"></stop>
                  </linearGradient>
                  <path
                    fill="url(#U8Yg0Q5gzpRbQDBSnSCfPa_yoQabS8l0qpr_gr1)"
                    d="M38,42H10c-2.209,0-4-1.791-4-4V10c0-2.209,1.791-4,4-4h28c2.209,0,4,1.791,4,4v28	C42,40.209,40.209,42,38,42z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M34.257,34h-6.437L13.829,14h6.437L34.257,34z M28.587,32.304h2.563L19.499,15.696h-2.563 L28.587,32.304z"
                  ></path>
                  <polygon
                    fill="#fff"
                    points="15.866,34 23.069,25.656 22.127,24.407 13.823,34"
                  ></polygon>
                  <polygon
                    fill="#fff"
                    points="24.45,21.721 25.355,23.01 33.136,14 31.136,14"
                  ></polygon>
                </svg>
              </button>
            </div>
            <div>
              <button
                onClick={async () => {
                  const result = await openfort.initOAuth({
                    provider: 'facebook',
                    options: {
                      redirectTo: getURL() + '/login',
                    },
                  });
                  window.location.href = result.url;
                }}
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Facebook</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  x="0px"
                  y="0px"
                  viewBox="0 0 20 20"
                >
                  <path d="M24,4H6C4.895,4,4,4.895,4,6v18c0,1.105,0.895,2,2,2h10v-9h-3v-3h3v-1.611C16,9.339,17.486,8,20.021,8 c1.214,0,1.856,0.09,2.16,0.131V11h-1.729C19.376,11,19,11.568,19,12.718V14h3.154l-0.428,3H19v9h5c1.105,0,2-0.895,2-2V6 C26,4.895,25.104,4,24,4z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <Toast status={status} setStatus={setStatus} />
      </AuthLayout>
    </>
  );
}

export default LoginPage;

import {useState, useEffect} from 'react';

import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';

import {AuthLayout} from '../components/Layouts/AuthLayout';
import {Button} from '../components/Button';
import {TextField} from '../components/Fields';

import {StatusType, Toast} from '../components/Toasts';

import openfort from '../utils/openfortConfig';
import {getURL} from '../utils/getUrl';
import {AuthPlayerResponse} from '@openfort/openfort-js';

function ForgotPasswordPage() {
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

  useEffect(() => {
    async function loadData() {
      router.push('/dashboard');
    }

    if (user) loadData();
  }, [user, openfort]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setStatus({
      type: 'loading',
      title: 'Sending password reset email...',
    });

    const formData = new FormData(event.currentTarget);

    const email = formData.get('email') as string;

    event.preventDefault();
    localStorage.setItem('openfort:email', email);
    await openfort
      .requestResetPassword({
        email: email,
        redirectUrl: getURL() + '/reset-password',
      })
      .catch((error) => {
        setStatus({
          type: 'error',
          title: 'Error sending email',
        });
      });

    setStatus({
      type: 'success',
      title: 'Successfully sent email',
    });
  };

  return (
    <>
      <Head>
        <title>Openfort Forgot Password</title>
        <meta
          name="description"
          content="Reset your password to your Openfort account to manage your game accounts and more."
        />
      </Head>
      <AuthLayout
        title="Reset Your Password"
        subtitle={
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600">
              Sign in
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
          </div>
          <Button type="submit" color="orange" className="mt-8 w-full py-2">
            Send Reset Email
          </Button>
        </form>
        <Toast status={status} setStatus={setStatus} />
      </AuthLayout>
    </>
  );
}

export default ForgotPasswordPage;

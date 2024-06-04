import {useState} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {AuthLayout} from '../components/Layouts/AuthLayout';
import {Button} from '../components/Button';
import {TextField} from '../components/Fields';
import {StatusType, Toast} from '../components/Toasts';
import openfort from '../utils/openfortConfig';

function checkPassword(str: string) {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return re.test(str);
}

type ErrorType = string | null;

function ResetPassswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusType>(null);
  const [error, setError] = useState<ErrorType>(null);
  const [show, setShow] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!router.query.state) router.push('/login');
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;

    if (!checkPassword(password)) {
      setError('invalidPassword');
      return;
    } else {
      setError(null);
    }
    setStatus({
      type: 'loading',
      title: 'Updating password...',
    });

    const email = localStorage.getItem('openfort:email');
    if (!email) {
      setStatus({
        type: 'error',
        title: 'Error updating password',
      });
      return;
    }
    await openfort
      .resetPassword({
        password: password,
        email: email as string,
        state: router.query.state as string,
      })
      .catch((error) => {
        setStatus({
          type: 'error',
          title: 'Error updating password',
        });
        return;
      });

    setStatus({
      type: 'success',
      title: 'Successfully updated password',
    });
    router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Openfort Reset Password</title>
        <meta
          name="description"
          content="Type in a new secure password and press save to update your password"
        />
      </Head>
      <AuthLayout
        title="Reset Your Password"
        subtitle={
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-orange-600">
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <TextField
              label="Password"
              id="password"
              name="password"
              setShow={setShow}
              show={show}
              type="password"
              autoComplete="current-password"
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
            Save New Password
          </Button>
        </form>
        <Toast status={status} setStatus={setStatus} />
      </AuthLayout>
    </>
  );
}

export default ResetPassswordPage;

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useId, useState } from 'react'
import Loading from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { TextField } from '../components/Fields'
import { Layout } from '../components/Layouts/Layout'
import { type StatusType, Toast } from '../components/Toasts'
import openfort from '../utils/openfortConfig'

function checkPassword(str: string) {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/
  return re.test(str)
}

type ErrorType = string | null

function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusType>(null)
  const [error, setError] = useState<ErrorType>(null)
  const [show, setShow] = useState(false)
  const passwordId = useId()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!router.query.state) router.push('/login')
    const formData = new FormData(event.currentTarget)
    const password = formData.get('password') as string

    if (!checkPassword(password)) {
      setError('invalidPassword')
      return
    } else {
      setError(null)
    }
    setStatus({
      type: 'loading',
      title: 'Updating password...',
    })

    const email = localStorage.getItem('openfort:email')
    if (!email) {
      setStatus({
        type: 'error',
        title: 'Error updating password',
      })
      return
    }
    await openfort.auth
      .resetPassword({
        password: password,
        token: router.query.token as string,
      })
      .catch((_error) => {
        setStatus({
          type: 'error',
          title: 'Error updating password',
        })
        return
      })

    setStatus({
      type: 'success',
      title: 'Successfully updated password',
    })
    router.push('/login')
  }

  return (
    <Layout sidebar={<div />}>
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            <div className="relative mb-6">
              <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">{'Reset Your Password'}</h1>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <TextField
                  label="Password"
                  id={passwordId}
                  name="password"
                  setShow={setShow}
                  show={show}
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <p
                  className={`col-span-full text-xs ${
                    error === 'invalidPassword' ? 'font-medium text-red-500' : 'font-normal text-gray-400'
                  }`}
                >
                  {
                    'Your password must be at least 8 characters including a lowercase letter, an uppercase letter, and a special character (e.g. !@#%&*).'
                  }
                </p>
              </div>
              <Button disabled={status?.type === 'loading'} type="submit" className="mt-8 w-full py-2">
                {status?.type === 'loading' ? <Loading /> : 'Save New Password'}
              </Button>
            </form>
            <p className="my-5 text-left text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  )
}

export default ResetPasswordPage

import type { AuthPlayerResponse } from '@openfort/openfort-js'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useId, useState } from 'react'
import Loading from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { TextField } from '../components/Fields'
import { Layout } from '../components/Layouts/Layout'
import { type StatusType, Toast } from '../components/Toasts'
import { getURL } from '../utils/getUrl'
import openfort from '../utils/openfortConfig'

function ForgotPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusType>(null)

  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const emailId = useId()

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.user.get().catch((error: Error) => {
        console.log('error', error)
      })
      if (sessionData) setUser(sessionData)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    async function loadData() {
      router.push('/dashboard')
    }

    if (user) loadData()
  }, [user, router.push])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setStatus({
      type: 'loading',
      title: 'Sending password reset email...',
    })

    const formData = new FormData(event.currentTarget)

    const email = formData.get('email') as string

    event.preventDefault()
    localStorage.setItem('openfort:email', email)
    await openfort.auth
      .requestResetPassword({
        email: email,
        redirectUrl: `${getURL()}/reset-password`,
      })
      .catch((_error) => {
        setStatus({
          type: 'error',
          title: 'Error sending email',
        })
      })

    setStatus({
      type: 'success',
      title: 'Successfully sent email',
    })
  }

  return (
    <Layout sidebar={<div />}>
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            <div className="relative mb-6">
              <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">{'Reset Your Password'}</h1>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <TextField
                    label="Email address"
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button disabled={status?.type === 'loading'} type="submit" className="mt-8 w-full py-2">
                  {status?.type === 'loading' ? <Loading /> : 'Send Reset Email'}
                </Button>
              </form>
              <p className="my-5 text-left text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600">
                  login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  )
}

export default ForgotPasswordPage

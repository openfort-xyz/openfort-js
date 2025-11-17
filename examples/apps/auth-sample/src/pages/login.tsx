import { type AuthPlayerResponse, OAuthProvider } from '@openfort/openfort-js'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useId, useState } from 'react'
import { EmailOTPRequestModal } from '@/components/EmailOTPRequestModal'
import EventMonitor from '@/components/EventMonitor/EventMonitor'
import Loading from '@/components/Loading'
import { OTPVerificationModal } from '@/components/OTPVerificationModal'
import { SMSOTPRequestModal } from '@/components/SMSOTPRequestModal'
import { Button } from '@/components/ui/button'
import { TextField } from '../components/Fields'
import { Layout } from '../components/Layouts/Layout'
import { type StatusType, Toast } from '../components/Toasts'
import { getURL } from '../utils/getUrl'
import openfort from '../utils/openfortConfig'

function LoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusType>(null)
  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const [guestLoading, setGuestLoading] = useState(false)
  const emailId = useId()
  const passwordId = useId()

  // OTP states
  const [showEmailOTPModal, setShowEmailOTPModal] = useState(false)
  const [showSMSOTPModal, setShowSMSOTPModal] = useState(false)
  const [showEmailOTPRequestModal, setShowEmailOTPRequestModal] = useState(false)
  const [showSMSOTPRequestModal, setShowSMSOTPRequestModal] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [isOTPLoading, setIsOTPLoading] = useState(false)

  // check if "state" exists in url query param and if it does make an api call:
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const email = localStorage.getItem('email')
        if (email && router.query.state) {
          await openfort.auth.verifyEmail({
            email: email,
            state: router.query.state as string,
          })
          localStorage.removeItem('email')
          setStatus({
            type: 'success',
            title: 'Email verified! You can now sign in.',
          })
        }
      } catch (_error) {
        setStatus({
          type: 'error',
          title: 'Error verifying email',
        })
      }
    }
    verifyEmail()
  }, [router])

  useEffect(() => {
    if (router.query.access_token && router.query.refresh_token && router.query.player_id) {
      setStatus({
        type: 'loading',
        title: 'Signing in...',
      })
      openfort.auth.storeCredentials({
        player: router.query.player_id as string,
        accessToken: router.query.access_token as string,
        refreshToken: router.query.refresh_token as string,
      })
      location.href = '/'
    }
  }, [router.query])

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.user.get().catch((error: Error) => {
        console.log('error', error)
      })
      if (sessionData) setUser(sessionData)
    }
    fetchUser()
  }, [])

  const [show, setShow] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setStatus({
        type: 'loading',
        title: 'Signing in...',
      })

      router.push('/')
    }

    if (user) loadData()
  }, [user, router.push])

  const handleGuest = async () => {
    setGuestLoading(true)
    setStatus({
      type: 'loading',
      title: 'Signing in...',
    })

    const data = await openfort.auth.signUpGuest().catch((error) => {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Error signing in',
      })
      setGuestLoading(false)
    })
    if (data) {
      setStatus({
        type: 'success',
        title: 'Successfully signed in',
      })
      router.push('/')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setStatus({
      type: 'loading',
      title: 'Signing in...',
    })
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    event.preventDefault()

    const data = await openfort.auth
      .logInWithEmailPassword({
        email: email,
        password: password,
      })
      .catch((_error) => {
        setStatus({
          type: 'error',
          title: 'Error signing in',
        })
      })
    if (data) {
      localStorage.setItem('userEmail', email)
      setStatus({
        type: 'success',
        title: 'Successfully signed in',
      })
      router.push('/')
    }
  }

  // Email OTP handlers
  const handleEmailOTPRequest = async (email: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Sending OTP...',
    })

    try {
      await openfort.auth.requestEmailOtp({ email })
      setOtpEmail(email)
      setShowEmailOTPRequestModal(false)
      setShowEmailOTPModal(true)
      setStatus({
        type: 'success',
        title: 'OTP sent to your email',
      })
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Error sending OTP',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  const handleEmailOTPRequestSubmit = async (email: string) => {
    await handleEmailOTPRequest(email)
  }

  const handleEmailOTPVerify = async (otp: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Verifying OTP...',
    })

    try {
      const data = await openfort.auth.logInWithEmailOtp({ email: otpEmail, otp })
      if (data) {
        setStatus({
          type: 'success',
          title: 'Successfully signed in',
        })
        setShowEmailOTPModal(false)
        router.push('/')
      }
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Invalid OTP code',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  // SMS OTP handlers
  const handleSMSOTPRequest = async (phone: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Sending OTP...',
    })

    try {
      await openfort.auth.requestPhoneOtp({ phoneNumber: phone })
      setOtpPhone(phone)
      setShowSMSOTPRequestModal(false)
      setShowSMSOTPModal(true)
      setStatus({
        type: 'success',
        title: 'OTP sent to your phone',
      })
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Error sending OTP',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  const handleSMSOTPRequestSubmit = async (phone: string) => {
    await handleSMSOTPRequest(phone)
  }

  const handleSMSOTPVerify = async (otp: string) => {
    setIsOTPLoading(true)
    setStatus({
      type: 'loading',
      title: 'Verifying OTP...',
    })

    try {
      const data = await openfort.auth.logInWithPhoneOtp({ phoneNumber: otpPhone, otp: otp })
      if (data) {
        setStatus({
          type: 'success',
          title: 'Successfully signed in',
        })
        setShowSMSOTPModal(false)
        router.push('/')
      }
    } catch (error) {
      console.log('error', error)
      setStatus({
        type: 'error',
        title: 'Invalid OTP code',
      })
      throw error
    } finally {
      setIsOTPLoading(false)
    }
  }

  return (
    <Layout
      sidebar={
        <>
          <div className="flex-1 flex-col space-y-4 p-8">
            <div className="bg-white text-sm p-3 border-orange-400 border-4 rounded-sm">
              <p className="font-medium pb-1">Explore Openfort</p>
              <p className="text-gray-500">Sign in to the demo to access the dev tools.</p>
              <Button variant={'outline'} size={'sm'} className="mt-2">
                <Link href="https://www.openfort.io/docs" target="_blank">
                  Explore the Docs
                </Link>
              </Button>
            </div>
          </div>
          <EventMonitor />
          <div className="py-12" />
        </>
      }
    >
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            <div className="relative mb-6">
              <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">{'Sign in to account'}</h1>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <TextField label="Email address" id={emailId} name="email" type="email" autoComplete="email" required />
                <TextField
                  label="Password"
                  id={passwordId}
                  name="password"
                  show={show}
                  setShow={setShow}
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <div className="flex w-full flex-row-reverse ">
                  <Button
                    variant="link"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      router.push('/forgot-password')
                    }}
                    className="text-blue-600"
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>
              <Button disabled={status?.type === 'loading'} type="submit" className="w-full">
                {status?.type === 'loading' && !guestLoading ? <Loading /> : 'Sign in to account'}
              </Button>
            </form>
            <div className="mt-6">
              <Button onClick={handleGuest} variant="outline" className="w-full">
                {status?.type === 'loading' && guestLoading ? <Loading /> : 'Continue as Guest'}
              </Button>
            </div>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500 b">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-2 grid-cols-1 gap-3">
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.auth.initOAuth({
                        provider: OAuthProvider.GOOGLE,
                        options: {
                          redirectTo: `${getURL()}/login`,
                        },
                      })
                      window.location.href = url
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <span>Continue with Google</span>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.auth.initOAuth({
                        provider: OAuthProvider.TWITTER,
                        options: {
                          redirectTo: `${getURL()}/login`,
                        },
                      })
                      window.location.href = url
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <p>Continue with Twitter</p>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.auth.initOAuth({
                        provider: OAuthProvider.FACEBOOK,
                        options: {
                          redirectTo: `${getURL()}/login`,
                        },
                      })
                      window.location.href = url
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <p>Continue with Facebook</p>
                  </Button>
                </div>
                <div>
                  <Button onClick={() => router.push('/connect-wallet')} variant="outline" className="w-full">
                    <p>Continue with wallet</p>
                  </Button>
                </div>
                <div>
                  <Button onClick={() => setShowEmailOTPRequestModal(true)} variant="outline" className="w-full">
                    <p>Continue with Email OTP</p>
                  </Button>
                </div>
                <div>
                  <Button onClick={() => setShowSMSOTPRequestModal(true)} variant="outline" className="w-full">
                    <p>Continue with SMS OTP</p>
                  </Button>
                </div>
              </div>
            </div>
            <p className="my-5 text-left text-sm text-gray-600">
              {'Don’t have an account? '}
              <Link href="/register" className="text-blue-600">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />

      {/* Email OTP Request Modal */}
      <EmailOTPRequestModal
        isOpen={showEmailOTPRequestModal}
        onClose={() => setShowEmailOTPRequestModal(false)}
        onSubmit={handleEmailOTPRequestSubmit}
        isLoading={isOTPLoading}
        title="Continue with Email OTP"
        description="Enter your email address to receive a verification code."
      />

      {/* SMS OTP Request Modal */}
      <SMSOTPRequestModal
        isOpen={showSMSOTPRequestModal}
        onClose={() => setShowSMSOTPRequestModal(false)}
        onSubmit={handleSMSOTPRequestSubmit}
        isLoading={isOTPLoading}
        title="Continue with SMS OTP"
        description="Enter your phone number to receive a verification code."
      />

      {/* Email OTP Modal */}
      <OTPVerificationModal
        isOpen={showEmailOTPModal}
        onClose={() => setShowEmailOTPModal(false)}
        onSubmit={handleEmailOTPVerify}
        onResendOTP={() => handleEmailOTPRequest(otpEmail)}
        email={otpEmail}
        isLoading={isOTPLoading}
        type="email"
        codeLength={6}
      />

      {/* SMS OTP Modal */}
      <OTPVerificationModal
        isOpen={showSMSOTPModal}
        onClose={() => setShowSMSOTPModal(false)}
        onSubmit={handleSMSOTPVerify}
        onResendOTP={() => handleSMSOTPRequest(otpPhone)}
        email={otpPhone}
        isLoading={isOTPLoading}
        type="phone"
        codeLength={6}
      />
    </Layout>
  )
}

export default LoginPage

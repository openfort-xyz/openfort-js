import type { AuthPlayerResponse, OAuthProvider } from '@openfort/openfort-js'
import type React from 'react'
import { useMemo, useState } from 'react'
import { useOpenfort } from '../../hooks/useOpenfort'
import { getURL } from '../../utils/getUrl'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

const LinkOAuthButton: React.FC<{
  provider: OAuthProvider
  user: AuthPlayerResponse | null
}> = ({ provider, user }) => {
  const { state: _state } = useOpenfort()
  const [loading, setLoading] = useState(false)
  const handleLinkOAuth = async () => {
    try {
      setLoading(true)
      const accessToken = (await openfort.getAccessToken()) as string
      const { url } = await openfort.auth.initLinkOAuth({
        authToken: accessToken,
        provider: provider,
        options: {
          redirectTo: `${getURL()}/login`,
        },
      })
      setLoading(false)
      window.location.href = url
    } catch (err) {
      console.error('Failed to sign message:', err)
      alert('Failed to sign message. Please try again.')
    }
  }

  const isLinked = useMemo(() => {
    if (!user) return false
    return user.linkedAccounts.some((account) => account.provider === provider)
  }, [user, provider])

  return (
    <div className="my-2">
      <Button className="w-full" onClick={handleLinkOAuth} disabled={isLinked} variant="outline">
        {loading ? <Loading /> : `${isLinked ? 'Linked' : 'Link'} ${provider}`}
      </Button>
    </div>
  )
}

export default LinkOAuthButton

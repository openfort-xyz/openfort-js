import type { OAuthProvider, User } from '@openfort/openfort-js'
import type React from 'react'
import { useState } from 'react'
import { useOpenfort } from '@/contexts/OpenfortContext'
import { getURL } from '../../utils/getUrl'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

const LinkOAuthButton: React.FC<{
  provider: OAuthProvider
  user: User | null
}> = ({ provider, user }) => {
  const { state: _state } = useOpenfort()
  const [loading, setLoading] = useState(false)
  const handleLinkOAuth = async () => {
    try {
      setLoading(true)

      let url: string

      if (user?.isAnonymous) {
        url = await openfort.auth.linkOAuthToAnonymous({
          provider: provider,
          redirectTo: `${getURL()}/login`,
        })
      } else {
        url = await openfort.auth.initLinkOAuth({
          provider: provider,
          options: {
            redirectTo: `${getURL()}/login`,
          },
        })
      }

      setLoading(false)
      window.location.href = url
    } catch (err) {
      console.error('Failed to sign message:', err)
      alert('Failed to sign message. Please try again.')
    }
  }

  return (
    <div className="my-2">
      <Button className="w-full" onClick={handleLinkOAuth} variant="outline">
        {loading ? <Loading /> : `Link ${provider}`}
      </Button>
    </div>
  )
}

export default LinkOAuthButton

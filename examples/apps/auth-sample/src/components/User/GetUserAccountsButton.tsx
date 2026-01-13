import type React from 'react'
import { useState } from 'react'
import { getErrorMessage } from '../../utils/errorHandler'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

const GetUserAccountsButton: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const [loading, setLoading] = useState(false)

  const handleUserMessage = async () => {
    try {
      setLoading(true)
      const user = await openfort.user.list()
      setLoading(false)
      handleSetMessage(JSON.stringify(user, null, 2))
    } catch (error) {
      setLoading(false)
      console.error('Failed to get user accounts:', error)
      alert(`Failed to get user accounts: ${getErrorMessage(error)}`)
    }
  }

  return (
    <div>
      <Button className="w-full" disabled={loading} onClick={handleUserMessage} variant="outline">
        {loading ? <Loading /> : 'Get user linked providers'}
      </Button>
    </div>
  )
}

export default GetUserAccountsButton

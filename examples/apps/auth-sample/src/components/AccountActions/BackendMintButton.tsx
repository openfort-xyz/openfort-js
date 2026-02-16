import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import { useCallback, useState } from 'react'
import { useOpenfort } from '@/contexts/OpenfortContext'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

const BackendMintButton: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { state, account } = useOpenfort()
  const [loading, setLoading] = useState(false)

  const mintToken = useCallback(async (): Promise<string | null> => {
    if (!account?.id) {
      alert('No account available')
      return null
    }
    const collectResponse = await fetch(`/api/protected-collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await openfort.getAccessToken()}`,
      },
      body: JSON.stringify({ account_id: account.id }),
    })

    if (!collectResponse.ok) {
      alert(`Failed to mint Token status: ${collectResponse.status}`)
      return null
    }
    const collectResponseJSON = await collectResponse.json()

    const response = await openfort.proxy.sendSignatureTransactionIntentRequest(
      collectResponseJSON.transactionIntentId,
      collectResponseJSON.userOperationHash
    )
    return response?.response?.transactionHash ?? null
  }, [account?.id])

  const handleMintToken = async () => {
    setLoading(true)
    const transactionHash = await mintToken()
    setLoading(false)
    if (transactionHash) {
      handleSetMessage(`https://amoy.polygonscan.com/tx/${transactionHash}`)
    }
  }

  return (
    <div>
      <Button className="w-full" disabled={state !== EmbeddedState.READY} onClick={handleMintToken} variant="outline">
        {loading ? <Loading /> : 'Mint Token'}
      </Button>
    </div>
  )
}

export default BackendMintButton

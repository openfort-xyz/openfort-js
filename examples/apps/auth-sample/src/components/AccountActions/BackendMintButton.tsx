import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import { useCallback, useState } from 'react'
import { useOpenfort } from '../../hooks/useOpenfort'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

const BackendMintButton: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { state } = useOpenfort()
  const [loading, setLoading] = useState(false)

  const mintNFT = useCallback(async (): Promise<string | null> => {
    const collectResponse = await fetch(`/api/protected-collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await openfort.getAccessToken()}`,
      },
    })

    if (!collectResponse.ok) {
      alert(`Failed to mint NFT status: ${collectResponse.status}`)
      return null
    }
    const collectResponseJSON = await collectResponse.json()

    const response = await openfort.proxy.sendSignatureTransactionIntentRequest(
      collectResponseJSON.transactionIntentId,
      collectResponseJSON.userOperationHash
    )
    return response?.response?.transactionHash ?? null
  }, [])

  const handleMintNFT = async () => {
    setLoading(true)
    const transactionHash = await mintNFT()
    setLoading(false)
    if (transactionHash) {
      handleSetMessage(`https://amoy.polygonscan.com/tx/${transactionHash}`)
    }
  }

  return (
    <div>
      <Button className="w-full" disabled={state !== EmbeddedState.READY} onClick={handleMintNFT} variant="outline">
        {loading ? <Loading /> : 'Mint NFT'}
      </Button>
    </div>
  )
}

export default BackendMintButton

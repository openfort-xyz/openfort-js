import type React from 'react'
import { useCallback, useId, useState } from 'react'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygonAmoy } from 'viem/chains'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'

const BackendMintButton: React.FC<{
  handleSetMessage: (message: string) => void
  sessionKey: `0x${string}` | null
  accountId: string | null
}> = ({ handleSetMessage, sessionKey, accountId }) => {
  const [loading, setLoading] = useState(false)
  const buttonId = useId()

  const mintNFT = useCallback(async (): Promise<string | null> => {
    if (!sessionKey || !accountId) {
      return null
    }
    const collectResponse = await fetch(`/api/protected-collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await openfort.getAccessToken()}`,
      },
      body: JSON.stringify({ account_id: accountId }),
    })

    if (!collectResponse.ok) {
      alert(`Failed to mint NFT status: ${collectResponse.status}`)
      return null
    }
    const collectResponseJSON = await collectResponse.json()
    const walletClient = createWalletClient({
      account: privateKeyToAccount(sessionKey),
      chain: polygonAmoy,
      transport: http(),
    })
    const signature = await walletClient.signMessage({
      message: { raw: collectResponseJSON.userOperationHash },
    })
    if (!signature) {
      throw new Error('Failed to sign message with session key')
    }

    const response = await openfort.proxy.sendSignatureTransactionIntentRequest(
      collectResponseJSON.transactionIntentId,
      null,
      signature
    )
    return response?.response?.transactionHash ?? null
  }, [sessionKey, accountId])

  const handleMintNFT = async () => {
    setLoading(true)
    const transactionHash = await mintNFT()
    setLoading(false)
    if (transactionHash) {
      handleSetMessage(`https://amoy.polygonscan.com/tx/${transactionHash}`)
    }
  }

  return (
    <div className="mt-4">
      <Button
        className="w-full"
        onClick={handleMintNFT}
        disabled={!sessionKey || !accountId}
        id={buttonId}
        data-testid="mint-nft-button"
        variant="outline"
      >
        {loading ? <Loading /> : 'Mint NFT with session key'}
      </Button>
      {!sessionKey && (
        <p className="text-red-400 text-xs mt-2">Create a session before minting an NFT signed with a session key.</p>
      )}
    </div>
  )
}

export default BackendMintButton

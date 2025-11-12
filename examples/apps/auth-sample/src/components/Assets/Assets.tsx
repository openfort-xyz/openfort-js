import type React from 'react'
import { useState } from 'react'
import { createWalletClient, custom } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { erc7811Actions } from 'viem/experimental'
import { useOpenfort } from '@/contexts/OpenfortContext'
import Loading from '../Loading'
import { Button } from '../ui/button'

const Assets: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { getEvmProvider, account } = useOpenfort()
  const [loading, setLoading] = useState(false)

  const handleGetAddress = async () => {
    try {
      setLoading(true)
      const provider = await getEvmProvider()
      if (!provider) {
        throw new Error('Failed to get EVM provider')
      }
      const client = createWalletClient({
        chain: polygonAmoy,
        transport: custom(provider),
      }).extend(erc7811Actions())

      const assets = await client.getAssets({
        account: account?.address as `0x${string}`,
        chainIds: [polygonAmoy.id],
      })
      console.log('Fetched assets:', assets)

      handleSetMessage(`Fetched Assets!`)
      setLoading(false)
    } catch (err) {
      console.error('Failed to send authorization:', err)
      alert('Failed to send authorization. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <p className="mb-1">Assets on the address</p>
        </div>
      </div>
      <Button className="w-full" onClick={handleGetAddress} variant="outline">
        {loading ? <Loading /> : 'Get assets'}
      </Button>
    </div>
  )
}

export default Assets

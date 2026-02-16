import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import { useEffect, useState } from 'react'
import { createPublicClient, createWalletClient, custom, encodeFunctionData, type WriteContractErrorType } from 'viem'
import { polygonAmoy } from 'viem/chains'
import type { BaseError } from 'wagmi'
import { useOpenfort } from '@/contexts/OpenfortContext'
import Loading from '../Loading'
import { Button } from '../ui/button'

const EIP1193MintButton: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { getEvmProvider, state } = useOpenfort()
  const [loading, setLoading] = useState(false)
  const [loadingBatch, setLoadingBatch] = useState(false)

  useEffect(() => {
    const initializeProvider = async () => {
      try {
        const provider = await getEvmProvider()
        if (!provider) {
          throw new Error('Failed to get EVM provider')
        }
        const walletClient = createWalletClient({
          chain: polygonAmoy,
          transport: custom(provider),
        })
        const [account] = await walletClient.getAddresses()
        handleSetMessage(`Current account address: ${account}`)
      } catch (error) {
        console.error('Error initializing provider:', error)
        handleSetMessage('Failed to initialize provider')
      }
    }

    initializeProvider()
  }, [getEvmProvider, handleSetMessage])

  const handleSendTransaction = async () => {
    try {
      const provider = await getEvmProvider()
      if (!provider) {
        throw new Error('Failed to get EVM provider')
      }

      setLoading(true)
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: custom(provider),
      })
      const walletClient = createWalletClient({
        chain: polygonAmoy,
        transport: custom(provider),
      })

      const erc721Address = '0xbabe0001489722187FbaF0689C47B2f5E97545C5'

      // Read more about [ABI Formats](https://docs.soliditylang.org/en/latest/abi-spec.html#json).
      const abi = [
        {
          inputs: [
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'mint',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ]

      const [account] = await walletClient.getAddresses()
      await walletClient.switchChain(polygonAmoy)

      const { request } = await publicClient.simulateContract({
        account,
        address: erc721Address,
        abi: abi,
        functionName: 'mint',
        args: ['0x64452Dff1180b21dc50033e1680bB64CDd492582', '1'],
      })

      let tx: `0x${string}`
      try {
        tx = await walletClient.writeContract(request)
        handleSetMessage(`https://amoy.polygonscan.com/tx/${tx}`)
      } catch (error) {
        const er = error as WriteContractErrorType
        handleSetMessage(`Failed to send transaction: ${er.cause}`)
      }
    } catch (error) {
      console.error('Error in handleSendTransaction:', error)
      handleSetMessage('Failed to get provider or send transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCalls = async () => {
    try {
      const provider = await getEvmProvider()
      if (!provider) {
        throw new Error('Failed to get EVM provider')
      }
      setLoadingBatch(true)
      const walletClient = createWalletClient({
        chain: polygonAmoy,
        transport: custom(provider),
      })

      const erc721Address = '0xbabe0001489722187FbaF0689C47B2f5E97545C5'

      // Read more about [ABI Formats](https://docs.soliditylang.org/en/latest/abi-spec.html#json).
      const abi = [
        {
          inputs: [
            {
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
          ],
          name: 'mint',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ]

      const [account] = await walletClient.getAddresses()

      try {
        const tx = await walletClient.sendCalls({
          account,
          calls: [
            {
              to: erc721Address,
              data: encodeFunctionData({
                abi,
                functionName: 'mint',
                args: ['0x64452Dff1180b21dc50033e1680bB64CDd492582', '1'],
              }),
            },
            {
              to: erc721Address,
              data: encodeFunctionData({
                abi,
                functionName: 'mint',
                args: ['0x64452Dff1180b21dc50033e1680bB64CDd492582', '1'],
              }),
            },
          ],
        })

        handleSetMessage(`Transaction ID: ${tx.id}`)
      } catch (error) {
        handleSetMessage(`Failed to send transaction: ${(error as BaseError).details}`)
      }
    } catch (error) {
      console.error('Error in handleSendCalls:', error)
      handleSetMessage('Failed to get provider or send batch calls')
    } finally {
      setLoadingBatch(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={state !== EmbeddedState.READY}
        onClick={handleSendTransaction}
        variant="outline"
      >
        {loading ? <Loading /> : 'Mint Token'}
      </Button>
      <Button className="w-full" disabled={state !== EmbeddedState.READY} onClick={handleSendCalls} variant="outline">
        {loadingBatch ? <Loading /> : 'Send batch calls'}
      </Button>
    </div>
  )
}

export default EIP1193MintButton

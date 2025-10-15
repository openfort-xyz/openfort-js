import { EmbeddedState } from '@openfort/openfort-js'
import { createSmartAccountClient } from 'permissionless'
import { to7702SimpleSmartAccount } from 'permissionless/accounts'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import type React from 'react'
import { useEffect, useState } from 'react'
import { type Address, createPublicClient, createWalletClient, type Hex, http, parseSignature, zeroAddress } from 'viem'
import { toAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { hashAuthorization, hashTypedData } from 'viem/utils'
import { useOpenfort } from '@/contexts/OpenfortContext'
import Loading from '../Loading'
import { Button } from '../ui/button'

const Authorizations7702: React.FC<{
  handleSetMessage: (message: string) => void
}> = ({ handleSetMessage }) => {
  const { signMessage, state, account } = useOpenfort()
  const [loading, setLoading] = useState(false)
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null)
  const [checkingDeployment, setCheckingDeployment] = useState(false)

  useEffect(() => {
    const checkDeploymentStatus = async () => {
      if (state !== EmbeddedState.READY || !account?.ownerAddress) {
        return
      }

      try {
        setCheckingDeployment(true)

        const client = createPublicClient({
          chain: sepolia,
          transport: http(),
        })

        const eoaAddress = (account?.ownerAddress ?? account?.address) as Address
        const code = await client.getCode({ address: eoaAddress })

        // If there's code at the address, the account is deployed as a smart account
        const deployed = code !== undefined && code !== '0x'
        setIsDeployed(deployed)
      } catch (err) {
        console.error('Failed to check deployment status:', err)
        setIsDeployed(null)
      } finally {
        setCheckingDeployment(false)
      }
    }

    checkDeploymentStatus()
  }, [state, account])

  const handleSignAuthorization = async () => {
    try {
      setLoading(true)
      const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_ID!

      const pimlicoClient = createPimlicoClient({
        chain: sepolia,
        transport: http(`https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoAPIKey}`),
      })
      const eoa7702 = toAccount({
        address: (account?.ownerAddress ?? account?.address) as Address,
        async signMessage({ message }) {
          console.log('Signing message:', message)
          return '0x'
        },
        async signTransaction(transaction) {
          console.log('Signing transaction:', transaction)
          return '0x'
        },
        async signTypedData(typedData) {
          console.log('Signing typed data:', typedData)
          return (
            await signMessage(hashTypedData(typedData), {
              arrayifyMessage: true,
              hashMessage: false,
            })
          ).data as `0x${string}`
        },
      })
      const client = createPublicClient({
        chain: sepolia,
        transport: http(),
      })
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: http(),
        account: eoa7702,
      })
      const simple7702Account = await to7702SimpleSmartAccount({
        client,
        owner: eoa7702,
      })
      const smartAccountClient = createSmartAccountClient({
        client,
        chain: sepolia,
        account: simple7702Account,
        paymaster: pimlicoClient,
        bundlerTransport: http(`https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoAPIKey}`),
      })

      const preAuthorization = await walletClient.prepareAuthorization({
        contractAddress: '0xe6Cae83BdE06E4c305530e199D7217f42808555B',
      })

      const message = hashAuthorization(preAuthorization)
      const signature = await signMessage(message, {
        arrayifyMessage: true,
        hashMessage: false,
      })
      const parsedSignature = parseSignature(signature.data as `0x${string}`)
      const isSmartAccountDeployed = await smartAccountClient.account.isDeployed()
      let transactionHash: Hex
      if (!isSmartAccountDeployed) {
        transactionHash = await smartAccountClient.sendTransaction({
          to: zeroAddress,
          value: BigInt(0),
          data: '0x',
          authorization: {
            ...preAuthorization,
            ...parsedSignature,
          },
        })
        handleSetMessage(
          `Smart Account Deployment Tx Hash: ${transactionHash}\nView on Etherscan: https://sepolia.etherscan.io/tx/${transactionHash}`
        )
        setIsDeployed(true)
      } else {
        handleSetMessage('Smart Account already deployed')
      }

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
          <p className="mb-1">
            This authorization is for deploying your smart account on the <strong>Sepolia testnet</strong>.
          </p>
          <div className="flex items-center gap-2">
            <span>Deployment Status:</span>
            {checkingDeployment ? (
              <span className="text-yellow-600">Checking...</span>
            ) : isDeployed === null ? (
              <span className="text-gray-500">Unknown</span>
            ) : isDeployed ? (
              <span className="text-green-600 font-semibold">✓ Deployed</span>
            ) : (
              <span className="text-orange-600 font-semibold">Not Deployed</span>
            )}
          </div>
        </div>
      </div>
      <Button
        className="w-full"
        onClick={handleSignAuthorization}
        disabled={state !== EmbeddedState.READY || isDeployed === true}
        variant="outline"
      >
        {loading ? <Loading /> : isDeployed ? 'Already Deployed' : 'Sign Authorization'}
      </Button>
    </div>
  )
}

export default Authorizations7702

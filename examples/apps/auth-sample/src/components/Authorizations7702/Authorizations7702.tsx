import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import { useEffect, useState } from 'react'
import { type Address, createPublicClient, createWalletClient, type Hex, http, parseSignature, zeroAddress } from 'viem'
import { createBundlerClient, createPaymasterClient, toSimple7702SmartAccount } from 'viem/account-abstraction'
import { type PrivateKeyAccount, toAccount } from 'viem/accounts'
import { hashAuthorization, hashTypedData } from 'viem/utils'
import { useOpenfort } from '@/contexts/OpenfortContext'
import { appChain, getExplorerTxUrl } from '@/utils/chainConfig'
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
          chain: appChain,
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
      const openfortKey = process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!
      const openfortRpcUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.openfort.io'}/rpc/${appChain.id}`
      const openfortTransport = http(openfortRpcUrl, {
        fetchOptions: {
          headers: { Authorization: `Bearer ${openfortKey}` },
        },
      })

      const openfortPaymaster = createPaymasterClient({
        transport: openfortTransport,
      })
      const eoa7702 = Object.assign(
        toAccount({
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
        }),
        {
          sign: async ({ hash }: { hash: Hex }) => {
            return (await signMessage(hash, { arrayifyMessage: true, hashMessage: false })).data as `0x${string}`
          },
          signAuthorization: async (authorization: any) => {
            const authHash = hashAuthorization(authorization)
            return (await signMessage(authHash, { arrayifyMessage: true, hashMessage: false })).data as `0x${string}`
          },
        }
      ) as unknown as PrivateKeyAccount
      const client = createPublicClient({
        chain: appChain,
        transport: http(),
      })
      const walletClient = createWalletClient({
        chain: appChain,
        transport: http(),
        account: eoa7702,
      })
      const simple7702Account = await toSimple7702SmartAccount({
        client,
        owner: eoa7702,
      })
      const bundlerClient = createBundlerClient({
        client,
        chain: appChain,
        account: simple7702Account,
        paymasterContext: {
          policyId: process.env.NEXT_PUBLIC_POLICY_ID,
        },
        paymaster: openfortPaymaster,
        transport: openfortTransport,
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
      const isSmartAccountDeployed = await bundlerClient.account.isDeployed()
      let transactionHash: Hex
      if (!isSmartAccountDeployed) {
        const userOpHash = await bundlerClient.sendUserOperation({
          calls: [{ to: zeroAddress, value: BigInt(0), data: '0x' }],
          authorization: {
            ...preAuthorization,
            ...parsedSignature,
          },
        })
        const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash })
        transactionHash = receipt.receipt.transactionHash
        handleSetMessage(
          `Smart Account Deployment Tx Hash: ${transactionHash}\nView on Explorer: ${getExplorerTxUrl(transactionHash)}`
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
            This authorization is for deploying your smart account on <strong>{appChain.name}</strong>.
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

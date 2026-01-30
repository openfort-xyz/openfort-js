import { EmbeddedState } from '@openfort/openfort-js'
import type React from 'react'
import { useCallback, useState } from 'react'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { useOpenfort } from '@/contexts/OpenfortContext'
import openfort from '../../utils/openfortConfig'
import Loading from '../Loading'
import { Button } from '../ui/button'
import BackendMintButton from './BackendMintButton'

const BackendCreateSessionButton: React.FC<{
  handleSetMessage: (message: string) => void
  setSessionKey: (sessionKey: `0x${string}` | null) => void
  sessionKey: `0x${string}` | null
}> = ({ handleSetMessage, setSessionKey, sessionKey }) => {
  const { state, signMessage, account } = useOpenfort()
  const [loading, setLoading] = useState(false)

  const createSession = useCallback(async (): Promise<{
    address: `0x${string}`
    privateKey: `0x${string}`
  } | null> => {
    if (!account?.id) {
      alert('No account available')
      return null
    }
    const sessionKey = generatePrivateKey()
    const accountSession = privateKeyToAccount(sessionKey).address

    const sessionResponse = await fetch(`/api/protected-create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await openfort.getAccessToken()}`,
      },
      body: JSON.stringify({
        account_id: account.id,
        sessionDuration: document.querySelector('input[name="session-method"]:checked')?.id,
        sessionAddress: accountSession,
      }),
    })

    if (!sessionResponse.ok) {
      alert(`Failed to create session: ${sessionResponse.status}`)
      return null
    }
    const sessionResponseJSON = await sessionResponse.json()

    if (sessionResponseJSON.data?.nextAction) {
      const signature = await signMessage(sessionResponseJSON.data?.nextAction.payload.userOperationHash, {
        hashMessage: true,
        arrayifyMessage: true,
      })
      if (signature?.error) {
        throw new Error(`Failed to sign message. ${signature?.error}`)
      }
      const response = await openfort.proxy.sendSignatureSessionRequest(
        sessionResponseJSON.data.id,
        signature.data as string
      )
      if (!response?.isActive) {
        throw new Error('Session key registration failed')
      }
      setSessionKey(sessionKey)
      const accountAddress = privateKeyToAccount(sessionKey).address
      return { address: accountAddress, privateKey: sessionKey }
    }
    return null
  }, [setSessionKey, signMessage, account?.id])

  const revokeSession = useCallback(async (): Promise<string | null> => {
    if (!sessionKey || !account?.id) {
      return null
    }
    const sessionSigner = privateKeyToAccount(sessionKey)

    const revokeResponse = await fetch(`/api/protected-revoke-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await openfort.getAccessToken()}`,
      },
      body: JSON.stringify({
        account_id: account.id,
        sessionAddress: sessionSigner.address,
      }),
    })

    if (!revokeResponse.ok) {
      alert(`Failed to revoke session: ${revokeResponse.status}`)
      return null
    }
    const revokeResponseJSON = await revokeResponse.json()

    if (revokeResponseJSON.data?.nextAction) {
      const signature = await signMessage(revokeResponseJSON.data?.nextAction.payload.userOperationHash, {
        hashMessage: true,
        arrayifyMessage: true,
      })
      if (signature?.error) {
        throw new Error(`Failed to sign message. ${signature?.error}`)
      }
      const response = await openfort.proxy.sendSignatureSessionRequest(
        revokeResponseJSON.data.id,
        signature.data as string
      )
      return response?.id ?? null
    } else {
      return revokeResponseJSON.response?.transactionHash
    }
  }, [sessionKey, signMessage, account?.id])

  const handleCreateSession = async () => {
    setLoading(true)
    const session = await createSession()
    setLoading(false)
    if (session) {
      handleSetMessage(
        `Session key registered successfully:\n   Address: ${session.address}\n   Private Key: ${session.privateKey}`
      )
    }
  }

  const handleRevokeSession = async () => {
    setLoading(true)
    const session = await revokeSession()
    setLoading(false)
    if (session) {
      setSessionKey(null)
      handleSetMessage(`Session key revoked successfully`)
    }
  }

  return (
    <div>
      <Button
        className="w-full"
        disabled={state !== EmbeddedState.READY}
        onClick={sessionKey !== null ? handleRevokeSession : handleCreateSession}
        variant="outline"
      >
        {loading ? <Loading /> : sessionKey !== null ? 'Revoke session' : 'Create session'}
      </Button>
      <BackendMintButton
        handleSetMessage={handleSetMessage}
        sessionKey={sessionKey as `0x${string}`}
        accountId={account?.id ?? null}
      />
    </div>
  )
}

export default BackendCreateSessionButton

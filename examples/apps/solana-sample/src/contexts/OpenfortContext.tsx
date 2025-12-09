import {
  AccountTypeEnum,
  type AuthPlayerResponse,
  ChainTypeEnum,
  type EmbeddedAccount,
  EmbeddedState,
  type RecoveryParams,
} from '@openfort/openfort-js'
import type { Address } from '@solana/kit'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { openfort } from '../openfort'

interface ContextType {
  state: EmbeddedState
  account: EmbeddedAccount | null
  accounts: EmbeddedAccount[]
  user: AuthPlayerResponse | null
  isLoadingAccounts: boolean
  solanaAddress: Address | null
  refetchAccount: () => Promise<void>
  refetchAccounts: () => Promise<void>
  refetchUser: () => Promise<void>
  createAccount: (recoveryParams: RecoveryParams) => Promise<EmbeddedAccount>
  recoverAccount: (accountId: string, recoveryParams: RecoveryParams) => Promise<EmbeddedAccount>
  signMessage: (message: string | Uint8Array) => Promise<{ data?: string; error?: Error }>
  exportPrivateKey: () => Promise<{ data?: string; error?: Error }>
  logout: () => Promise<void>
  getEncryptionSession: () => Promise<string>
}

const OpenfortContext = createContext<ContextType | null>(null)

export function useOpenfort() {
  const context = useContext(OpenfortContext)
  if (!context) {
    throw new Error('useOpenfort must be used inside the OpenfortProvider')
  }
  return context
}

export const OpenfortProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<EmbeddedState>(EmbeddedState.NONE)
  const [account, setAccount] = useState<EmbeddedAccount | null>(null)
  const [accounts, setAccounts] = useState<EmbeddedAccount[]>([])
  const [user, setUser] = useState<AuthPlayerResponse | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [solanaAddress, setSolanaAddress] = useState<Address | null>(null)
  const poller = useRef<NodeJS.Timeout | null>(null)

  // Poll embedded state every 300ms
  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const currentState = await openfort.embeddedWallet.getEmbeddedState()
        setState(currentState)
      } catch (err) {
        console.error('Error checking embedded state:', err)
        if (poller.current) clearInterval(poller.current)
      }
    }

    poller.current = setInterval(pollEmbeddedState, 300)

    return () => {
      if (poller.current) clearInterval(poller.current)
    }
  }, [])

  const getEncryptionSession = useCallback(async (): Promise<string> => {
    try {
      // This application is using the backend of another sample in this repository.
      // You can find the source code for the backend in the auth-sample
      const response = await fetch('https://create-next-app.openfort.io/api/protected-create-encryption-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.session
    } catch (error) {
      console.error('Error creating encryption session:', error)
      throw error
    }
  }, [])

  const refetchUser = useCallback(async () => {
    try {
      const fetchedUser = await openfort.user.get()
      setUser(fetchedUser)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }, [])

  const refetchAccount = useCallback(async () => {
    try {
      const fetchedAccount = await openfort.embeddedWallet.get()
      setAccount(fetchedAccount)

      // Derive the Solana address from the private key
      // This is necessary because Openfort's address format doesn't directly map to Solana's base58 format
      if (fetchedAccount?.address) {
        try {
          const privateKey = await openfort.embeddedWallet.exportPrivateKey()
          const { Base58 } = await import('ox')
          const privateKeyBytes = Base58.toBytes(privateKey)

          // Create a Kit signer from the private key to derive the correct Solana address
          const { createKeyPairSignerFromPrivateKeyBytes } = await import('@solana/kit')
          const kitSigner = await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes.slice(0, 32))

          setSolanaAddress(kitSigner.address)
        } catch (error) {
          console.error('Error deriving address from private key:', error)
          setSolanaAddress(null)
        }
      }
    } catch (error) {
      console.error('Error fetching account:', error)
    }
  }, [])

  const refetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    try {
      const fetchedAccounts = await openfort.embeddedWallet.list({
        accountType: AccountTypeEnum.EOA,
        chainType: ChainTypeEnum.SVM,
        limit: 100,
      })
      setAccounts(fetchedAccounts)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [])

  // Handle state changes
  useEffect(() => {
    if (state === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
      setAccount(null)
      setSolanaAddress(null)
      refetchUser()
      refetchAccounts()
    } else if (state === EmbeddedState.READY) {
      refetchUser()
      refetchAccount()
      refetchAccounts()
    } else if (state === EmbeddedState.UNAUTHENTICATED) {
      setAccount(null)
      setAccounts([])
      setUser(null)
      setSolanaAddress(null)
    }
  }, [state, refetchUser, refetchAccount, refetchAccounts])

  const createAccount = useCallback(
    async (recoveryParams: RecoveryParams): Promise<EmbeddedAccount> => {
      try {
        const newAccount = await openfort.embeddedWallet.create({
          accountType: AccountTypeEnum.EOA,
          chainType: ChainTypeEnum.SVM,
          recoveryParams,
        })
        setAccount(newAccount)

        // Derive the Solana address from the private key
        await refetchAccount()
        await refetchAccounts()
        return newAccount
      } catch (error) {
        console.error('Error creating account:', error)
        throw error
      }
    },
    [refetchAccount, refetchAccounts]
  )

  const recoverAccount = useCallback(
    async (accountId: string, recoveryParams: RecoveryParams): Promise<EmbeddedAccount> => {
      try {
        const recoveredAccount = await openfort.embeddedWallet.recover({
          account: accountId,
          recoveryParams,
        })
        setAccount(recoveredAccount)

        // Derive the Solana address from the private key
        await refetchAccount()
        await refetchAccounts()
        return recoveredAccount
      } catch (error) {
        console.error('Error recovering account:', error)
        throw error
      }
    },
    [refetchAccount, refetchAccounts]
  )

  const signMessage = useCallback(async (message: string | Uint8Array): Promise<{ data?: string; error?: Error }> => {
    try {
      // For Solana, we need to sign the raw message bytes without hashing
      // hashMessage: false disables the default keccak256 hashing used for EVM chains
      const signature = await openfort.embeddedWallet.signMessage(message, {
        hashMessage: false,
      })
      return { data: signature }
    } catch (err) {
      console.error('Error signing message:', err)
      return {
        error: err instanceof Error ? err : new Error('An error occurred signing the message'),
      }
    }
  }, [])

  const exportPrivateKey = useCallback(async (): Promise<{
    data?: string
    error?: Error
  }> => {
    try {
      const privateKey = await openfort.embeddedWallet.exportPrivateKey()
      return { data: privateKey }
    } catch (err) {
      console.error('Error exporting private key:', err)
      return {
        error: err instanceof Error ? err : new Error('An error occurred exporting the private key'),
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await openfort.auth.logout()
    } catch (err) {
      console.error('Error logging out:', err)
      throw err instanceof Error ? err : new Error('An error occurred during logout')
    }
  }, [])

  const contextValue: ContextType = {
    state,
    account,
    accounts,
    user,
    isLoadingAccounts,
    solanaAddress,
    refetchAccount,
    refetchAccounts,
    refetchUser,
    createAccount,
    recoverAccount,
    signMessage,
    exportPrivateKey,
    logout,
    getEncryptionSession,
  }

  return <OpenfortContext.Provider value={contextValue}>{children}</OpenfortContext.Provider>
}

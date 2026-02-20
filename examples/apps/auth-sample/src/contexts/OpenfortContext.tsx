import {
  AccountTypeEnum,
  ChainTypeEnum,
  type EmbeddedAccount,
  EmbeddedState,
  type Provider,
  type RecoveryParams,
  type TypedDataPayload,
} from '@openfort/openfort-js'
import axios from 'axios'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { type Chain, createPublicClient, custom } from 'viem'
import type { Address } from 'viem/accounts'
import { polygonAmoy } from 'viem/chains'
import openfort from '../utils/openfortConfig'

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

interface ContextType {
  state: EmbeddedState
  getEvmProvider: () => Promise<Provider>
  handleRecovery: ({
    account,
    recoveryParams,
  }: {
    account: string
    recoveryParams: RecoveryParams
  }) => Promise<EmbeddedAccount>
  exportPrivateKey: () => Promise<{ data?: string; error?: Error }>
  signMessage: (
    message: string,
    options?: { hashMessage: boolean; arrayifyMessage: boolean }
  ) => Promise<{ data?: string; error?: Error }>
  signTypedData: (
    domain: TypedDataPayload['domain'],
    types: TypedDataPayload['types'],
    message: TypedDataPayload['message']
  ) => Promise<{ data?: string; error?: Error }>
  logout: () => Promise<void>
  getEOAAddress: () => Promise<string>
  getBalance: (address: Address, chain: Chain, provider: Provider) => Promise<bigint>
  account: EmbeddedAccount | null
  getEncryptionSession: (otpCode?: string) => Promise<string>
  requestOTP: (contact: { email?: string; phone?: string }, dangerouslySkipVerification: boolean) => Promise<void>
  accounts: EmbeddedAccount[]
  isLoadingAccounts: boolean
  refetchAccounts: () => Promise<void>
  refetchAccount: () => Promise<void>
  createWallet: ({ recoveryParams }: { recoveryParams: RecoveryParams }) => Promise<EmbeddedAccount>
  setRecoveryMethod: (previousRecovery: RecoveryParams, newRecovery: RecoveryParams) => Promise<void>
  getUserEmail: () => string | null
}

const OpenfortContext = createContext<ContextType | null>(null)

export function useOpenfort() {
  const context = useContext(OpenfortContext)
  if (!context) {
    throw new Error('useOpenfort must be used inside the OpenfortProvider')
  }
  return context
}

export const OpenfortProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const [state, setState] = useState<EmbeddedState>(EmbeddedState.NONE)
  const poller = useRef<NodeJS.Timeout | null>(null)

  const getEncryptionSession = async (otpCode?: string): Promise<string> => {
    try {
      const requestBody: { otp_code?: string; user_id?: any } = otpCode ? { otp_code: otpCode } : {}
      const user = await openfort.user.get()
      requestBody.user_id = user.id
      const response = await axios.post<{ session: string }>('/api/protected-create-encryption-session', requestBody, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status < 500, // Don't throw for 4xx codes
      })

      if (response.status === 428) {
        throw new Error('OTP_REQUIRED')
      }

      return response.data.session
    } catch (error) {
      if (error instanceof Error && error.message === 'OTP_REQUIRED') {
        throw error
      }
      throw new Error(`Failed to create encryption session: ${error}`)
    }
  }

  const requestOTP = async (
    contact: { email?: string; phone?: string },
    dangerouslySkipVerification: boolean
  ): Promise<void> => {
    console.log(
      'requestOTP function called with contact:',
      contact,
      'dangerouslySkipVerification:',
      dangerouslySkipVerification
    )
    try {
      const user = await openfort.user.get()

      if (!user) throw new Error('User not found')

      if ((!contact.email && !contact.phone) || (contact.email && contact.phone)) {
        throw new Error('Please provide either email or phone number, not both')
      }

      const response = await axios.post(
        '/api/request-otp',
        {
          user_id: user.id,
          email: contact.email || null,
          phone: contact.phone || null,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500, // Don't throw for 4xx codes
        }
      )

      if (response.data.error === 'OTP_RATE_LIMIT') {
        throw new Error(response.data.error)
      } else if (response.data.error === 'USER_CONTACTS_MISMATCH') {
        throw new Error(response.data.error)
      } else if (response.status !== 200) {
        throw new Error(`OTP request failed with status: ${response.status}`)
      }

      // Success - API returns 200 with empty body
    } catch (error) {
      console.error('Error in requestOTP:', error)
      throw error
    }
  }

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const currentState = await openfort.embeddedWallet.getEmbeddedState()
        setState(currentState)
      } catch (err) {
        console.error('Error checking embedded state with Openfort:', err)
        if (poller.current) clearInterval(poller.current)
      }
    }

    poller.current = setInterval(pollEmbeddedState, 300)

    return () => {
      if (poller.current) clearInterval(poller.current)
    }
  }, [])

  // Account
  const [account, setAccount] = useState<EmbeddedAccount | null>(null)
  const [accounts, setAccounts] = useState<EmbeddedAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

  const refetchAccount = useCallback(async () => {
    const account = await openfort.embeddedWallet.get()
    setAccount(account)
  }, [])

  const refetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    const accounts = await openfort.embeddedWallet.list({
      chainId: chainId,
    })
    setAccounts(accounts)
    setIsLoadingAccounts(false)
  }, [])

  useEffect(() => {
    if (state === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
      setAccount(null)
      refetchAccounts()
    } else if (state === EmbeddedState.READY) {
      refetchAccount()
      refetchAccounts()
    } else if (state === EmbeddedState.UNAUTHENTICATED) {
      setAccount(null)
      setAccounts([])
    }
  }, [state, refetchAccount, refetchAccounts])

  const getEvmProvider = useCallback(async (): Promise<Provider> => {
    const externalProvider = await openfort.embeddedWallet.getEthereumProvider({
      policy: process.env.NEXT_PUBLIC_POLICY_ID,
      chains: {
        [polygonAmoy.id]: 'https://polygon-amoy-bor-rpc.publicnode.com',
      },
    })
    if (!externalProvider) {
      throw new Error('EVM provider is undefined')
    }
    return externalProvider as Provider
  }, [])

  const signMessage = useCallback(
    async (
      message: string,
      options?: { hashMessage: boolean; arrayifyMessage: boolean }
    ): Promise<{ data?: string; error?: Error }> => {
      try {
        const data = await openfort.embeddedWallet.signMessage(message, options)
        return { data }
      } catch (err) {
        console.error('Error signing message:', err)
        return {
          error: err instanceof Error ? err : new Error('An error occurred signing the message'),
        }
      }
    },
    []
  )

  const exportPrivateKey = useCallback(async (): Promise<{
    data?: string
    error?: Error
  }> => {
    try {
      const data = await openfort.embeddedWallet.exportPrivateKey()
      return { data }
    } catch (err) {
      console.error('Error exporting private key:', err)
      return {
        error: err instanceof Error ? err : new Error('An error occurred exporting the private key'),
      }
    }
  }, [])

  const signTypedData = useCallback(
    async (
      domain: TypedDataPayload['domain'],
      types: TypedDataPayload['types'],
      message: TypedDataPayload['message']
    ): Promise<{ data?: string; error?: Error }> => {
      try {
        const data = await openfort.embeddedWallet.signTypedData(domain, types, message)
        return { data }
      } catch (err) {
        console.error('Error signing typed data:', err)
        return {
          error: err instanceof Error ? err : new Error('An error occurred signing the typed data'),
        }
      }
    },
    []
  )

  const handleRecovery = useCallback(
    async ({ account, recoveryParams }: { account: string; recoveryParams: RecoveryParams }) => {
      const response = await openfort.embeddedWallet.recover({
        recoveryParams,
        account,
      })
      refetchAccounts()
      setAccount(response)
      return response
    },
    [refetchAccounts]
  )

  const logout = useCallback(async () => {
    try {
      await openfort.auth.logout()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userEmail')
      }
    } catch (err) {
      console.error('Error logging out with Openfort:', err)
      throw err instanceof Error ? err : new Error('An error occurred during logout')
    }
  }, [])

  const getEOAAddress = useCallback(async () => {
    try {
      const account = await openfort.embeddedWallet.get()
      return account.ownerAddress as `0x${string}`
    } catch (err) {
      console.error('Error obtaining EOA Address with Openfort:', err)
      throw err instanceof Error ? err : new Error('An error occurred obtaining the EOA Address')
    }
  }, [])

  const getBalance = useCallback(async (address: Address, chain: Chain, provider: Provider) => {
    try {
      const publicClient = createPublicClient({
        chain,
        transport: custom(provider),
      })
      return await publicClient.getBalance({ address })
    } catch (err) {
      console.error('Error obtaining Wallet Balance with Openfort:', err)
      throw err instanceof Error ? err : new Error('An error occurred obtaining the Wallet Balance')
    }
  }, [])

  const createWallet = useCallback(
    async ({ recoveryParams }: { recoveryParams: RecoveryParams }) => {
      const user = await openfort.user.get()
      if (!user) throw new Error('User not found')

      if (user.email === 'testing@fort.dev') {
        throw new Error('Test user should not create wallets.')
      }

      const response = await openfort.embeddedWallet.create({
        accountType: AccountTypeEnum.SMART_ACCOUNT,
        chainType: ChainTypeEnum.EVM,
        recoveryParams,
        chainId,
      })
      setAccount(response)
      await refetchAccounts()
      return response
    },
    [refetchAccounts]
  )

  const setRecoveryMethod = useCallback(
    async (previousRecovery: RecoveryParams, newRecovery: RecoveryParams) => {
      await openfort.embeddedWallet.setRecoveryMethod(previousRecovery, newRecovery)
      await refetchAccount()
      await refetchAccounts()
    },
    [refetchAccount, refetchAccounts]
  )

  const getUserEmail = useCallback((): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userEmail')
    }
    return null
  }, [])

  const contextValue: ContextType = {
    state,
    getEncryptionSession,
    requestOTP,
    getEvmProvider,
    handleRecovery,
    signMessage,
    exportPrivateKey,
    signTypedData,
    logout,
    getEOAAddress,
    getBalance,
    account,
    refetchAccount,
    accounts,
    isLoadingAccounts,
    refetchAccounts,
    createWallet,
    setRecoveryMethod,
    getUserEmail,
  }

  return <OpenfortContext.Provider value={contextValue}>{children}</OpenfortContext.Provider>
}

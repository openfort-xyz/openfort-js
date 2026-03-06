import { type Address, address } from '@solana/kit'
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'
import { useCallback, useEffect, useId, useState } from 'react'
import TransactionHistory from './components/TransactionHistory'
import { useOpenfort } from './contexts/OpenfortContext'
import { type KoraConfig, sendGaslessSolTransaction } from './utils/kora'
import { rpc } from './utils/rpc'
import { sendSolanaTransaction, type TokenType, USDC_MINT } from './utils/transaction'

const koraConfig: KoraConfig = {
  rpcUrl: 'https://api.openfort.io/rpc/solana/devnet',
  apiKey: `Bearer ${import.meta.env.VITE_PROJECT_PUBLISHABLE_KEY}`,
}

// Validate Solana address format (base58, 32-44 characters)
function isValidSolanaAddress(addr: string): boolean {
  try {
    address(addr)
    return true
  } catch {
    return false
  }
}

const CustomSolanaWallet = ({ publicKey }: { publicKey: Address }) => {
  const { signMessage } = useOpenfort()
  const recipientId = useId()
  const amountId = useId()
  const tokenId = useId()
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<TokenType>('SOL')
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [sendingTransaction, setSendingTransaction] = useState<boolean>(false)
  const [sendingGasless, setSendingGasless] = useState<boolean>(false)
  const [txRefreshTrigger, setTxRefreshTrigger] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    recipient?: string
    amount?: string
  }>({})

  const fetchBalances = useCallback(async (publicKey: Address) => {
    try {
      // Fetch SOL balance
      const { value: balanceInLamports } = await rpc.getBalance(publicKey, { commitment: 'confirmed' }).send()
      setSolBalance(Number(balanceInLamports) / 1e9)

      // Fetch USDC balance using getTokenAccountBalance
      const [usdcTokenAccount] = await findAssociatedTokenPda({
        mint: USDC_MINT,
        owner: publicKey,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      try {
        const { value: tokenBalance } = await rpc.getTokenAccountBalance(usdcTokenAccount).send()
        setUsdcBalance(Number(tokenBalance.uiAmount))
      } catch {
        // Token account doesn't exist yet
        setUsdcBalance(0)
      }
    } catch (error) {
      console.error('Failed to fetch balances', error)
      setSolBalance(null)
      setUsdcBalance(null)
    }
  }, [])

  useEffect(() => {
    fetchBalances(publicKey)
  }, [publicKey, fetchBalances])

  const getCurrentBalance = (): number | null => {
    return selectedToken === 'SOL' ? solBalance : usdcBalance
  }

  const validateForm = (): boolean => {
    const errors: { recipient?: string; amount?: string } = {}

    // Validate recipient address
    if (!recipient.trim()) {
      errors.recipient = 'Recipient address is required'
    } else if (!isValidSolanaAddress(recipient)) {
      errors.recipient = 'Invalid Solana address format'
    }

    // Validate amount
    if (!amount.trim()) {
      errors.amount = 'Amount is required'
    } else {
      const amountNum = parseFloat(amount)
      if (Number.isNaN(amountNum)) {
        errors.amount = 'Amount must be a valid number'
      } else if (amountNum <= 0) {
        errors.amount = 'Amount must be greater than 0'
      } else {
        const balance = getCurrentBalance()
        if (balance !== null && amountNum > balance) {
          errors.amount = `Insufficient ${selectedToken} balance`
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isSending = sendingTransaction || sendingGasless

  const handleSignMessage = async (message: Uint8Array) => {
    const { data, error } = await signMessage(message)
    if (error) throw error
    return data || ''
  }

  const handleTransactionSuccess = async (signature: string) => {
    setTransactionSignature(signature)
    setTxRefreshTrigger((prev) => prev + 1)
    await fetchBalances(publicKey)
    setRecipient('')
    setAmount('')
  }

  const sendTransaction = async () => {
    setError(null)
    setTransactionSignature(null)
    if (!validateForm()) return

    setSendingTransaction(true)
    try {
      const { signature } = await sendSolanaTransaction({
        from: publicKey,
        to: address(recipient),
        amount: parseFloat(amount),
        token: selectedToken,
        signMessage: handleSignMessage,
      })
      await handleTransactionSuccess(signature)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setSendingTransaction(false)
    }
  }

  const sendGaslessTransaction = async () => {
    setError(null)
    setTransactionSignature(null)
    if (!validateForm()) return

    setSendingGasless(true)
    try {
      const { signature } = await sendGaslessSolTransaction({
        from: publicKey,
        to: address(recipient),
        amount: parseFloat(amount),
        token: selectedToken,
        signMessage: handleSignMessage,
        koraConfig,
      })
      await handleTransactionSuccess(signature)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setSendingGasless(false)
    }
  }

  const formatBalance = (balance: number | null, token: TokenType): string => {
    if (balance === null) return 'Loading...'
    return token === 'SOL' ? `${balance.toFixed(4)} SOL` : `${balance.toFixed(2)} USDC`
  }

  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Solana Wallet</h2>
        {publicKey ? (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="break-all text-sm md:text-base">
                <span className="text-gray-400">Public Key:</span>
                <a
                  href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline ml-2 font-mono"
                >
                  {publicKey}
                </a>
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p
                className="cursor-pointer text-sm md:text-base"
                onClick={() => {
                  setSolBalance(null)
                  setUsdcBalance(null)
                  fetchBalances(publicKey)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSolBalance(null)
                    setUsdcBalance(null)
                    fetchBalances(publicKey)
                  }
                }}
              >
                <span className="text-gray-400">Balances:</span>
                <span className="text-green-400 ml-2 font-semibold">
                  {formatBalance(solBalance, 'SOL')} | {formatBalance(usdcBalance, 'USDC')}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-4 pt-4">
              <h3 className="text-lg font-semibold text-gray-300">Send Transaction</h3>
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <label htmlFor={recipientId} className="block text-sm font-medium text-gray-400 mb-2">
                    Recipient Address
                  </label>
                  <input
                    id={recipientId}
                    type="text"
                    placeholder="Enter Solana address"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value)
                      setValidationErrors({
                        ...validationErrors,
                        recipient: undefined,
                      })
                    }}
                    className={`w-full ${validationErrors.recipient ? 'border-red-500' : ''}`}
                    disabled={isSending}
                  />
                  {validationErrors.recipient && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.recipient}</p>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-1/3">
                    <label htmlFor={tokenId} className="block text-sm font-medium text-gray-400 mb-2">
                      Token
                    </label>
                    <select
                      id={tokenId}
                      value={selectedToken}
                      onChange={(e) => {
                        setSelectedToken(e.target.value as TokenType)
                        setValidationErrors({
                          ...validationErrors,
                          amount: undefined,
                        })
                      }}
                      className="w-full"
                      disabled={isSending}
                    >
                      <option value="SOL">SOL</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                  <div className="w-full md:w-2/3">
                    <label htmlFor={amountId} className="block text-sm font-medium text-gray-400 mb-2">
                      Amount ({selectedToken})
                    </label>
                    <input
                      id={amountId}
                      type="number"
                      step={selectedToken === 'SOL' ? '0.0001' : '0.01'}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setValidationErrors({
                          ...validationErrors,
                          amount: undefined,
                        })
                      }}
                      className={`w-full ${validationErrors.amount ? 'border-red-500' : ''}`}
                      disabled={isSending}
                    />
                    {validationErrors.amount && <p className="text-red-500 text-sm mt-1">{validationErrors.amount}</p>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={sendTransaction}
                    disabled={isSending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded font-semibold"
                  >
                    {sendingTransaction ? 'Sending...' : `Send ${selectedToken}`}
                  </button>
                  <button
                    type="button"
                    onClick={sendGaslessTransaction}
                    disabled={isSending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded font-semibold"
                  >
                    {sendingGasless ? 'Sending...' : `Send ${selectedToken} (Gasless)`}
                  </button>
                </div>
                {error && (
                  <div className="bg-red-900/30 border border-red-500 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
            {transactionSignature && (
              <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-green-400 font-semibold mb-2">Transaction Successful!</p>
                    <p className="text-sm text-gray-300 break-all">
                      <span className="text-gray-400">Signature:</span>
                      <a
                        className="ml-2 text-blue-400 hover:text-blue-300 underline font-mono"
                        href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {transactionSignature}
                      </a>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransactionSignature(null)}
                    className="text-gray-400 hover:text-white ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            <TransactionHistory address={publicKey} refreshTrigger={txRefreshTrigger} />
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">Public key not found</p>
        )}
      </div>
    </div>
  )
}

export default CustomSolanaWallet

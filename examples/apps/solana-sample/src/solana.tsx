import { type Address, address, createSolanaRpc } from '@solana/kit'
import { useCallback, useEffect, useId, useState } from 'react'
import TransactionHistory from './components/TransactionHistory'
import { useOpenfort } from './contexts/OpenfortContext'
import { sendSolanaTransaction } from './utils/transaction'

const rpc = createSolanaRpc('https://api.devnet.solana.com')

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
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [balance, setBalance] = useState<number | null>(null)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [sendingTransaction, setSendingTransaction] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ recipient?: string; amount?: string }>({})

  const fetchBalance = useCallback(async (publicKey: Address) => {
    try {
      const { value: balanceInLamports } = await rpc.getBalance(publicKey).send()
      setBalance(Number(balanceInLamports) / 1e9) // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to fetch balance', error)
    }
  }, [])

  useEffect(() => {
    fetchBalance(publicKey)
  }, [publicKey, fetchBalance])

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
      } else if (balance !== null && amountNum > balance) {
        errors.amount = 'Insufficient balance'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const sendTransaction = async () => {
    // Clear previous error and signature
    setError(null)
    setTransactionSignature(null)

    // Validate form
    if (!validateForm()) {
      return
    }

    const recipientAddress = address(recipient)
    const amountInSol = parseFloat(amount)

    setSendingTransaction(true)
    try {
      const result = await sendSolanaTransaction({
        from: publicKey,
        to: recipientAddress,
        amountInSol,
        signMessage: async (message) => {
          const { data, error } = await signMessage(message)
          if (error) throw error
          return data || ''
        },
      })

      if (result.success) {
        console.log('Transaction signature:', result.signature)
        setTransactionSignature(result.signature)

        // Refresh balance after successful transaction
        await fetchBalance(publicKey)
        // Clear form
        setRecipient('')
        setAmount('')
      } else {
        const errorMsg = result.error || 'Transaction failed'
        setError(errorMsg)
        console.error('Transaction failed:', result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      console.error('Transaction failed', error)
    } finally {
      setSendingTransaction(false)
    }
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
                  setBalance(null)
                  fetchBalance(publicKey)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setBalance(null)
                    fetchBalance(publicKey)
                  }
                }}
              >
                <span className="text-gray-400">Balance:</span>
                <span className="text-green-400 ml-2 font-semibold">
                  {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
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
                      setValidationErrors({ ...validationErrors, recipient: undefined })
                    }}
                    className={`w-full ${validationErrors.recipient ? 'border-red-500' : ''}`}
                    disabled={sendingTransaction}
                  />
                  {validationErrors.recipient && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.recipient}</p>
                  )}
                </div>
                <div className="w-full md:w-1/2">
                  <label htmlFor={amountId} className="block text-sm font-medium text-gray-400 mb-2">
                    Amount (SOL)
                  </label>
                  <input
                    id={amountId}
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      setValidationErrors({ ...validationErrors, amount: undefined })
                    }}
                    className={`w-full ${validationErrors.amount ? 'border-red-500' : ''}`}
                    disabled={sendingTransaction}
                  />
                  {validationErrors.amount && <p className="text-red-500 text-sm mt-1">{validationErrors.amount}</p>}
                </div>
                <button
                  type="button"
                  onClick={sendTransaction}
                  disabled={sendingTransaction}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold"
                >
                  {sendingTransaction ? 'Sending...' : 'Send SOL'}
                </button>
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
            <TransactionHistory address={publicKey} />
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">Public key not found</p>
        )}
      </div>
    </div>
  )
}

export default CustomSolanaWallet

import type { Address } from '@solana/kit'
import { useCallback, useEffect, useState } from 'react'
import { getTransactionHistory, type TransactionHistoryItem } from '../utils/transactionHistory'

interface TransactionHistoryProps {
  address: Address
}

export default function TransactionHistory({ address }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const history = await getTransactionHistory(address, 20)
      setTransactions(history)
    } catch (error) {
      console.error('Error fetching transaction history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (showHistory && transactions.length === 0) {
      fetchHistory()
    }
  }, [showHistory, transactions.length, fetchHistory])

  return (
    <div className="w-full max-w-4xl mt-6">
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          {showHistory ? '▼' : '▶'} Transaction History {transactions.length > 0 && `(${transactions.length})`}
        </button>
        {showHistory && (
          <button
            type="button"
            onClick={fetchHistory}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-sm disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {showHistory &&
        (isLoading && transactions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Loading transaction history...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No transactions found</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((tx) => {
              const errorMessage = tx.err
                ? typeof tx.err === 'object'
                  ? JSON.stringify(tx.err)
                  : String(tx.err)
                : null

              return (
                <div
                  key={tx.signature}
                  className={`bg-gray-800 rounded-lg p-3 border ${tx.err ? 'border-red-600' : 'border-green-600'}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Status:</span>{' '}
                      <span className={tx.err ? 'text-red-400' : 'text-green-400'}>
                        {tx.err ? 'Failed' : 'Success'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Slot:</span> <span>{tx.slot.toString()}</span>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-400">Signature:</span>{' '}
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        {tx.signature}
                      </a>
                    </div>
                    {tx.blockTime && (
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-gray-400">Time:</span>{' '}
                        <span className="text-xs">{new Date(Number(tx.blockTime) * 1000).toLocaleString()}</span>
                      </div>
                    )}
                    {tx.memo && (
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-gray-400">Memo:</span> <span className="text-xs">{tx.memo}</span>
                      </div>
                    )}
                    {errorMessage && (
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-gray-400">Error:</span>{' '}
                        <span className="text-red-400 text-xs">{errorMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}

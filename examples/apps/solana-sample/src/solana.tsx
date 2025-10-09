import {
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  sendAndConfirmRawTransaction,
  Transaction,
} from '@solana/web3.js'
import { Base58 } from 'ox'
import { type CSSProperties, useCallback, useEffect, useState } from 'react'
import { openfort } from './openfort'

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

// Example transaction with completely external key management
async function sendSolanaTransaction(fromPublicKey: PublicKey, toPublicKey: PublicKey, amountInSol: number) {
  // Create the transaction (this is still using Solana libraries)
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports: amountInSol * LAMPORTS_PER_SOL,
    })
  )

  // Get recent blockhash for transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

  transaction.recentBlockhash = blockhash
  transaction.feePayer = fromPublicKey

  // Serialize the transaction to send to external signer
  const serializedTransaction = transaction.serializeMessage()

  // Sign the transaction with openfort
  const signature = await openfort.embeddedWallet.signMessage(serializedTransaction)

  // Create a signed transaction by adding the signature
  transaction.addSignature(fromPublicKey, Buffer.from(Base58.toBytes(signature)))

  // Verify the signature (optional)
  if (!transaction.verifySignatures()) {
    throw new Error('Transaction signature verification failed')
  }

  // Send the transaction to the Solana network
  const rawTransaction = transaction.serialize()

  const txid = await sendAndConfirmRawTransaction(
    connection,
    rawTransaction,
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    }
  )

  console.log('Transaction sent successfully!')
  console.log('Transaction signature:', txid)

  return txid
}

const CustomSolanaWallet = ({ publicKey }: { publicKey: PublicKey }) => {
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [balance, setBalance] = useState<number | null>(null)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [sendingTransaction, setSendingTransaction] = useState<boolean>(false)

  const fetchBalance = useCallback(async (publicKey: PublicKey) => {
    try {
      const balance = await connection.getBalance(publicKey)
      setBalance(balance / 1e9) // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to fetch balance', error)
    }
  }, [])

  useEffect(() => {
    fetchBalance(publicKey)
  }, [publicKey, fetchBalance])

  const sendTransaction = async () => {
    if (!recipient || !amount) return alert('Fill in all fields')
    try {
      setTransactionSignature(null)
      setSendingTransaction(true)

      const signature = await sendSolanaTransaction(publicKey, new PublicKey(recipient), parseFloat(amount))

      console.log('Transaction signature', signature)
      setTransactionSignature(signature)
    } catch (error) {
      console.error('Transaction failed', error)
    } finally {
      setSendingTransaction(false)
    }
  }

  return (
    <div className="w-full">
      <h2>Solana Wallet</h2>
      {publicKey ? (
        <div className="flex flex-col pt-2">
          <p
            className="cursor-pointer"
            onClick={() => {
              setRecipient(import.meta.env.VITE_SOLANA_TEST_RECEIVE_ADDRESS || '')
              setAmount('0.01')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setRecipient(import.meta.env.VITE_SOLANA_TEST_RECEIVE_ADDRESS || '')
                setAmount('0.01')
              }
            }}
          >
            <strong>Public Key:</strong> {publicKey.toBase58()}
          </p>
          <p
            className="cursor-pointer"
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
            <strong>Balance:</strong> {balance !== null ? `${balance} SOL` : 'Loading...'}
          </p>
          <div
            className="flex gap-2 pt-2 opacity-[var(--opacity)]"
            style={{ '--opacity': sendingTransaction ? 0.5 : 1 } as CSSProperties}
          >
            <input
              type="text"
              placeholder="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="number"
              placeholder="Amount in SOL"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="button" onClick={sendTransaction} disabled={sendingTransaction}>
              Send SOL
            </button>
          </div>
          <div className="w-full pt-2">
            {transactionSignature && (
              <>
                <p
                  className="text-green-500 cursor-pointer"
                  onClick={() => setTransactionSignature(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setTransactionSignature(null)
                    }
                  }}
                >
                  Transaction Successful!
                </p>
                <p>
                  <strong>Transaction Signature:</strong>
                  <a
                    className="ml-2"
                    href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {transactionSignature.slice(0, 10)}...{transactionSignature.slice(-10)}
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p>Public key not found</p>
      )}
    </div>
  )
}

export default CustomSolanaWallet

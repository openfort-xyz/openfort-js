import {
  type Address,
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  lamports,
  pipe,
  type SignatureBytes,
  type SignatureDictionary,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type TransactionSigner,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { Base58 } from 'ox'

const rpc = createSolanaRpc('https://api.devnet.solana.com')
const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com')

export interface SendTransactionParams {
  from: Address
  to: Address
  amountInSol: number
  signMessage: (message: Uint8Array) => Promise<string>
}

export interface TransactionResult {
  signature: string
  success: boolean
  error?: string
}

function createOpenfortSigner(
  signerAddress: Address,
  signMessage: (message: Uint8Array) => Promise<string>
): TransactionSigner {
  const signer: TransactionSigner = {
    address: signerAddress,
    signTransactions: async (transactions): Promise<readonly SignatureDictionary[]> => {
      return Promise.all(
        transactions.map(async (transaction) => {
          const messageBytesArray = new Uint8Array(transaction.messageBytes)
          const signatureBase58 = await signMessage(messageBytesArray)
          let signatureBytes = Base58.toBytes(signatureBase58)

          if (signatureBytes.length === 65) {
            signatureBytes = signatureBytes.slice(0, 64)
          } else if (signatureBytes.length !== 64) {
            throw new Error(
              `Invalid signature length: expected 64 bytes for Ed25519, got ${signatureBytes.length} bytes`
            )
          }

          return Object.freeze({ [signerAddress]: signatureBytes as SignatureBytes })
        })
      )
    },
  }

  return signer
}

export async function sendSolanaTransaction({
  from,
  to,
  amountInSol,
  signMessage,
}: SendTransactionParams): Promise<TransactionResult> {
  try {
    const openfortSigner = createOpenfortSigner(from, signMessage)
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(from, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) =>
        appendTransactionMessageInstruction(
          getTransferSolInstruction({
            source: openfortSigner,
            destination: to,
            amount: lamports(BigInt(Math.floor(amountInSol * 1_000_000_000))),
          }),
          tx
        )
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    assertIsTransactionWithBlockhashLifetime(signedTransaction)

    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })
    await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' })

    const signature = Object.keys(signedTransaction.signatures)[0]

    return {
      signature,
      success: true,
    }
  } catch (error) {
    console.error('Error sending transaction:', error)
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

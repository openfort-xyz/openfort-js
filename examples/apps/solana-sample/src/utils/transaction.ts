import {
  type Address,
  address,
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
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
import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from '@solana-program/compute-budget'
import { getTransferSolInstruction } from '@solana-program/system'
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token'
import { Base58 } from 'ox'
import { rpc, rpcSubscriptions } from './rpc'

/** Validate that the signature is a 64-byte Ed25519 signature (from nacl.sign.detached). */
function validateEd25519Signature(raw: Uint8Array): Uint8Array {
  if (raw.length !== 64) {
    throw new Error(`Invalid Ed25519 signature: expected 64 bytes, got ${raw.length}`)
  }
  return raw
}

const COMPUTE_UNIT_LIMIT = 200_000
const COMPUTE_UNIT_PRICE = 50_000n // microlamports

// USDC devnet mint address
export const USDC_MINT = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

export type TokenType = 'SOL' | 'USDC'

export interface SendTransactionParams {
  from: Address
  to: Address
  amount: number
  token: TokenType
  signMessage: (message: Uint8Array) => Promise<string>
}

export interface TransactionResult {
  signature: string
}

/** Convert a decimal amount to the smallest unit (e.g. SOL to lamports) without floating-point loss */
function toSmallestUnit(amount: number, decimals: number): bigint {
  const str = amount.toString()
  const [whole, frac = ''] = str.split('.')
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole + padded)
}

function solToLamports(amount: number): bigint {
  return toSmallestUnit(amount, 9)
}

/** Extract the fee payer's signature from the signed transaction */
function getTransactionSignature(signatures: Record<string, SignatureBytes | null>, feePayer: Address): string {
  const sig = signatures[feePayer]
  if (!sig) {
    throw new Error(`Fee payer signature not found for address: ${feePayer}`)
  }
  return Base58.fromBytes(sig)
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
          const signatureBytes = validateEd25519Signature(Base58.toBytes(signatureBase58))

          return Object.freeze({
            [signerAddress]: signatureBytes as SignatureBytes,
          })
        })
      )
    },
  }

  return signer
}

export async function sendSolanaTransaction({
  from,
  to,
  amount,
  token,
  signMessage,
}: SendTransactionParams): Promise<TransactionResult> {
  try {
    const openfortSigner = createOpenfortSigner(from, signMessage)
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    if (token === 'SOL') {
      // Native SOL transfer
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(from, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) =>
          appendTransactionMessageInstruction(getSetComputeUnitLimitInstruction({ units: COMPUTE_UNIT_LIMIT }), tx),
        (tx) =>
          appendTransactionMessageInstruction(
            getSetComputeUnitPriceInstruction({ microLamports: COMPUTE_UNIT_PRICE }),
            tx
          ),
        (tx) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: openfortSigner,
              destination: to,
              amount: lamports(solToLamports(amount)),
            }),
            tx
          )
      )

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      assertIsTransactionWithBlockhashLifetime(signedTransaction)

      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
        rpc,
        rpcSubscriptions,
      })
      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), 60_000)
      try {
        await sendAndConfirmTransaction(signedTransaction, {
          commitment: 'confirmed',
          abortSignal: abortController.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

      const signature = getTransactionSignature(signedTransaction.signatures, from)

      return { signature }
    }

    // USDC transfer via SPL Token program
    const [fromTokenAccount] = await findAssociatedTokenPda({
      mint: USDC_MINT,
      owner: from,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    const [toTokenAccount] = await findAssociatedTokenPda({
      mint: USDC_MINT,
      owner: to,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    // Check if recipient's token account exists
    const toAccountInfo = await rpc.getAccountInfo(toTokenAccount).send()

    // USDC has 6 decimals
    const usdcAmount = toSmallestUnit(amount, 6)

    // Build the transfer instruction
    const transferInstruction = getTransferCheckedInstruction({
      source: fromTokenAccount,
      mint: USDC_MINT,
      destination: toTokenAccount,
      authority: openfortSigner,
      amount: usdcAmount,
      decimals: 6,
    })

    // Build the transaction with all instructions
    // Base transaction with compute budget
    const baseTx = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(from, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstruction(getSetComputeUnitLimitInstruction({ units: COMPUTE_UNIT_LIMIT }), tx),
      (tx) =>
        appendTransactionMessageInstruction(
          getSetComputeUnitPriceInstruction({ microLamports: COMPUTE_UNIT_PRICE }),
          tx
        )
    )

    const transactionMessage = !toAccountInfo.value
      ? pipe(
          baseTx,
          (tx) =>
            appendTransactionMessageInstruction(
              getCreateAssociatedTokenInstruction({
                payer: openfortSigner,
                ata: toTokenAccount,
                owner: to,
                mint: USDC_MINT,
              }),
              tx
            ),
          (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
        )
      : pipe(baseTx, (tx) => appendTransactionMessageInstruction(transferInstruction, tx))

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    assertIsTransactionWithBlockhashLifetime(signedTransaction)

    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    })
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60_000)
    try {
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: 'confirmed',
        abortSignal: abortController.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    const signature = getTransactionSignature(signedTransaction.signatures, from)

    return { signature }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending transaction:', message)
    throw new Error(message)
  }
}

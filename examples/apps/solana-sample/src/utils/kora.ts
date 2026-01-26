import {
  type Address,
  appendTransactionMessageInstructions,
  type Blockhash,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  type Instruction,
  type MicroLamports,
  partiallySignTransactionMessageWithSigners,
  type SignatureBytes,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit'
import { KoraClient } from '@solana/kora'
import {
  updateOrAppendSetComputeUnitLimitInstruction,
  updateOrAppendSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget'
import { Base58 } from 'ox'

const COMPUTE_UNIT_LIMIT = 200_000
const COMPUTE_UNIT_PRICE = 1_000_000n as MicroLamports

export interface KoraConfig {
  rpcUrl: string
  apiKey: string
}

export interface SendGaslessTransactionParams {
  from: Address
  to: Address
  amountInSol: number
  signMessage: (message: Uint8Array) => Promise<string>
  koraConfig: KoraConfig
}

export interface GaslessTransactionResult {
  signature: string
  success: boolean
  error?: string
}

/**
 * Builds a transaction message with Kora as fee payer and compute budget instructions.
 */
function buildTransactionMessage(
  feePayer: ReturnType<typeof createNoopSigner>,
  blockhash: string,
  instructions: Instruction[]
) {
  const msg = createTransactionMessage({ version: 0 })
  const withPayer = setTransactionMessageFeePayerSigner(feePayer, msg)
  const withLifetime = setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: blockhash as Blockhash, lastValidBlockHeight: 0n },
    withPayer
  )
  const withPrice = updateOrAppendSetComputeUnitPriceInstruction(COMPUTE_UNIT_PRICE, withLifetime)
  const withLimit = updateOrAppendSetComputeUnitLimitInstruction(COMPUTE_UNIT_LIMIT, withPrice)
  return appendTransactionMessageInstructions(instructions, withLimit)
}

/**
 * Sends a gasless SOL transfer using Kora as the fee payer.
 *
 * Flow:
 * 1. Get Kora's signer address
 * 2. Generate a SOL transfer instruction via Kora's transferTransaction
 * 3. Build the transaction with Kora as fee payer
 * 4. Sign with Openfort's embedded wallet
 * 5. Send to Kora for co-signing and submission to Solana
 */
export async function sendGaslessSolTransaction({
  from,
  to,
  amountInSol,
  signMessage,
  koraConfig,
}: SendGaslessTransactionParams): Promise<GaslessTransactionResult> {
  try {
    const client = new KoraClient({
      rpcUrl: koraConfig.rpcUrl,
      apiKey: koraConfig.apiKey,
    })

    // Step 1: Get Kora's signer address
    const { signer_address } = await client.getPayerSigner()
    const koraNoopSigner = createNoopSigner(signer_address as Address)

    // Step 2: Create SOL transfer instruction via Kora
    const lamports = Math.floor(amountInSol * 1_000_000_000)
    const transferSol = await client.transferTransaction({
      amount: lamports,
      token: '11111111111111111111111111111111', // Native SOL
      source: from,
      destination: to,
      signer_key: signer_address,
    })

    // Step 3: Build transaction with Kora as fee payer
    const { blockhash } = await client.getBlockhash()
    const transaction = buildTransactionMessage(koraNoopSigner, blockhash, transferSol.instructions)

    // Step 4: Partially sign (noop for Kora placeholder), then sign with Openfort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partiallySignedTx = await partiallySignTransactionMessageWithSigners(transaction as any)

    const signatureBase58 = await signMessage(new Uint8Array(partiallySignedTx.messageBytes))
    let signatureBytes = Base58.toBytes(signatureBase58)
    if (signatureBytes.length === 65) {
      signatureBytes = signatureBytes.slice(0, 64)
    }

    const userSignedTx = {
      ...partiallySignedTx,
      signatures: {
        ...partiallySignedTx.signatures,
        [from]: signatureBytes as SignatureBytes,
      },
    }
    const userSignedWire = getBase64EncodedWireTransaction(userSignedTx)

    // Step 5: Send to Kora for co-signing and submission to Solana
    const { signature } = await client.signAndSendTransaction({
      transaction: userSignedWire,
      signer_key: signer_address,
    })

    return { signature, success: true }
  } catch (error) {
    console.error('Error sending gasless transaction:', error)
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

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

/** Validate that the signature is a 64-byte Ed25519 signature (from nacl.sign.detached). */
function validateEd25519Signature(raw: Uint8Array): Uint8Array {
  if (raw.length !== 64) {
    throw new Error(`Invalid Ed25519 signature: expected 64 bytes, got ${raw.length}`)
  }
  return raw
}

const COMPUTE_UNIT_LIMIT = 200_000
const COMPUTE_UNIT_PRICE = 50_000n as MicroLamports

export interface KoraConfig {
  rpcUrl: string
  apiKey: string
}

export interface SendGaslessTransactionParams {
  from: Address
  to: Address
  amount: number
  token: 'SOL' | 'USDC'
  signMessage: (message: Uint8Array) => Promise<string>
  koraConfig: KoraConfig
}

export interface GaslessTransactionResult {
  signature: string
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
 * Sends a gasless SOL or USDC transfer using Kora as the fee payer.
 *
 * Kora will pay for transaction fees and, if configured, account creation rent.
 * For USDC transfers, if the recipient doesn't have a token account,
 * Kora will create it automatically (requires allow_create_account: true in kora.toml).
 *
 * Flow:
 * 1. Get Kora's signer address
 * 2. Generate transfer instructions via Kora's transferTransaction
 * 3. Build the transaction with Kora as fee payer
 * 4. Sign with Openfort's embedded wallet
 * 5. Send to Kora for co-signing and submission to Solana
 */
export async function sendGaslessSolTransaction({
  from,
  to,
  amount,
  token,
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

    // Step 2: Create transfer instruction via Kora
    const lamports = Math.floor(amount * 1_000_000_000)
    const tokenMint =
      token === 'USDC' ? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' : '11111111111111111111111111111111'
    const transferInstructions = await client.transferTransaction({
      amount: token === 'USDC' ? Math.floor(amount * 1_000_000) : lamports,
      token: tokenMint,
      source: from,
      destination: to,
      signer_key: signer_address,
    })

    // Step 3: Build transaction with Kora as fee payer
    const { blockhash } = await client.getBlockhash()
    const transaction = buildTransactionMessage(koraNoopSigner, blockhash, transferInstructions.instructions)

    // Step 4: Partially sign (noop for Kora placeholder), then sign with Openfort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partiallySignedTx = await partiallySignTransactionMessageWithSigners(transaction as any)

    const signatureBase58 = await signMessage(new Uint8Array(partiallySignedTx.messageBytes))
    const signatureBytes = validateEd25519Signature(Base58.toBytes(signatureBase58))

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

    return { signature }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending gasless transaction:', message)
    throw new Error(message)
  }
}

import {
  type AccountSignerMeta,
  type Address,
  address,
  type Instruction,
  type TransactionSigner,
  type WritableAccount,
  type WritableSignerAccount,
} from '@solana/kit'

// System Program ID
export const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111')

// Transfer instruction discriminator
const TRANSFER_INSTRUCTION_INDEX = 2

/**
 * Creates a transfer SOL instruction
 *
 * IMPORTANT: The source must be an AccountSignerMeta that includes both the address
 * and the signer object. This allows signTransactionMessageWithSigners to automatically
 * extract and use the signer.
 */
export function getTransferSolInstruction({
  source,
  destination,
  amount,
}: {
  source: TransactionSigner & WritableSignerAccount
  destination: Address | WritableAccount
  amount: bigint
}): Instruction {
  const destinationAddress = typeof destination === 'string' ? destination : destination.address

  // Encode the instruction data
  // Format: [instruction_index: u32, lamports: u64]
  const data = new Uint8Array(12)
  const view = new DataView(data.buffer)

  // Write instruction index (little-endian u32)
  view.setUint32(0, TRANSFER_INSTRUCTION_INDEX, true)

  // Write lamports amount (little-endian u64)
  view.setBigUint64(4, amount, true)

  // Create AccountSignerMeta for source - this preserves the signer object
  const sourceAccount: AccountSignerMeta = {
    address: source.address,
    role: 3, // 3 = AccountRole.WRITABLE_SIGNER (from + signer)
    signer: source, // CRITICAL: Include the signer object!
  }

  const destinationAccount: WritableAccount = {
    address: destinationAddress,
    role: 1, // 1 = AccountRole.WRITABLE (to)
  }

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [sourceAccount, destinationAccount],
    data,
  }
}

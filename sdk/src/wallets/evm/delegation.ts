/**
 * Helpers for inspecting an EOA's on-chain EIP-7702 delegation state.
 */

/**
 * The 3-byte prefix that marks an account's on-chain code as an EIP-7702
 * delegation designator.
 *
 * When an EOA delegates execution under EIP-7702, its code is set to exactly
 * this prefix followed by the 20-byte address of the contract it delegates to,
 * for a total of 23 bytes (`0xef0100 ‖ address`). A plain EOA has no code and a
 * regular contract has arbitrary code, so this prefix uniquely identifies a
 * delegated account.
 *
 * @see https://eips.ethereum.org/EIPS/eip-7702
 */
const EIP_7702_DELEGATION_PREFIX = '0xef0100'

/**
 * Hex string length of a full designator: `0x` + 3-byte prefix (6 hex chars) +
 * 20-byte address (40 hex chars).
 */
const DESIGNATOR_HEX_LENGTH = 2 + 6 + 40

/**
 * Extract the contract address an EOA delegates to under EIP-7702.
 *
 * @param code - The account's on-chain bytecode, as returned by `eth_getCode`.
 *   `undefined` or `0x` means a plain EOA with no code.
 * @returns The lowercase delegation target address, or `null` when `code` is
 *   not a valid EIP-7702 delegation designator (an empty EOA or a regular
 *   contract).
 */
function getDelegationTarget(code: string | undefined): string | null {
  if (!code) return null
  const normalized = code.toLowerCase()
  if (normalized.length !== DESIGNATOR_HEX_LENGTH) return null
  if (!normalized.startsWith(EIP_7702_DELEGATION_PREFIX)) return null
  return `0x${normalized.slice(EIP_7702_DELEGATION_PREFIX.length)}`
}

/**
 * Whether the EOA is currently delegated on-chain to `implementationAddress`.
 *
 * Compares the on-chain delegation target against the expected implementation
 * case-insensitively, so a `true` result means no new authorization is needed.
 * A bare EOA, a regular contract, or an EOA delegated to a *different*
 * implementation all return `false` — the last case is exactly what causes an
 * `AA24 signature error` if the authorization is skipped.
 *
 * @param code - The account's on-chain bytecode, as returned by `eth_getCode`.
 * @param implementationAddress - The implementation the EOA should delegate to.
 */
export function isDelegatedTo(code: string | undefined, implementationAddress: string | undefined): boolean {
  if (!implementationAddress) return false
  return getDelegationTarget(code) === implementationAddress.toLowerCase()
}

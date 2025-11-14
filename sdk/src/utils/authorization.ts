/**
 * EIP-7702 Authorization utilities
 * Standalone implementation for preparing and signing EIP-7702 authorizations
 */

import { keccak256 } from '@ethersproject/keccak256'
import type { Signer } from '../wallets/isigner'

// ============================================================
// Types
// ============================================================

/**
 * EIP-7702 Authorization object
 */
export type Authorization = {
  /** Contract address to delegate execution to */
  address: string
  /** Chain ID where the authorization is valid */
  chainId: number
  /** Nonce of the EOA account */
  nonce: number
}

/**
 * Signed EIP-7702 Authorization object
 */
export type SignedAuthorization = Authorization & {
  /** Signature r value */
  r: string
  /** Signature s value */
  s: string
  /** Signature v value (27 or 28) */
  v: number
  /** Y parity (0 or 1) */
  yParity: number
}

/**
 * Parameters for preparing an authorization
 */
export type PrepareAuthorizationParams = {
  /** Contract address to delegate to */
  contractAddress: string
  /** Chain ID (optional, will be auto-filled if not provided) */
  chainId?: number
  /** Nonce (optional, will be auto-filled if not provided) */
  nonce?: number
  /** RPC URL for fetching chain data if chainId or nonce are not provided */
  rpcUrl?: string
  /** Account address for fetching nonce */
  accountAddress?: string
}

/**
 * Parameters for signing an authorization
 */
export type SignAuthorizationParams = {
  /** The prepared authorization to sign */
  authorization: Authorization
  /** Signer instance to use for signing */
  signer: Signer
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Simple RLP encoding for authorization tuple [chainId, address, nonce]
 * Only handles the specific structure needed for EIP-7702 authorization hashing
 */
function encodeAuthorizationRLP(chainId: number, address: string, nonce: number): string {
  const encodeLength = (length: number, offset: number): string => {
    if (length < 56) {
      return (offset + length).toString(16).padStart(2, '0')
    }
    const lengthHex = length.toString(16)
    const lengthOfLength = Math.ceil(lengthHex.length / 2)
    return (offset + 55 + lengthOfLength).toString(16).padStart(2, '0') + lengthHex.padStart(lengthOfLength * 2, '0')
  }

  const encodeItem = (item: string | number): string => {
    // Handle numbers
    if (typeof item === 'number') {
      if (item === 0) return '80' // Empty string encoding for 0
      item = `0x${item.toString(16)}`
    }

    // Remove 0x prefix and ensure even length
    let hex = item.startsWith('0x') ? item.slice(2) : item
    if (hex.length % 2 !== 0) hex = `0${hex}`

    // Empty string
    if (hex.length === 0) return '80'

    // Single byte < 0x80
    if (hex.length === 2 && parseInt(hex, 16) < 0x80) return hex

    // Byte array
    return encodeLength(hex.length / 2, 0x80) + hex
  }

  // Encode each item
  const encodedItems = [chainId, address, nonce].map(encodeItem).join('')
  const listLength = encodedItems.length / 2
  const listPrefix = encodeLength(listLength, 0xc0)

  return `0x${listPrefix}${encodedItems}`
}

/**
 * Hashes an authorization according to EIP-7702 format:
 * keccak256('0x05' || rlp([chain_id, address, nonce]))
 *
 * @param authorization - The authorization to hash
 * @returns The keccak256 hash as a hex string
 */
function hashAuthorization(authorization: Authorization): string {
  const { address, chainId, nonce } = authorization

  // RLP encode [chainId, address, nonce]
  const encoded = encodeAuthorizationRLP(chainId, address, nonce)

  // Concatenate 0x05 prefix with RLP encoded data
  const data = `0x05${encoded.slice(2)}`

  // Return keccak256 hash
  return keccak256(data)
}

/**
 * Signs an EIP-7702 Authorization using the Signer interface.
 *
 * @param params - Parameters for signing
 * @returns The signed authorization with signature fields
 */
export async function signAuthorization(params: SignAuthorizationParams): Promise<SignedAuthorization> {
  const { authorization, signer } = params

  // Hash the authorization
  const hash = hashAuthorization(authorization)

  // Sign the hash using the signer
  const signatureHex = await signer.sign(hash, false, false)

  // Parse the signature (format: 0x + r (64 chars) + s (64 chars) + v (2 chars))
  const sig = signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex

  const r = `0x${sig.slice(0, 64)}`
  const s = `0x${sig.slice(64, 128)}`
  const vHex = sig.slice(128, 130)
  const vValue = parseInt(vHex, 16)

  // Determine yParity from v value
  // v can be 27, 28 (legacy) or 0, 1 (modern), or sometimes encoded as 0x1b, 0x1c
  let yParity: number
  if (vValue === 27 || vValue === 0 || vHex === '1b') {
    yParity = 0
  } else if (vValue === 28 || vValue === 1 || vHex === '1c') {
    yParity = 1
  } else if (vValue >= 35) {
    // EIP-155 format: v = chainId * 2 + 35 + yParity
    yParity = vValue % 2 === 0 ? 1 : 0
  } else {
    yParity = vValue % 2
  }

  const v = yParity === 0 ? 27 : 28

  return {
    ...authorization,
    r,
    s,
    v,
    yParity,
  }
}

/**
 * Serializes a signed authorization to compact signature format.
 * The API expects this format to parse with Viem's parseSignature function.
 * Format: 0x${r}${s}${yParity} (130 character hex string = 65 bytes)
 *
 * @param signedAuth - The signed authorization
 * @returns Compact signature hex string (r + s + yParity)
 */
export function serializeSignedAuthorization(signedAuth: SignedAuthorization): string {
  const { r, s, yParity } = signedAuth

  // Remove 0x prefix from r and s
  const rHex = r.startsWith('0x') ? r.slice(2) : r
  const sHex = s.startsWith('0x') ? s.slice(2) : s

  // Pad r and s to 32 bytes (64 hex chars) if needed
  const rPadded = rHex.padStart(64, '0')
  const sPadded = sHex.padStart(64, '0')

  // Convert yParity to hex byte (1 byte = 2 hex chars)
  // yParity 0 -> 0x00, yParity 1 -> 0x01
  const yParityHex = yParity.toString(16).padStart(2, '0')

  // Compact signature format: r (64) + s (64) + v (2) = 130 chars
  return `0x${rPadded}${sPadded}${yParityHex}`
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Prepares and signs an EIP-7702 authorization in one call.
 *
 * @param params - Parameters including contract address, chainId, nonce, and signer
 * @returns The signed authorization with signature fields
 */
export async function prepareAndSignAuthorization(
  params: PrepareAuthorizationParams & { signer: Signer }
): Promise<SignedAuthorization> {
  const { signer, contractAddress, chainId, nonce } = params

  // Validate required parameters
  if (!contractAddress) {
    throw new Error('contractAddress is required')
  }

  if (chainId === undefined) {
    throw new Error('chainId is required. Please provide it or fetch it from your RPC provider using eth_chainId')
  }

  if (nonce === undefined) {
    throw new Error(
      'nonce is required. Please provide it or fetch it from your RPC provider using eth_getTransactionCount'
    )
  }

  // Create authorization object
  const authorization: Authorization = {
    address: contractAddress,
    chainId,
    nonce,
  }

  // Sign the authorization
  return signAuthorization({ authorization, signer })
}

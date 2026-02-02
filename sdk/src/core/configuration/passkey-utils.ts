/**
 * Shared passkey utilities for encoding, validation, and common operations.
 * Used by both browser PasskeyHandler and react-native NativePasskeyHandler.
 */

// ============================================
// ENCODING UTILITIES (Base64URL for WebAuthn)
// ============================================

/**
 * Converts ArrayBuffer or Uint8Array to base64url string.
 * Base64URL uses '-' and '_' instead of '+' and '/', and omits padding '='.
 * This is the standard encoding for WebAuthn binary data.
 */
export function arrayBufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const binary = String.fromCharCode(...bytes)
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Converts base64url string to Uint8Array.
 */
export function base64URLToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Converts base64url string to ArrayBuffer.
 */
export function base64URLToArrayBuffer(base64url: string): ArrayBuffer {
  return base64URLToUint8Array(base64url).buffer
}

/**
 * Converts standard base64 to base64url.
 */
export function base64ToBase64URL(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Converts base64url to standard base64 (with padding).
 */
export function base64URLToBase64(base64url: string): string {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  return base64 + '='.repeat((4 - (base64.length % 4)) % 4)
}

// ============================================
// CHALLENGE GENERATION
// ============================================

/**
 * Generates a random 32-byte challenge for WebAuthn operations.
 *
 * ⚠️ SECURITY WARNING: This is for key derivation only, NOT authentication.
 * For authentication, challenges must be server-generated and verified.
 */
export function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

// ============================================
// VALIDATION
// ============================================

export const VALID_KEY_BYTE_LENGTHS = [16, 24, 32] as const
export type ValidKeyByteLength = (typeof VALID_KEY_BYTE_LENGTHS)[number]

export function validateKeyByteLength(length: number): asserts length is ValidKeyByteLength {
  if (!VALID_KEY_BYTE_LENGTHS.includes(length as ValidKeyByteLength)) {
    throw new Error(`Invalid key byte length ${length}. Valid lengths: ${VALID_KEY_BYTE_LENGTHS.join(', ')}`)
  }
}

// ============================================
// KEY PROCESSING
// ============================================

/**
 * Extracts raw key bytes from PRF result, truncating or padding to desired length.
 * Used when crypto.subtle is not available (React Native without polyfill).
 */
export function extractRawKeyBytes(prfResult: ArrayBuffer | Uint8Array, targetLength: number): Uint8Array {
  const bytes = prfResult instanceof Uint8Array ? prfResult : new Uint8Array(prfResult)
  if (bytes.length >= targetLength) {
    return bytes.slice(0, targetLength)
  }
  const padded = new Uint8Array(targetLength)
  padded.set(bytes)
  return padded
}

// ============================================
// NAMESPACE EXPORT
// ============================================

export const PasskeyUtils = {
  arrayBufferToBase64URL,
  base64URLToUint8Array,
  base64URLToArrayBuffer,
  base64ToBase64URL,
  base64URLToBase64,
  generateChallenge,
  validateKeyByteLength,
  extractRawKeyBytes,
  VALID_KEY_BYTE_LENGTHS,
} as const

export function randomUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback implementation using crypto.getRandomValues
  const randomBytes = new Uint8Array(16)
  crypto.getRandomValues(randomBytes)
  // eslint-disable-next-line no-bitwise
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40 // Set version to 4
  // eslint-disable-next-line no-bitwise
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80 // Set variant to RFC4122
  return [...randomBytes]
    .map((byte, index) => {
      const hex = byte.toString(16).padStart(2, '0')
      return [4, 6, 8, 10].includes(index) ? `-${hex}` : hex
    })
    .join('')
}

export function numberToHex(value: number): string {
  return `0x${value.toString(16)}`
}

export function hexToString(hex: string): string {
  let result = ''
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex

  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.substring(i, i + 2), 16)
    if (byte !== 0) {
      // Skip null bytes
      result += String.fromCharCode(byte)
    }
  }

  return result
}

// Crypto digest helper that can use overrides
let cryptoDigestOverride: ((algorithm: string, data: BufferSource) => Promise<ArrayBuffer>) | undefined

export function setCryptoDigestOverride(
  digestFunction?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>
): void {
  cryptoDigestOverride = digestFunction
}

export async function cryptoDigest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
  if (cryptoDigestOverride) {
    return cryptoDigestOverride(algorithm, data)
  }

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    return crypto.subtle.digest(algorithm, data)
  }

  throw new Error('No crypto digest function available. Please provide a crypto override for this environment.')
}

/** Types that passkey.key may have after postMessage/JSON (e.g. React Native or bridge). */
export type PasskeyKeyLike = Uint8Array | number[] | ArrayLike<number> | Record<string, number> | string

/**
 * Normalizes passkey key to a Uint8Array (BufferSource).
 * Use when receiving passkey.key via postMessage/JSON (e.g. from React Native).
 * Handles: Uint8Array, number[], plain object {0:n,1:n,...}, comma-separated string "n,n,...".
 *
 * @param key - Key from PasskeyDetails after JSON / bridge
 * @returns Uint8Array for crypto.subtle.importKey('raw', result, ...)
 */
export function ensurePasskeyKeyBuffer(key: PasskeyKeyLike): Uint8Array {
  if (key instanceof Uint8Array) {
    return key
  }
  if (typeof key === 'string') {
    return new Uint8Array(key.split(',').map(Number))
  }
  if (Array.isArray(key)) {
    return new Uint8Array(key)
  }
  if (typeof key === 'object' && key !== null && 'length' in key) {
    return new Uint8Array(key as ArrayLike<number>)
  }
  if (typeof key === 'object' && key !== null) {
    return new Uint8Array(Object.values(key as Record<string, number>))
  }
  throw new Error('Passkey key must be Uint8Array, number[], object with numeric values, or comma-separated string')
}

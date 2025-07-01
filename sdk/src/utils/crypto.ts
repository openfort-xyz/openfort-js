export function randomUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = Math.random() * 16 | 0;
    // eslint-disable-next-line no-bitwise, no-mixed-operators
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

export function numberToHex(value: number): string {
  return `0x${value.toString(16)}`;
}

export function hexToString(hex: string): string {
  let result = '';
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.substring(i, i + 2), 16);
    if (byte !== 0) { // Skip null bytes
      result += String.fromCharCode(byte);
    }
  }

  return result;
}

// Crypto digest helper that can use overrides
let cryptoDigestOverride: ((algorithm: string, data: BufferSource) => Promise<ArrayBuffer>) | undefined;

export function setCryptoDigestOverride(
  digestFunction?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>,
): void {
  cryptoDigestOverride = digestFunction;
}

export async function cryptoDigest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
  if (cryptoDigestOverride) {
    return cryptoDigestOverride(algorithm, data);
  }

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    return crypto.subtle.digest(algorithm, data);
  }

  throw new Error('No crypto digest function available. Please provide a crypto override for this environment.');
}

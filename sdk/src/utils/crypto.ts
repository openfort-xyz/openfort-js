import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex as nobleBytesToHex, hexToBytes as nobleHexToBytes } from '@noble/hashes/utils';

export type Hex = `0x${string}`;

export function bytesToHex(value: Uint8Array): Hex {
  const hex = nobleBytesToHex(value);
  return `0x${hex}`;
}

export function hexToBytes(hexString: Hex | string | Uint8Array): Uint8Array {
  if (hexString instanceof Uint8Array) {
    return hexString;
  }

  const match = hexString.match(/^(0x|)((?:.{1,2})*)$/);
  if (!match) {
    throw new Error('invalid hex string');
  }

  return nobleHexToBytes(match[2]);
}

type SignParameters = {
  hash: Hex
  privateKey: Hex
};

export function serializeSignature({
  r,
  s,
  v,
  yParity,
}: any) {
  const safeYParity = (() => {
    if (yParity === 0 || yParity === 1) return yParity;
    if (v && (v === BigInt(27) || v === BigInt(28) || v >= BigInt(35))) return v % BigInt(2) === BigInt(0) ? 1 : 0;
    throw new Error('Invalid `v` or `yParity` value');
  })();
  const signature = `0x${new secp256k1.Signature(
    BigInt(r),
    BigInt(s),
  ).toCompactHex()}${safeYParity === 0 ? '1b' : '1c'}` as const;

  return signature;
}

type NumberToHexOpts = {
  size?: number
};

export function padHex(
  hex: Hex,
  { dir, size = 32 }: { dir?: 'left' | 'right' | undefined; size?: number | null } = {},
) {
  if (size === null) return hex;
  const newHex = hex.replace('0x', '');
  if (newHex.length > size * 2) throw new Error('Hex string is too long');

  return `0x${newHex[dir === 'right' ? 'padEnd' : 'padStart'](
    size * 2,
    '0',
  )}` as Hex;
}

export function numberToHex(
  val: number | bigint,
  opts: NumberToHexOpts = {},
): Hex {
  const { size } = opts;

  const value = BigInt(val);

  let maxValue: bigint | number | undefined;
  if (size) {
    maxValue = BigInt(2) ** (BigInt(size) * BigInt(8)) - BigInt(1);
  } else if (typeof val === 'number') {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }

  if ((maxValue && value > maxValue) || value < 0) {
    const suffix = typeof val === 'bigint' ? 'n' : '';
    throw new Error(`Value out of bounds: ${value}${suffix}`);
  }

  const hex = `0x${(
    value
  ).toString(16)}` as Hex;
  if (size) return padHex(hex, { size }) as Hex;
  return hex;
}

export function sign({
  hash,
  privateKey,
}: SignParameters) {
  const { r, s, recovery } = secp256k1.sign(
    hash.slice(2),
    privateKey.slice(2),
    { lowS: true },
  );
  const signature = {
    r: numberToHex(r, { size: 32 }),
    s: numberToHex(s, { size: 32 }),
    v: recovery ? BigInt(28) : BigInt(27),
    yParity: recovery,
  };

  return serializeSignature(signature);
}

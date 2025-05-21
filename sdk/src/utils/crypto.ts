import { secp256k1 } from '@noble/curves/secp256k1';
import { hexToBytes as nobleHexToBytes } from '@noble/hashes/utils';

export type Hex = `0x${string}`;

// Pre-crypto API compatible UUID generator
export function randomUUID() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version 4 (0100xxxx)
  bytes[6] = Math.floor(bytes[6] / 16) * 16 + 4;

  // Set variant to 10xxxxxx
  bytes[8] = Math.floor(bytes[8] / 64) * 64 + 128;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
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

export function isHex(
  value: unknown,
  { strict = true }: { strict?: boolean | undefined } = {},
): value is Hex {
  if (!value) return false;
  if (typeof value !== 'string') return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith('0x');
}

export type ByteArray = Uint8Array;
export function sizeValue(value: Hex | ByteArray) {
  if (isHex(value, { strict: false })) return Math.ceil((value.length - 2) / 2);
  return value.length;
}

export type SizeOverflowErrorType = SizeOverflowError & {
  name: 'SizeOverflowError'
};
export class SizeOverflowError extends Error {
  constructor({ givenSize, maxSize }: { givenSize: number; maxSize: number }) {
    super(
      `Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`,
    );
  }
}

export function assertSize(
  hexOrBytes: Hex | ByteArray,
  { size }: { size: number },
): void {
  if (sizeValue(hexOrBytes) > size) {
    throw new SizeOverflowError({
      givenSize: sizeValue(hexOrBytes),
      maxSize: size,
    });
  }
}

export type HexToStringOpts = {
  /** Size (in bytes) of the hex value. */
  size?: number | undefined
};

type TrimOptions = {
  dir?: 'left' | 'right' | undefined
};
// eslint-disable-next-line @typescript-eslint/naming-convention
export type TrimReturnType<value extends ByteArray | Hex> = value extends Hex
  ? Hex
  : ByteArray;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type ErrorType<name extends string = 'Error'> = Error & { name: name };

export type TrimErrorType = ErrorType;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function trim<value extends ByteArray | Hex>(
  hexOrBytes: value,
  { dir = 'left' }: TrimOptions = {},
): TrimReturnType<value> {
  let data: any = typeof hexOrBytes === 'string' ? hexOrBytes.replace('0x', '') : hexOrBytes;

  let sliceLength = 0;
  for (let i = 0; i < data.length - 1; i++) {
    if (data[dir === 'left' ? i : data.length - i - 1].toString() === '0') sliceLength++;
    else break;
  }
  data = dir === 'left'
    ? data.slice(sliceLength)
    : data.slice(0, data.length - sliceLength);

  if (typeof hexOrBytes === 'string') {
    if (data.length === 1 && dir === 'right') data = `${data}0`;
    return `0x${data.length % 2 === 1 ? `0${data}` : data
    }` as TrimReturnType<value>;
  }
  return data as TrimReturnType<value>;
}

export function hexToString(hex: Hex, opts: HexToStringOpts = {}): string {
  let bytes = hexToBytes(hex);
  if (opts.size) {
    assertSize(bytes, { size: opts.size });
    bytes = trim(bytes, { dir: 'right' });
  }
  return new TextDecoder().decode(bytes);
}

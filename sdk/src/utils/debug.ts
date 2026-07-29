import { SDKConfiguration } from '../core/config/config'

/**
 * Property names whose values are never written to the console.
 *
 * `debugLog` is the transport logger for the iframe RPC bridge, so objects
 * passed to it may contain sensitive fields. Console output is often
 * collected by third-party tooling, so these fields are replaced first.
 */
const REDACTED_KEYS = new Set([
  'accesstoken',
  'authorization',
  'encryptionkey',
  'encryptionsession',
  'key',
  'passkey',
  'password',
  'privatekey',
  'recoverypassword',
  'refreshtoken',
  'secret',
  'share',
  'signature',
  'token',
])

const REDACTED = '[redacted]'
const MAX_DEPTH = 6

function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value
  if (depth >= MAX_DEPTH) return '[depth limit]'
  if (seen.has(value)) return '[circular]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1, seen))

  const output: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    output[key] = REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : redact(entry, depth + 1, seen)
  }
  return output
}

function sanitize(value: unknown): string {
  const redacted = redact(value)
  let str: string
  if (typeof redacted === 'object' && redacted !== null) {
    try {
      str = JSON.stringify(redacted)
    } catch {
      str = '[unserializable]'
    }
  } else {
    str = String(redacted)
  }
  // Escape newlines so a crafted value cannot forge additional log lines.
  return str.replace(/[\r\n]/g, '\\n')
}

export function debugLog(...args: unknown[]): void {
  const configuration = SDKConfiguration.getInstance()
  if (configuration?.debug) {
    console.log(`${new Date().toISOString()} [SDK]`, ...args.map(sanitize))
  }
}

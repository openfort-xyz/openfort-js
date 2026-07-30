import { SDKConfiguration } from '../core/config/config'
import { isSensitiveKey, REDACTED } from './sensitiveKeys'

// `debugLog` is the transport logger for the iframe RPC bridge, so objects
// passed to it may contain sensitive fields. Console output is often
// collected by third-party tooling, so those fields are redacted first.
const MAX_DEPTH = 6

function redact(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value
  if (depth >= MAX_DEPTH) return '[depth limit]'
  if (ancestors.has(value)) return '[circular]'
  // Track only the current path — entries are removed on the way back up —
  // so an object referenced from two sibling positions is rendered in both,
  // and only a genuine cycle is cut off.
  ancestors.add(value)

  let output: unknown
  if (Array.isArray(value)) {
    output = value.map((entry) => redact(entry, depth + 1, ancestors))
  } else {
    const copy: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1, ancestors)
    }
    output = copy
  }
  ancestors.delete(value)
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

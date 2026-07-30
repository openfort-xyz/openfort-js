/**
 * Fragments of property names treated as sensitive wherever the SDK
 * serialises data it does not control. Debug logging and telemetry share
 * this list so the two policies cannot drift apart.
 *
 * Matched as substrings of the key with case and `-`/`_` separators
 * normalised away: payload fields are compound names (`accessToken`,
 * `deviceShare`, `x-player-token`, `encryption_session`), and a new field
 * built from one of these fragments should be redacted without anyone
 * remembering to extend this list.
 */
const SENSITIVE_KEY_FRAGMENTS = [
  'authorization',
  'cookie',
  'credential',
  'encryptionsession',
  'jwt',
  'key',
  'password',
  'secret',
  'seed',
  'share',
  'signature',
  'token',
]

export const REDACTED = '[redacted]'

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '')
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))
}

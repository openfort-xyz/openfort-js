import { describe, expect, it } from 'vitest'
import { hashAuthorization } from './authorization'

const VALID_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'

describe('hashAuthorization input validation', () => {
  it('produces a 32-byte hash for valid inputs', () => {
    const hash = hashAuthorization({ chainId: 1, address: VALID_ADDRESS, nonce: 0 })
    expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/)
  })

  it('is deterministic', () => {
    expect(hashAuthorization({ chainId: 8453, address: VALID_ADDRESS, nonce: 7 })).toBe(
      hashAuthorization({ chainId: 8453, address: VALID_ADDRESS, nonce: 7 })
    )
  })

  it('changes when any field changes', () => {
    const base = hashAuthorization({ chainId: 1, address: VALID_ADDRESS, nonce: 0 })
    expect(hashAuthorization({ chainId: 2, address: VALID_ADDRESS, nonce: 0 })).not.toBe(base)
    expect(hashAuthorization({ chainId: 1, address: VALID_ADDRESS, nonce: 1 })).not.toBe(base)
    expect(hashAuthorization({ chainId: 1, address: `0x${'a'.repeat(40)}`, nonce: 0 })).not.toBe(base)
  })

  // A malformed address previously produced a structurally plausible
  // authorization that was signed anyway -- a valid signature over wrong data.
  it.each([
    ['too short', '0x1234'],
    ['too long', `0x${'a'.repeat(42)}`],
    ['missing 0x prefix', 'a'.repeat(40)],
    ['non-hex characters', `0x${'z'.repeat(40)}`],
    ['empty', ''],
  ])('rejects an address that is %s', (_label, address) => {
    expect(() => hashAuthorization({ chainId: 1, address, nonce: 0 })).toThrow(/authorization address/i)
  })

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['above 2^53', Number.MAX_SAFE_INTEGER + 2],
    ['NaN', Number.NaN],
  ])('rejects a chainId that is %s', (_label, chainId) => {
    expect(() => hashAuthorization({ chainId, address: VALID_ADDRESS, nonce: 0 })).toThrow(/chainId/i)
  })

  it.each([
    ['negative', -1],
    ['fractional', 0.5],
    ['above 2^53', Number.MAX_SAFE_INTEGER + 2],
  ])('rejects a nonce that is %s', (_label, nonce) => {
    expect(() => hashAuthorization({ chainId: 1, address: VALID_ADDRESS, nonce })).toThrow(/nonce/i)
  })
})

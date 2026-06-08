import { describe, expect, it } from 'vitest'
import { isDelegatedTo } from './delegation'

const CALIBUR = '0x000000009b1d0af20d8c6d0a44e162d11f9b8f00'
const OTHER_IMPL = '0x00000000000000000000000000000000deadbeef'
const designatorFor = (impl: string) => `0xef0100${impl.slice(2)}`

describe('isDelegatedTo', () => {
  it('returns true when the EOA is delegated to the expected implementation', () => {
    expect(isDelegatedTo(designatorFor(CALIBUR), CALIBUR)).toBe(true)
  })

  it('is case-insensitive across code and implementation address', () => {
    expect(isDelegatedTo(designatorFor(CALIBUR).toUpperCase(), CALIBUR.toUpperCase())).toBe(true)
  })

  // This is the AA24 case: the EOA has code, but it points to a DIFFERENT
  // implementation than the one the UserOp signature targets. A crude
  // "has any code" check would skip the authorization and revert on-chain.
  it('returns false when the EOA is delegated to a different implementation', () => {
    expect(isDelegatedTo(designatorFor(OTHER_IMPL), CALIBUR)).toBe(false)
  })

  it('returns false for a bare EOA', () => {
    expect(isDelegatedTo('0x', CALIBUR)).toBe(false)
    expect(isDelegatedTo(undefined, CALIBUR)).toBe(false)
  })

  it('returns false for a regular contract (wrong length, no designator prefix)', () => {
    expect(isDelegatedTo('0x6080604052348015600f57600080fd', CALIBUR)).toBe(false)
  })

  it('returns false for a designator-length code without the 0xef0100 prefix', () => {
    expect(isDelegatedTo(`0xabcdef${CALIBUR.slice(2)}`, CALIBUR)).toBe(false)
  })

  it('returns false (fails open to re-authorize) when implementationAddress is missing', () => {
    expect(isDelegatedTo(designatorFor(CALIBUR), undefined)).toBe(false)
  })
})

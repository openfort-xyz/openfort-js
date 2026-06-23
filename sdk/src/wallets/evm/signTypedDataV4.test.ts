import { describe, expect, it } from 'vitest'
import { JsonRpcError } from './JsonRpcError'
import { parseTypedDataChainId } from './signTypedDataV4'

describe('parseTypedDataChainId', () => {
  it('parses decimal and hex string chain IDs', () => {
    expect(parseTypedDataChainId('8453')).toBe(8453)
    expect(parseTypedDataChainId('0x2105')).toBe(8453)
  })

  it('rejects malformed chain IDs', () => {
    expect(() => parseTypedDataChainId('8453abc')).toThrow(JsonRpcError)
    expect(() => parseTypedDataChainId('0x2105xyz')).toThrow(JsonRpcError)
  })
})

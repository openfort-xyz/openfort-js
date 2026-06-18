import { describe, expect, it } from 'vitest'
import { normalizeRpcErrorMessage } from './normalizeRpcError'

describe('normalizeRpcErrorMessage', () => {
  it('maps insufficient funds (even buried in a raw node blob)', () => {
    const raw =
      'processing response error (body="{...}", error={"code":3}, "message":"insufficient funds for gas * price + value"})'
    expect(normalizeRpcErrorMessage(raw)).toMatch(/^Insufficient funds:/)
  })

  it('maps execution reverted', () => {
    expect(normalizeRpcErrorMessage('execution reverted: ERC20: transfer amount exceeds balance')).toMatch(
      /^Transaction reverted:/
    )
    expect(normalizeRpcErrorMessage('the call reverted')).toMatch(/^Transaction reverted:/)
  })

  it('maps nonce conflicts (too low + replacement underpriced)', () => {
    expect(normalizeRpcErrorMessage('nonce too low')).toMatch(/^Nonce conflict:/)
    expect(normalizeRpcErrorMessage('replacement transaction underpriced')).toMatch(/^Nonce conflict:/)
  })

  it('maps gas errors', () => {
    expect(normalizeRpcErrorMessage('intrinsic gas too low')).toMatch(/^Gas error:/)
    expect(normalizeRpcErrorMessage('gas required exceeds allowance (10000)')).toMatch(/^Gas error:/)
    expect(normalizeRpcErrorMessage('out of gas')).toMatch(/^Gas error:/)
  })

  it('is case-insensitive', () => {
    expect(normalizeRpcErrorMessage('INSUFFICIENT FUNDS')).toMatch(/^Insufficient funds:/)
  })

  it('passes unknown messages through unchanged (no detail lost)', () => {
    const unknown = 'some provider-specific failure code 0xdeadbeef'
    expect(normalizeRpcErrorMessage(unknown)).toBe(unknown)
  })
})

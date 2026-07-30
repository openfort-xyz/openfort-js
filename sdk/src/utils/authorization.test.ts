import { describe, expect, it, vi } from 'vitest'
import type { Signer } from '../wallets/isigner'
import { signAuthorization } from './authorization'

const VALID_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'

/** Returns a well-formed 65-byte signature so valid inputs reach the end. */
const stubSigner = () =>
  ({ sign: vi.fn().mockResolvedValue(`0x${'11'.repeat(32)}${'22'.repeat(32)}1b`) }) as unknown as Signer

const sign = (chainId: number, address: string, nonce: number) =>
  signAuthorization({ authorization: { chainId, address, nonce }, signer: stubSigner() })

describe('EIP-7702 authorization input validation', () => {
  it('signs a well-formed authorization', async () => {
    const signed = await sign(1, VALID_ADDRESS, 0)
    expect(signed.r).toMatch(/^0x[0-9a-f]{64}$/)
    expect(signed.s).toMatch(/^0x[0-9a-f]{64}$/)
    expect([0, 1]).toContain(signed.yParity)
  })

  it('hashes the same inputs identically', async () => {
    const signer = stubSigner()
    await signAuthorization({ authorization: { chainId: 8453, address: VALID_ADDRESS, nonce: 7 }, signer })
    await signAuthorization({ authorization: { chainId: 8453, address: VALID_ADDRESS, nonce: 7 }, signer })
    const calls = (signer.sign as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0]![0]).toBe(calls[1]![0])
  })

  it('hashes differently when any field changes', async () => {
    const signer = stubSigner()
    await signAuthorization({ authorization: { chainId: 1, address: VALID_ADDRESS, nonce: 0 }, signer })
    await signAuthorization({ authorization: { chainId: 2, address: VALID_ADDRESS, nonce: 0 }, signer })
    await signAuthorization({ authorization: { chainId: 1, address: VALID_ADDRESS, nonce: 1 }, signer })
    const hashes = (signer.sign as ReturnType<typeof vi.fn>).mock.calls.map((call: unknown[]) => call[0])
    expect(new Set(hashes).size).toBe(3)
  })

  // The encoder accepts any hex-shaped string, so the address is checked
  // before signing.
  it.each([
    ['too short', '0x1234'],
    ['too long', `0x${'a'.repeat(42)}`],
    ['missing 0x prefix', 'a'.repeat(40)],
    ['non-hex characters', `0x${'z'.repeat(40)}`],
    ['empty', ''],
  ])('refuses to sign an address that is %s', async (_label, address) => {
    await expect(sign(1, address, 0)).rejects.toThrow(/authorization address/i)
  })

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['above 2^53', Number.MAX_SAFE_INTEGER + 2],
    ['NaN', Number.NaN],
  ])('refuses to sign a chainId that is %s', async (_label, chainId) => {
    await expect(sign(chainId, VALID_ADDRESS, 0)).rejects.toThrow(/chainId/i)
  })

  it.each([
    ['negative', -1],
    ['fractional', 0.5],
    ['above 2^53', Number.MAX_SAFE_INTEGER + 2],
  ])('refuses to sign a nonce that is %s', async (_label, nonce) => {
    await expect(sign(1, VALID_ADDRESS, nonce)).rejects.toThrow(/nonce/i)
  })

  it('never calls the signer when validation fails', async () => {
    const signer = stubSigner()
    await expect(
      signAuthorization({ authorization: { chainId: 1, address: '0xdeadbeef', nonce: 0 }, signer })
    ).rejects.toThrow()
    expect(signer.sign).not.toHaveBeenCalled()
  })

  // A short or non-hex signer response would otherwise be sliced and
  // zero-padded into a plausible-looking 65-byte signature over the wrong
  // bits — including a literal "NaN" where yParity belongs.
  it.each([
    ['truncated', `0x${'11'.repeat(32)}`],
    ['empty', '0x'],
    ['non-hex', `0x${'zz'.repeat(65)}`],
  ])('rejects a signer response that is %s', async (_label, signature) => {
    const signer = { sign: vi.fn().mockResolvedValue(signature) } as unknown as Signer
    await expect(
      signAuthorization({ authorization: { chainId: 1, address: VALID_ADDRESS, nonce: 0 }, signer })
    ).rejects.toThrow(/signature/i)
  })
})

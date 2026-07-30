import { describe, expect, it, vi } from 'vitest'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'
import { signTypedDataV4 } from './signTypedDataV4'

const ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111'
const CHAIN_ID = 8453

const typedData = (domainOverrides: Record<string, unknown> = {}) => ({
  domain: { name: 'Test', version: '1', chainId: CHAIN_ID, ...domainOverrides },
  types: {
    EIP712Domain: [{ name: 'name', type: 'string' }],
    Mail: [{ name: 'contents', type: 'string' }],
  },
  primaryType: 'Mail',
  message: { contents: 'hello' },
})

// Fully signable fixture: the signer returns a 65-byte signature and the
// account carries a real factory address and 32-byte salt, so the "accepts"
// tests below can assert that signing completes rather than merely that one
// particular validation did not fire.
const params = (overrides: Partial<Parameters<typeof signTypedDataV4>[0]> = {}) =>
  ({
    params: [ACCOUNT_ADDRESS, JSON.stringify(typedData())],
    method: 'eth_signTypedData_v4',
    signer: { sign: vi.fn().mockResolvedValue(`0x${'ab'.repeat(65)}`) },
    implementationType: 'UPGRADEABLE_V6',
    rpcProvider: { detectNetwork: vi.fn().mockResolvedValue({ chainId: CHAIN_ID }) },
    account: {
      address: ACCOUNT_ADDRESS,
      ownerAddress: ACCOUNT_ADDRESS,
      factoryAddress: '0x3333333333333333333333333333333333333333',
      salt: `0x${'00'.repeat(32)}`,
    },
    ...overrides,
  }) as unknown as Parameters<typeof signTypedDataV4>[0]

describe('signTypedDataV4 request validation', () => {
  it('rejects a from address that is not the connected account', async () => {
    const otherAddress = '0x2222222222222222222222222222222222222222'
    await expect(
      signTypedDataV4(params({ params: [otherAddress, JSON.stringify(typedData())] } as never))
    ).rejects.toMatchObject({
      code: RpcErrorCode.INVALID_PARAMS,
      message: expect.stringContaining('from address'),
    })
  })

  it('accepts a from address differing only by case', async () => {
    const mixedCase = ACCOUNT_ADDRESS.toUpperCase().replace('0X', '0x')
    await expect(
      signTypedDataV4(params({ params: [mixedCase, JSON.stringify(typedData())] } as never))
    ).resolves.toMatch(/^0x[0-9a-f]+$/i)
  })

  it('reports INVALID_PARAMS when the first param is not an address string', async () => {
    // Legacy eth_signTypedData callers order params as [typedData, address].
    await expect(signTypedDataV4(params({ params: [typedData(), ACCOUNT_ADDRESS] } as never))).rejects.toMatchObject({
      code: RpcErrorCode.INVALID_PARAMS,
    })
  })

  it('signs typed data whose domain omits chainId', async () => {
    // EIP-712 makes every domain field optional; Snapshot votes and many
    // login payloads carry no chainId.
    const withoutChainId = typedData()
    delete (withoutChainId.domain as Record<string, unknown>).chainId
    await expect(
      signTypedDataV4(params({ params: [ACCOUNT_ADDRESS, JSON.stringify(withoutChainId)] } as never))
    ).resolves.toMatch(/^0x[0-9a-f]+$/i)
  })

  it('rejects a zero chainId', async () => {
    await expect(
      signTypedDataV4(params({ params: [ACCOUNT_ADDRESS, JSON.stringify(typedData({ chainId: 0 }))] } as never))
    ).rejects.toBeInstanceOf(JsonRpcError)
  })

  it('rejects a chainId that does not match the connected network', async () => {
    await expect(
      signTypedDataV4(params({ params: [ACCOUNT_ADDRESS, JSON.stringify(typedData({ chainId: 1 }))] } as never))
    ).rejects.toMatchObject({ message: expect.stringContaining('Invalid chainId') })
  })

  it('accepts a hex-encoded chainId matching the network', async () => {
    const hex = `0x${CHAIN_ID.toString(16)}`
    await expect(
      signTypedDataV4(params({ params: [ACCOUNT_ADDRESS, JSON.stringify(typedData({ chainId: hex }))] } as never))
    ).resolves.toMatch(/^0x[0-9a-f]+$/i)
  })
})

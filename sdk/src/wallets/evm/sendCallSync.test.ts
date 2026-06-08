import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../../core/configuration/account'
import { AccountTypeEnum } from '../../types/types'
import { sendCallsSync } from './sendCallSync'

// The on-chain digest the API returns as `signableHash`. Calibur's validateUserOp
// recovers the signer with `ECDSA.recover(signableHash, sig)`, so delegated accounts
// MUST sign it raw (no EIP-191 prefix) — that is `signer.sign(hash, false, false)`.
// A regular smart account expects the default EIP-191 path: `signer.sign(hash)`.
const SIGNABLE_HASH = '0x0164d23948ae26436b50fb1de3e54d23ed476871ddec13f5204bda26e0f4b9ba'
const CALIBUR_IMPL = '0x000000009b1d0af20d8c6d0a44e162d11f9b8f00'
const OTHER_IMPL = '0x00000000000000000000000000000000deadbeef'

// A full-length (65-byte) ECDSA signature so the EIP-7702 authorization path can
// parse r/s/v without tripping over a truncated stub.
const DUMMY_SIG = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b`

// On-chain code of an EOA delegated under EIP-7702: 0xef0100 ‖ implementation.
const designatorFor = (impl: string) => `0xef0100${impl.slice(2)}`

const makeBackendClient = () => ({
  config: { backend: { accessToken: 'pk_test' } },
  transactionIntentsApi: {
    createTransactionIntent: vi.fn().mockResolvedValue({
      data: {
        id: 'tin_1',
        nextAction: { payload: { signableHash: SIGNABLE_HASH } },
      },
    }),
    signature: vi.fn().mockResolvedValue({
      data: {
        id: 'tin_1',
        response: { status: 1, transactionHash: '0xabc', logs: [] },
      },
    }),
  },
})

const makeRpcProvider = (code: string = designatorFor(CALIBUR_IMPL)) => ({
  getCode: vi.fn().mockResolvedValue(code),
  getTransactionCount: vi.fn().mockResolvedValue(0),
})

// Builds the call args plus handles to the underlying mocks. The args are cast to
// the real parameter type so each `account` literal is still checked against the
// `Account` shape, while the loose mocks (signer/backend/rpc) are exposed
// separately for assertions.
const setup = (account: Partial<Account>, rpcProvider = makeRpcProvider()) => {
  const signer = { sign: vi.fn().mockResolvedValue(DUMMY_SIG) }
  const backendClient = makeBackendClient()
  const args = {
    params: [{ to: '0x1111111111111111111111111111111111111111', data: '0x' }],
    signer,
    account,
    authentication: { token: 'jwt' },
    backendClient,
    rpcProvider,
  }
  return {
    args: args as unknown as Parameters<typeof sendCallsSync>[0],
    signer,
    rpcProvider,
    createTransactionIntent: backendClient.transactionIntentsApi.createTransactionIntent,
  }
}

const signedAuthorizationOf = (createTransactionIntent: ReturnType<typeof vi.fn>) =>
  createTransactionIntent.mock.calls[0]?.[0]?.createTransactionIntentRequest?.signedAuthorization

const delegatedAccount = (overrides: Partial<Account> = {}): Partial<Account> => ({
  id: 'acc_1',
  accountType: AccountTypeEnum.DELEGATED_ACCOUNT,
  address: '0x2222222222222222222222222222222222222222',
  implementationAddress: CALIBUR_IMPL,
  chainId: 84532,
  ...overrides,
})

describe('sendCallsSync — signature gate (AA24 regression)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signs the raw hash (no EIP-191) for an EIP-7702 delegated account', async () => {
    const { args, signer } = setup(delegatedAccount())

    await sendCallsSync(args)

    expect(signer.sign).toHaveBeenLastCalledWith(SIGNABLE_HASH, false, false)
  })

  it('uses the default EIP-191 path for a non-delegated smart account', async () => {
    const { args, signer } = setup({
      id: 'acc_2',
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      address: '0x3333333333333333333333333333333333333333',
      chainId: 84532,
    })

    await sendCallsSync(args)

    expect(signer.sign).toHaveBeenCalledTimes(1)
    expect(signer.sign).toHaveBeenCalledWith(SIGNABLE_HASH)
  })

  it('signs the raw hash on zkSync chains (300/324) even when not delegated', async () => {
    const { args, signer } = setup({
      id: 'acc_3',
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      address: '0x4444444444444444444444444444444444444444',
      chainId: 300,
    })

    await sendCallsSync(args)

    expect(signer.sign).toHaveBeenCalledWith(SIGNABLE_HASH, false, false)
  })
})

describe('sendCallsSync — EIP-7702 authorization gate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips re-authorization when already delegated to the expected implementation', async () => {
    const { args, signer, createTransactionIntent } = setup(delegatedAccount())

    await sendCallsSync(args)

    // Only the signableHash is signed — no separate authorization signature.
    expect(signer.sign).toHaveBeenCalledTimes(1)
    expect(signedAuthorizationOf(createTransactionIntent)).toBeUndefined()
  })

  it('re-authorizes a bare EOA and passes the signed authorization to the backend', async () => {
    const { args, signer, createTransactionIntent } = setup(delegatedAccount(), makeRpcProvider('0x'))

    await sendCallsSync(args)

    // One signature for the authorization, one for the signableHash.
    expect(signer.sign).toHaveBeenCalledTimes(2)
    expect(signer.sign).toHaveBeenLastCalledWith(SIGNABLE_HASH, false, false)
    expect(signedAuthorizationOf(createTransactionIntent)).toEqual(expect.stringMatching(/^0x[0-9a-f]+$/i))
  })

  it('re-authorizes when the EOA is delegated to a DIFFERENT implementation (the AA24 case)', async () => {
    const { args, signer, createTransactionIntent } = setup(
      delegatedAccount(),
      makeRpcProvider(designatorFor(OTHER_IMPL))
    )

    await sendCallsSync(args)

    expect(signer.sign).toHaveBeenCalledTimes(2)
    expect(signedAuthorizationOf(createTransactionIntent)).toEqual(expect.stringMatching(/^0x[0-9a-f]+$/i))
  })

  it('re-authorizes (fails open) when the delegation check cannot read on-chain code', async () => {
    const rpcProvider = {
      getCode: vi.fn().mockRejectedValue(new Error('rpc down')),
      getTransactionCount: vi.fn().mockResolvedValue(0),
    }
    const { args, createTransactionIntent } = setup(delegatedAccount(), rpcProvider)

    await sendCallsSync(args)

    expect(signedAuthorizationOf(createTransactionIntent)).toEqual(expect.stringMatching(/^0x[0-9a-f]+$/i))
  })

  it('throws an actionable error when a delegated account has no implementationAddress', async () => {
    const { args } = setup(delegatedAccount({ implementationAddress: undefined }))

    await expect(sendCallsSync(args)).rejects.toThrow(/implementationAddress/)
  })

  it('throws an actionable error when a delegated account has no chainId', async () => {
    const { args } = setup(delegatedAccount({ chainId: undefined }))

    await expect(sendCallsSync(args)).rejects.toThrow(/chainId/)
  })
})

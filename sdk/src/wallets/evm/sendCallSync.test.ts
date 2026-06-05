import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountTypeEnum } from '../../types/types'
import { sendCallsSync } from './sendCallSync'

// The on-chain digest the API returns as `signableHash`. Calibur's validateUserOp
// recovers the signer with `ECDSA.recover(signableHash, sig)`, so delegated accounts
// MUST sign it raw (no EIP-191 prefix) — that is `signer.sign(hash, false, false)`.
// A regular smart account expects the default EIP-191 path: `signer.sign(hash)`.
const SIGNABLE_HASH = '0x0164d23948ae26436b50fb1de3e54d23ed476871ddec13f5204bda26e0f4b9ba'
const CALIBUR_IMPL = '0x000000009b1d0af20d8c6d0a44e162d11f9b8f00'

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

// EOA already delegated on-chain to the expected implementation, so the
// authorization branch is skipped and `signer.sign` is only invoked for the
// signableHash — keeping the assertion on the signing gate unambiguous.
const makeRpcProvider = () => ({
  getCode: vi.fn().mockResolvedValue(`0xef0100${CALIBUR_IMPL.slice(2)}`),
  getTransactionCount: vi.fn().mockResolvedValue(0),
})

const baseArgs = (account: Record<string, unknown>) => ({
  params: [{ to: '0x1111111111111111111111111111111111111111', data: '0x' }],
  signer: { sign: vi.fn().mockResolvedValue('0xsig') },
  account,
  authentication: { token: 'jwt' },
  backendClient: makeBackendClient(),
  rpcProvider: makeRpcProvider(),
})

describe('sendCallsSync — signature gate (AA24 regression)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signs the raw hash (no EIP-191) for an EIP-7702 delegated account', async () => {
    const args = baseArgs({
      id: 'acc_1',
      accountType: AccountTypeEnum.DELEGATED_ACCOUNT,
      address: '0x2222222222222222222222222222222222222222',
      implementationAddress: CALIBUR_IMPL,
      chainId: 84532,
    })

    await sendCallsSync(args as never)

    expect(args.signer.sign).toHaveBeenCalledTimes(1)
    expect(args.signer.sign).toHaveBeenCalledWith(SIGNABLE_HASH, false, false)
  })

  it('uses the default EIP-191 path for a non-delegated smart account', async () => {
    const args = baseArgs({
      id: 'acc_2',
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      address: '0x3333333333333333333333333333333333333333',
      chainId: 84532,
    })

    await sendCallsSync(args as never)

    expect(args.signer.sign).toHaveBeenCalledTimes(1)
    expect(args.signer.sign).toHaveBeenCalledWith(SIGNABLE_HASH)
  })

  it('signs the raw hash on zkSync chains (300/324) even when not delegated', async () => {
    const args = baseArgs({
      id: 'acc_3',
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      address: '0x4444444444444444444444444444444444444444',
      chainId: 300,
    })

    await sendCallsSync(args as never)

    expect(args.signer.sign).toHaveBeenCalledWith(SIGNABLE_HASH, false, false)
  })
})

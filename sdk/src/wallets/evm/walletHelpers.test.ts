import { describe, expect, it, vi } from 'vitest'
import { AccountType, type OpenfortEventMap, OpenfortEvents } from '../../types/types'
import TypedEventEmitter from '../../utils/typedEventEmitter'
import type { Signer } from '../isigner'
import { signMessage } from './walletHelpers'

const HASH = `0x${'11'.repeat(32)}`
const RAW_SIGNATURE = `0x${'ab'.repeat(65)}`
const ERC6492_MAGIC_BYTES = '6492649264926492649264926492649264926492649264926492649264926492'
const ADDRESS = '0x1111111111111111111111111111111111111111'

const listenTo = (emitter: TypedEventEmitter<OpenfortEventMap>) => {
  const listener = vi.fn()
  emitter.on(OpenfortEvents.ON_SIGNED_MESSAGE, listener)
  return listener
}

const makeSigner = () => ({ sign: vi.fn().mockResolvedValue(RAW_SIGNATURE) }) as unknown as Signer

const baseParameters = () => {
  const eventEmitter = new TypedEventEmitter<OpenfortEventMap>()
  return {
    hash: HASH,
    type: 'message' as const,
    chainId: 8453,
    address: ADDRESS,
    signer: makeSigner(),
    eventEmitter,
    listener: listenTo(eventEmitter),
  }
}

describe('signMessage ON_SIGNED_MESSAGE', () => {
  it('emits once with the signature it returns for a plain account', async () => {
    const { listener, ...parameters } = baseParameters()

    const signature = await signMessage({ ...parameters, implementationType: AccountType.SIMPLE })

    expect(signature).toBe(RAW_SIGNATURE)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ type: 'message', message: HASH, signature })
  })

  it('emits the ERC-6492-wrapped signature, not the inner one, for an undeployed smart account', async () => {
    // The wrapped value is what the caller receives and what a verifier checks;
    // emitting the pre-wrap signature would report something that never left
    // the SDK.
    const { listener, ...parameters } = baseParameters()

    const signature = await signMessage({
      ...parameters,
      type: 'typedData',
      implementationType: AccountType.UPGRADEABLE_V6,
      ownerAddress: ADDRESS,
      factoryAddress: '0x3333333333333333333333333333333333333333',
      salt: `0x${'00'.repeat(32)}`,
    })

    expect(signature.endsWith(ERC6492_MAGIC_BYTES)).toBe(true)
    expect(signature).not.toBe(RAW_SIGNATURE)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ type: 'typedData', message: HASH, signature })
  })

  it('emits the plain signature when a factory and salt sit on a non-upgradeable account', async () => {
    // Wrapping needs BOTH a factory/salt AND a V5/V6 implementation; this
    // combination falls through to the plain signature, and the event has to
    // follow it rather than assume a wrap happened.
    const { listener, ...parameters } = baseParameters()

    const signature = await signMessage({
      ...parameters,
      implementationType: AccountType.SIMPLE,
      ownerAddress: ADDRESS,
      factoryAddress: '0x3333333333333333333333333333333333333333',
      salt: `0x${'00'.repeat(32)}`,
    })

    expect(signature).toBe(RAW_SIGNATURE)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ type: 'message', message: HASH, signature: RAW_SIGNATURE })
  })

  it('does not emit when signing fails', async () => {
    const { listener, ...parameters } = baseParameters()
    const signer = { sign: vi.fn().mockRejectedValue(new Error('user rejected')) } as unknown as Signer

    await expect(signMessage({ ...parameters, signer, implementationType: AccountType.SIMPLE })).rejects.toThrow(
      'user rejected'
    )

    expect(listener).not.toHaveBeenCalled()
  })
})

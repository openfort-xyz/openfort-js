import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenfortEvents } from '../types/types'

// Heavy leaf modules the constructor pulls in but this test never exercises.
vi.mock('@openfort/openapi-clients', () => ({
  BackendApiClients: class {},
  Configuration: class {},
}))
vi.mock('./errors/sentry', () => ({
  InternalSentry: { init: vi.fn() },
  sentry: { captureException: vi.fn() },
}))
vi.mock('./passkey', () => ({
  PasskeyHandler: class {},
}))

import { Openfort } from './openfort'

const SIGNATURE = `0x${'ab'.repeat(65)}`
const INTENT_HASH = `0x${'11'.repeat(32)}`

beforeEach(() => {
  vi.restoreAllMocks()
})

function makeOpenfort() {
  // Bound in the constructor, so the spy has to exist before construction.
  vi.spyOn(Openfort.prototype, 'validateAndRefreshToken').mockResolvedValue(undefined)
  vi.spyOn(Openfort.prototype as any, 'ensureInitialized').mockResolvedValue(undefined)

  const openfort = new Openfort({ baseConfiguration: { publishableKey: 'pk_test_fake' } })
  const signer = { sign: vi.fn().mockResolvedValue(SIGNATURE) }
  ;((openfort as any).embeddedWalletInstance as any).signer = signer

  const signedMessages = vi.fn()
  openfort.eventEmitter.on(OpenfortEvents.ON_SIGNED_MESSAGE, signedMessages)

  return { openfort, signer, signedMessages }
}

describe('ProxyApi transaction-intent signing', () => {
  // ProxyApi signs a transaction intent's nextAction.hash through a factory
  // built in Openfort's constructor. That factory used to call the public
  // signMessage(), so every transaction intent surfaced as ON_SIGNED_MESSAGE.
  it('signs the intent hash without emitting ON_SIGNED_MESSAGE', async () => {
    const { openfort, signer, signedMessages } = makeOpenfort()

    const signFunction = await (openfort.proxy as any).getSignerSignFunction()
    const signature = await signFunction(INTENT_HASH)

    expect(signature).toBe(SIGNATURE)
    expect(signer.sign).toHaveBeenCalledWith(INTENT_HASH, true, true, undefined)
    expect(signedMessages).not.toHaveBeenCalled()
  })

  it('still emits ON_SIGNED_MESSAGE when the same wallet signs an actual message', async () => {
    // The two paths share one signer; only the user-facing one reports.
    const { openfort, signedMessages } = makeOpenfort()

    const signature = await openfort.embeddedWallet.signMessage('hello world')

    expect(signedMessages).toHaveBeenCalledTimes(1)
    expect(signedMessages).toHaveBeenCalledWith({ type: 'message', message: 'hello world', signature })
  })
})

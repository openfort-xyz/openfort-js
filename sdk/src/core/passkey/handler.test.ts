import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PasskeyCreationFailedError,
  PasskeyPRFNotSupportedError,
  PasskeySeedInvalidError,
  PasskeyUserCancelledError,
} from './errors'
import { PasskeyHandler } from './handler'

const originalCredentials = globalThis.navigator?.credentials

const stubCredentials = (impl: { create?: unknown; get?: unknown }) => {
  Object.defineProperty(globalThis.navigator, 'credentials', {
    value: { create: vi.fn(), get: vi.fn(), ...impl },
    configurable: true,
    writable: true,
  })
  return globalThis.navigator.credentials as unknown as { create: ReturnType<typeof vi.fn> }
}

describe('PasskeyHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'credentials', {
      value: originalCredentials,
      configurable: true,
      writable: true,
    })
  })

  describe('randomPasskeyName', () => {
    it('returns a readable label', () => {
      expect(PasskeyHandler.randomPasskeyName()).toMatch(/^[A-Z][a-z]+( [A-Z][a-z]+){1,2}$/)
    })

    it('varies between calls', () => {
      const names = new Set(Array.from({ length: 50 }, () => PasskeyHandler.randomPasskeyName()))
      expect(names.size).toBeGreaterThan(1)
    })
  })

  describe('createPasskey seed validation', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
    ])('rejects a seed that is %s before touching the authenticator', async (_label, seed) => {
      const credentials = stubCredentials({})
      const handler = new PasskeyHandler({ rpId: 'example.com', rpName: 'Example' })
      await expect(handler.createPasskey({ id: 'device', seed })).rejects.toBeInstanceOf(PasskeySeedInvalidError)
      // The seed is the PRF input, validated before any credential exists.
      expect(credentials.create).not.toHaveBeenCalled()
    })
  })

  describe('createPasskey authenticator behaviour', () => {
    const handler = () => new PasskeyHandler({ rpId: 'example.com', rpName: 'Example' })

    it('requests a resident key with user verification and a PRF extension', async () => {
      const credentials = stubCredentials({
        create: vi.fn().mockResolvedValue({
          id: 'cred-1',
          getClientExtensionResults: () => ({ prf: { results: { first: new Uint8Array(32).buffer } } }),
        }),
      })
      await handler()
        .createPasskey({ id: 'device', seed: 'user-seed' })
        .catch(() => undefined)
      const options = credentials.create.mock.calls[0]?.[0] as {
        publicKey: PublicKeyCredentialCreationOptions
      }
      expect(options.publicKey.authenticatorSelection).toMatchObject({
        residentKey: 'required',
        userVerification: 'required',
      })
      expect(options.publicKey.extensions).toHaveProperty('prf')
    })

    it('uses a 32-byte challenge drawn from the CSPRNG', async () => {
      const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues')
      const credentials = stubCredentials({
        create: vi.fn().mockResolvedValue({
          id: 'cred-1',
          getClientExtensionResults: () => ({ prf: { results: { first: new Uint8Array(32).buffer } } }),
        }),
      })
      await handler()
        .createPasskey({ id: 'device', seed: 'user-seed' })
        .catch(() => undefined)
      const options = credentials.create.mock.calls[0]?.[0] as {
        publicKey: PublicKeyCredentialCreationOptions
      }
      expect((options.publicKey.challenge as Uint8Array).byteLength).toBe(32)
      expect(getRandomValues).toHaveBeenCalled()
    })

    it('maps a user-cancelled ceremony to PasskeyUserCancelledError', async () => {
      stubCredentials({
        create: vi.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'NotAllowedError' })),
      })
      await expect(handler().createPasskey({ id: 'device', seed: 'seed' })).rejects.toBeInstanceOf(
        PasskeyUserCancelledError
      )
    })

    // Browsers return null when the prompt is dismissed.
    it('treats a null credential as user cancellation', async () => {
      stubCredentials({ create: vi.fn().mockResolvedValue(null) })
      await expect(handler().createPasskey({ id: 'device', seed: 'seed' })).rejects.toBeInstanceOf(
        PasskeyUserCancelledError
      )
    })

    it('maps any other authenticator failure to PasskeyCreationFailedError', async () => {
      stubCredentials({
        create: vi.fn().mockRejectedValue(Object.assign(new Error('device busy'), { name: 'InvalidStateError' })),
      })
      await expect(handler().createPasskey({ id: 'device', seed: 'seed' })).rejects.toBeInstanceOf(
        PasskeyCreationFailedError
      )
    })

    it('preserves the underlying failure as cause', async () => {
      const underlying = Object.assign(new Error('device busy'), { name: 'InvalidStateError' })
      stubCredentials({ create: vi.fn().mockRejectedValue(underlying) })
      const error = await handler()
        .createPasskey({ id: 'device', seed: 'seed' })
        .catch((caught: Error) => caught)
      expect((error as Error).cause).toBe(underlying)
    })

    it('reports PRF unsupported when the authenticator omits extension results', async () => {
      stubCredentials({
        create: vi.fn().mockResolvedValue({ id: 'cred-1', getClientExtensionResults: () => null }),
      })
      await expect(handler().createPasskey({ id: 'device', seed: 'seed' })).rejects.toBeInstanceOf(
        PasskeyPRFNotSupportedError
      )
    })

    it('reports PRF unsupported when the extension returns no results', async () => {
      stubCredentials({
        create: vi.fn().mockResolvedValue({ id: 'cred-1', getClientExtensionResults: () => ({ prf: {} }) }),
      })
      await expect(handler().createPasskey({ id: 'device', seed: 'seed' })).rejects.toBeInstanceOf(
        PasskeyPRFNotSupportedError
      )
    })
  })
})

import { describe, expectTypeOf, it } from 'vitest'
import { OpenfortError, setErrorConfig } from './errors'
import { type Openfort, openfortEvents } from './index'
import type { AuthResponse, EmbeddedAccount, SignedMessagePayload, User } from './types/types'
import { EmbeddedState, OpenfortEvents } from './types/types'

/**
 * Type-level assertions on the public surface as declared in SOURCE. They
 * fail the build when a signature in this repo widens to `any` — a change
 * every runtime test survives, because consumer code still compiles while
 * giving up all checking inside the affected call. Resolution failures that
 * exist only in the BUILT declarations (`dist/*.d.ts`) are out of reach from
 * here; `environments/tsc` compiles a consumer against the packed output to
 * cover those.
 */

declare const openfort: Openfort

describe('API return types', () => {
  // `OpenfortEventMap extends Record<string, any>` and several payloads cross
  // the generated-client boundary, both of which resolve to `any` when a
  // declaration fails to resolve. Naming the exact type is what makes that
  // visible, so prefer `toEqualTypeOf` over `not.toBeAny` here.
  it('resolves concrete types rather than any', () => {
    expectTypeOf(openfort.user.get()).toEqualTypeOf<Promise<User>>()
    expectTypeOf(openfort.user.get()).not.toBeAny()
  })

  it('exposes the enum as a value, not a bare number', () => {
    expectTypeOf(EmbeddedState.READY).toEqualTypeOf<EmbeddedState>()
  })
})

describe('typed event emitter', () => {
  it('infers the payload for each event', () => {
    openfortEvents.on(OpenfortEvents.ON_AUTH_SUCCESS, (payload) => {
      expectTypeOf(payload).toEqualTypeOf<AuthResponse>()
    })

    openfortEvents.on(OpenfortEvents.ON_EMBEDDED_WALLET_CREATED, (wallet) => {
      expectTypeOf(wallet).toEqualTypeOf<EmbeddedAccount>()
    })

    openfortEvents.on(OpenfortEvents.ON_SIGNED_MESSAGE, (payload) => {
      expectTypeOf(payload).toEqualTypeOf<SignedMessagePayload>()
    })

    openfortEvents.on(OpenfortEvents.ON_SWITCH_ACCOUNT, (address) => {
      expectTypeOf(address).toEqualTypeOf<string>()
    })
  })

  it('gives a zero-argument listener for payload-free events', () => {
    openfortEvents.on(OpenfortEvents.ON_LOGOUT, (...args) => {
      expectTypeOf(args).toEqualTypeOf<[]>()
    })
  })

  it('rejects a listener whose parameter contradicts the payload', () => {
    // @ts-expect-error ON_AUTH_SUCCESS carries an AuthResponse, not a string.
    openfortEvents.on(OpenfortEvents.ON_AUTH_SUCCESS, (payload: string) => payload)
  })

  it('rejects emitting the wrong payload', () => {
    // @ts-expect-error ON_SWITCH_ACCOUNT carries exactly one string.
    openfortEvents.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, 42)
  })
})

describe('errors', () => {
  it('types the structured fields it is branched on', () => {
    const error = new OpenfortError('some_code', 'something broke')

    expectTypeOf(error.error).toEqualTypeOf<string>()
    expectTypeOf(error.error_description).toEqualTypeOf<string>()
    expectTypeOf(error.version).toEqualTypeOf<string>()
    // Optional, because only errors that opt into a docsPath resolve one.
    expectTypeOf(error.docsUrl).toEqualTypeOf<string | undefined>()
  })

  it('keeps walk() unknown so the result must be narrowed before use', () => {
    const error = new OpenfortError('some_code', 'something broke')
    expectTypeOf(error.walk()).toBeUnknown()
    expectTypeOf(error.walk((e) => e instanceof TypeError)).toBeUnknown()
  })

  it('accepts cause and docsPath, and rejects unknown options', () => {
    expectTypeOf<typeof OpenfortError>().toBeConstructibleWith('code', 'description', {
      cause: new Error('root'),
      docsPath: 'configuration/native-apps',
    })

    // @ts-expect-error `docsUrl` is derived and read-only; the option is `docsPath`.
    new OpenfortError('code', 'description', { docsUrl: 'https://example.com' })
  })

  it('requires a docsBaseUrl shaped as a string when reconfiguring', () => {
    expectTypeOf(setErrorConfig).toBeCallableWith({ docsBaseUrl: 'https://docs.example.com' })
    // @ts-expect-error the base URL is a string, not a parsed URL.
    setErrorConfig({ docsBaseUrl: new URL('https://docs.example.com') })
  })
})

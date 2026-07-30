// Compiles against the built package the way a consumer does. With
// skipLibCheck off, tsc follows every import inside the shipped .d.ts.

import type { User } from '@openfort/openfort-js'
import { Openfort, OpenfortError } from '@openfort/openfort-js'
// The subpath entry points exist so consumers can import errors and types
// without pulling in the client graph. Resolving them here keeps the `exports`
// map honest under both `bundler` and `nodenext` resolution.
import { AuthenticationError, OPENFORT_ERROR_CODES } from '@openfort/openfort-js/errors'
import { EmbeddedState } from '@openfort/openfort-js/types'

const openfort = new Openfort({
  baseConfiguration: { publishableKey: 'pk_test_placeholder' },
})

// A representative public method must keep its declared return type when
// resolved through the built declarations.
export async function getUser(): Promise<User> {
  return openfort.user.get()
}

export function isOpenfortError(error: unknown): error is OpenfortError {
  return error instanceof OpenfortError
}

// The error classes reached via the subpath must be the same ones the root
// entry point exports, or `instanceof` checks would silently stop matching for
// consumers who mix the two.
export function isAuthFailure(error: unknown): boolean {
  return (
    error instanceof AuthenticationError &&
    isOpenfortError(error) &&
    error.error === OPENFORT_ERROR_CODES.INVALID_CREDENTIALS
  )
}

export function isReady(state: EmbeddedState): boolean {
  return state === EmbeddedState.READY
}

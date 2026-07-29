// Compiles against the built package the way a consumer does. With
// skipLibCheck off, tsc follows every import inside the shipped .d.ts.
import { Openfort, OpenfortError } from '@openfort/openfort-js'
import type { User } from '@openfort/openfort-js'

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

// Resolves the `import` condition of every published entry point and asserts
// the output evaluates. A module-scope reference to a browser global, or a
// broken relative specifier in the emitted ESM, fails here.
import assert from 'node:assert/strict'

import { Openfort, OpenfortError, openfortEvents } from '@openfort/openfort-js'
import { AuthenticationError, OPENFORT_ERROR_CODES } from '@openfort/openfort-js/errors'
import { EmbeddedState } from '@openfort/openfort-js/types'

assert.equal(typeof Openfort, 'function')
assert.equal(typeof openfortEvents.on, 'function')
assert.equal(typeof OPENFORT_ERROR_CODES.INVALID_CREDENTIALS, 'string')
// Numeric enum, so the reverse mapping is what proves it survived the build.
assert.equal(EmbeddedState[EmbeddedState.READY], 'READY')

// The subpath and the root entry point must yield the same class identity, or
// `instanceof` breaks for consumers that import from both.
const { OpenfortError: OpenfortErrorFromSubpath } = await import('@openfort/openfort-js/errors')
assert.equal(OpenfortErrorFromSubpath, OpenfortError)

const error = new AuthenticationError('invalid_credentials', 'nope', 401)
assert.ok(error instanceof OpenfortError)
assert.equal(error.statusCode, 401)
// Errors carry the SDK version so a bug report identifies the build.
assert.match(error.version, /^@openfort\/openfort-js@\d+\.\d+\.\d+/)

// Constructing the client must not require a browser. It is only instantiated,
// never connected: no network or iframe access happens here.
const openfort = new Openfort({
  baseConfiguration: { publishableKey: 'pk_test_placeholder' },
})
assert.equal(typeof openfort.user.get, 'function')

console.log('esm: ok')

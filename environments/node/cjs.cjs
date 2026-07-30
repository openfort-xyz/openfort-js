// Resolves the `require` condition of every published entry point. This is the
// only check that loads dist/cjs at all — a broken CJS interop shim or a
// missing `.cjs` chunk surfaces here rather than in a consumer's app.
const assert = require('node:assert/strict')

const { Openfort, OpenfortError, openfortEvents } = require('@openfort/openfort-js')
const { AuthenticationError, OPENFORT_ERROR_CODES } = require('@openfort/openfort-js/errors')
const { EmbeddedState } = require('@openfort/openfort-js/types')

assert.equal(typeof Openfort, 'function')
assert.equal(typeof openfortEvents.on, 'function')
assert.equal(typeof OPENFORT_ERROR_CODES.INVALID_CREDENTIALS, 'string')
// Numeric enum, so the reverse mapping is what proves it survived the build.
assert.equal(EmbeddedState[EmbeddedState.READY], 'READY')

// Same class identity across entry points, as in the ESM check. The CJS build
// emits each module separately, so this catches a duplicated error module.
assert.equal(require('@openfort/openfort-js/errors').OpenfortError, OpenfortError)

const error = new AuthenticationError('invalid_credentials', 'nope', 401)
assert.ok(error instanceof OpenfortError)
assert.equal(error.statusCode, 401)
assert.match(error.version, /^@openfort\/openfort-js@\d+\.\d+\.\d+/)

const openfort = new Openfort({
  baseConfiguration: { publishableKey: 'pk_test_placeholder' },
})
assert.equal(typeof openfort.user.get, 'function')

console.log('cjs: ok')

import { describe, expect, it } from 'vitest'
import * as sdk from './index'

/**
 * Guards the public API surface. Anything exported cannot change without a
 * major version, so update this snapshot and add a changeset alongside it.
 *
 * `Object.keys` sees runtime bindings only, so the scope here is classes,
 * enums, functions and constants. Type-only exports are absent by design —
 * `verbatimModuleSyntax` erases them — which means a key appearing here is
 * proof that something ships as a real value. Renaming or dropping an exported
 * *type* is invisible to this test; `environments/tsc` covers that by compiling
 * a consumer against the built declarations.
 */
describe('public API surface', () => {
  const exported = Object.keys(sdk).sort()

  it('does not leak internal implementation details', () => {
    const internals = ['OpenfortInternal', 'SDKConfiguration', 'SDKOverrides']
    expect(exported.filter((name) => internals.includes(name))).toEqual([])
  })

  it('exports the documented entry points', () => {
    for (const name of ['Openfort', 'OpenfortError', 'AuthApi', 'EmbeddedWalletApi', 'UserApi']) {
      expect(exported).toContain(name)
    }
  })

  it('matches the recorded surface', () => {
    expect(exported).toMatchSnapshot()
  })
})

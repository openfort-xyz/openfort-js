import { describe, expect, it } from 'vitest'
import * as sdk from './index'

/**
 * Guards the public API surface. Anything exported cannot change without a
 * major version, so update this snapshot and add a changeset alongside it.
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

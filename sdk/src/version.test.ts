import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACKAGE, VERSION } from './version'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'))

describe('version', () => {
  it('VERSION is a non-empty semver-ish string', () => {
    expect(typeof VERSION).toBe('string')
    expect(VERSION.length).toBeGreaterThan(0)
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('VERSION matches sdk/package.json', () => {
    // version.ts is regenerated from package.json by copyVersion.cjs at build
    // time. If they drift, Sentry's `release` tag will lie about which build
    // emitted an event — fail loudly instead.
    expect(VERSION).toBe(pkg.version)
  })

  it('PACKAGE matches sdk/package.json name', () => {
    expect(PACKAGE).toBe(pkg.name)
    expect(PACKAGE).toBe('@openfort/openfort-js')
  })
})

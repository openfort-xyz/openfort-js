import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SDKConfiguration } from '../core/config/config'
import { debugLog } from './debug'

describe('debugLog', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(SDKConfiguration, 'getInstance').mockReturnValue({ debug: true } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const logged = () => logSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n')

  it('does not log at all when debug is disabled', () => {
    vi.spyOn(SDKConfiguration, 'getInstance').mockReturnValue({ debug: false } as never)
    debugLog('sending', { privateKey: 'super-secret' })
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('redacts wallet key material from iframe RPC payloads', () => {
    debugLog('Sending create() call', {
      args: [{ encryptionKey: 'recovery-password', accessToken: 'jwt-value' }],
    })
    const output = logged()
    expect(output).not.toContain('recovery-password')
    expect(output).not.toContain('jwt-value')
    expect(output).toContain('[redacted]')
  })

  it('redacts the private key in an export reply at any depth', () => {
    debugLog('Received export() call', { value: { response: { key: 'PRIVATE_KEY_VALUE' } } })
    expect(logged()).not.toContain('PRIVATE_KEY_VALUE')
  })

  it('redacts case-insensitively', () => {
    debugLog({ PrivateKey: 'a', ACCESSTOKEN: 'b', Password: 'c' })
    const output = logged()
    for (const secret of ['"a"', '"b"', '"c"']) expect(output).not.toContain(secret)
  })

  it('preserves non-sensitive fields so logs stay useful', () => {
    debugLog({ methodPath: 'create', callId: 'abc-123', token: 'secret' })
    const output = logged()
    expect(output).toContain('create')
    expect(output).toContain('abc-123')
    expect(output).not.toContain('secret')
  })

  it('redacts compound key names by fragment', () => {
    debugLog({ shieldAPIKey: 'shield-secret', deviceShare: 'share-value', idToken: 'id-token-value' })
    const output = logged()
    for (const secret of ['shield-secret', 'share-value', 'id-token-value']) {
      expect(output).not.toContain(secret)
    }
  })

  it('survives circular references without throwing', () => {
    const circular: Record<string, unknown> = { name: 'root' }
    circular.self = circular
    expect(() => debugLog(circular)).not.toThrow()
    expect(logged()).toContain('[circular]')
  })

  it('renders an object referenced from two siblings in both places', () => {
    const shared = { chainId: 8453 }
    debugLog({ a: shared, b: shared })
    expect(logged()).not.toContain('[circular]')
    expect(logged().match(/8453/g)).toHaveLength(2)
  })

  it('escapes newlines so values cannot forge log lines', () => {
    debugLog('a\r\nFAKE [SDK] injected')
    expect(logged()).not.toMatch(/\n/)
  })
})

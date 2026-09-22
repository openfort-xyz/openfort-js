import { BackendApiClients } from '@openfort/openapi-clients'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { makeStorage } from '../__tests__/fixtures/storage'
import { AuthManager } from '../auth/authManager'
import { StorageKeys } from '../storage/istorage'
import { AuthActionRequiredActions } from '../types/types'
import { OpenfortConfiguration, SDKConfiguration } from './config/config'
import { Authentication } from './configuration/authentication'

const baseConfiguration = new OpenfortConfiguration({ publishableKey: 'pk_test_placeholder' })

/** Sends one GET through the shared axios instance and returns the request as it left the client. */
async function sentRequest(withCredentials: boolean, authorization: string): Promise<InternalAxiosRequestConfig> {
  const clients = new BackendApiClients({
    basePath: 'https://auth.example.test/api',
    accessToken: 'pk',
    withCredentials,
  })
  const instance = (clients as unknown as { axiosInstance: AxiosInstance }).axiosInstance
  let sent: InternalAxiosRequestConfig | undefined
  instance.defaults.adapter = async (config) => {
    sent = config
    return { status: 200, statusText: '', data: {}, headers: {}, config }
  }
  await instance.get('https://auth.example.test/api/v2/users/me', { headers: { authorization } })
  return sent as InternalAxiosRequestConfig
}

describe('cookie session (customAuthDomain)', () => {
  it('derives every base URL from the delegated host and ignores the other URL overrides', () => {
    const config = new SDKConfiguration({
      baseConfiguration,
      overrides: { customAuthDomain: 'openfort-auth.example.test', backendUrl: 'https://ignored.test' },
    })

    expect(config.cookieSession).toBe(true)
    expect(config.backendUrl).toBe('https://openfort-auth.example.test/api')
    expect(config.iframeUrl).toBe('https://openfort-auth.example.test/iframe/pk_test_placeholder')
    expect(config.shieldUrl).toBe('https://openfort-auth.example.test/shield')
  })

  it('keeps the bearer defaults without a delegated host', () => {
    const config = new SDKConfiguration({ baseConfiguration })

    expect(config.cookieSession).toBe(false)
    expect(config.backendUrl).toBe('https://api.openfort.io')
    expect(config.shieldUrl).toBe('https://shield.openfort.io')
  })

  it('sends credentialed requests and drops the empty bearer a tokenless session produces', async () => {
    const sent = await sentRequest(true, 'Bearer ')

    expect(sent.withCredentials).toBe(true)
    expect(sent.headers.has('authorization')).toBe(false)
  })

  it('leaves bearer projects uncredentialed with their token intact', async () => {
    const sent = await sentRequest(false, 'Bearer session-token')

    expect(sent.withCredentials).toBeFalsy()
    expect(sent.headers.get('authorization')).toBe('Bearer session-token')
  })

  it('persists only type and userId, and restores a tokenless session', async () => {
    const storage = makeStorage()
    new Authentication('session', '', 'usr_1').save(storage)

    const [key, saved] = vi.mocked(storage.save).mock.calls[0]
    expect(key).toBe(StorageKeys.AUTHENTICATION)
    expect(JSON.parse(saved)).toEqual({ type: 'session', userId: 'usr_1' })

    vi.mocked(storage.get).mockResolvedValue(saved)
    expect(await Authentication.fromStorage(storage)).toMatchObject({ token: '', userId: 'usr_1' })
  })
})

describe('AuthManager with a cookie session', () => {
  const user = { id: 'usr_1', email: 'test@example.com' }

  const createManager = (session: unknown, cookieSession = true) => {
    const backend = {
      authApi: {
        getSessionGet: vi.fn().mockResolvedValue({ data: session }),
        signInEmailPost: vi.fn().mockResolvedValue({ data: { token: null, user } }),
        signUpEmailPost: vi.fn().mockResolvedValue({ data: { token: null, user } }),
      },
    }
    const manager = new AuthManager()
    manager.setBackendApiClients(backend as never, 'pk_test_placeholder', cookieSession)
    return { manager, backend }
  }

  it("treats a null token as signed in when get-session finds the cookie's session", async () => {
    const { manager, backend } = createManager({ session: { id: 'ses_1' }, user })

    const result = await manager.loginEmailPassword('test@example.com', 'placeholder-password')

    expect(result.token).toBe('')
    expect(backend.authApi.getSessionGet).toHaveBeenCalledWith(undefined, {
      headers: { 'x-project-key': 'pk_test_placeholder' },
    })
  })

  it('still reports email verification when sign-up left no session', async () => {
    const { manager } = createManager(null)

    const result = await manager.signupEmailPassword('test@example.com', 'placeholder-password', 'Test')

    expect(result).toEqual({ action: AuthActionRequiredActions.ACTION_VERIFY_EMAIL })
  })

  it('does not probe get-session for bearer projects', async () => {
    const { manager, backend } = createManager(null, false)

    const result = await manager.loginEmailPassword('test@example.com', 'placeholder-password')

    expect(result.token).toBeNull()
    expect(backend.authApi.getSessionGet).not.toHaveBeenCalled()
  })
})

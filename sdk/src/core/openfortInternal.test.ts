import { describe, expect, it, vi } from 'vitest'
import type { AuthManager } from '../auth/authManager'
import { type IStorage, StorageKeys } from '../storage/istorage'
import { type OpenfortEventMap, OpenfortEvents } from '../types/types'
import TypedEventEmitter from '../utils/typedEventEmitter'
import { Authentication } from './configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from './errors/authErrorCodes'
import { OpenfortError, SessionError } from './errors/openfortError'
import { OpenfortInternal } from './openfortInternal'

const createMemoryStorage = (): IStorage => {
  const values = new Map<string, string>()
  return {
    get: async (key) => values.get(key) ?? null,
    save: (key, value) => {
      values.set(key, value)
    },
    remove: (key) => {
      values.delete(key)
    },
    flush: () => values.clear(),
  }
}

/** A logged-in session whose validation fails with `error`. */
const setup = (error: unknown) => {
  const storage = createMemoryStorage()
  new Authentication('session', 'session-token', 'usr_1').save(storage)
  const authManager = { validateCredentials: vi.fn().mockRejectedValue(error) } as unknown as AuthManager
  const eventEmitter = new TypedEventEmitter<OpenfortEventMap>()
  const onLogout = vi.fn()
  eventEmitter.on(OpenfortEvents.ON_LOGOUT, onLogout)
  const internal = new OpenfortInternal(storage, authManager, eventEmitter)
  return { internal, storage, onLogout }
}

const withStatus = (statusCode: number | undefined) => {
  const error = new OpenfortError(OPENFORT_AUTH_ERROR_CODES.REQUEST_ERROR, 'request failed')
  error.statusCode = statusCode
  return error
}

describe('OpenfortInternal.validateAndRefreshToken', () => {
  it.each([
    ['a network error or timeout', withStatus(undefined)],
    ['a server error', withStatus(503)],
    ['a rate limit', withStatus(429)],
  ])('keeps the session after %s', async (_label, error) => {
    const { internal, storage, onLogout } = setup(error)

    await expect(internal.validateAndRefreshToken()).rejects.toBe(error)

    expect(await storage.get(StorageKeys.AUTHENTICATION)).not.toBeNull()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it.each([
    ['a 401', withStatus(401)],
    ['a 403', withStatus(403)],
    ['an expired session', new SessionError(OPENFORT_AUTH_ERROR_CODES.SESSION_EXPIRED, 'Session expired')],
  ])('logs out after %s', async (_label, error) => {
    const { internal, storage, onLogout } = setup(error)

    await expect(internal.validateAndRefreshToken()).rejects.toBe(error)

    expect(await storage.get(StorageKeys.AUTHENTICATION)).toBeNull()
    expect(onLogout).toHaveBeenCalledOnce()
  })
})

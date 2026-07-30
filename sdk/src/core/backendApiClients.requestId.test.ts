import { BackendApiClients, type OpenfortRequestInfo } from '@openfort/openapi-clients'
import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The shared axios instance is private; tests reach it to stub the adapter. */
function axiosOf(clients: BackendApiClients): AxiosInstance {
  return (clients as unknown as { axiosInstance: AxiosInstance }).axiosInstance
}

function stubAdapter(
  instance: AxiosInstance,
  respond: (config: InternalAxiosRequestConfig) => { status: number; data: unknown }
): Array<string | undefined> {
  const seenRequestIds: Array<string | undefined> = []
  instance.defaults.adapter = async (config) => {
    const requestId = config.headers?.['x-request-id']
    seenRequestIds.push(typeof requestId === 'string' ? requestId : undefined)
    const { status, data } = respond(config)
    const response = { status, statusText: '', data, headers: {}, config }
    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
    }
    return response
  }
  return seenRequestIds
}

describe('BackendApiClients request id correlation', () => {
  it('sends a generated UUID and reports it once through onRequest', async () => {
    const events: OpenfortRequestInfo[] = []
    const clients = new BackendApiClients({
      basePath: 'https://api.example.test',
      accessToken: 'pk_test_x',
      onRequest: (info) => events.push(info),
    })
    const instance = axiosOf(clients)
    const seen = stubAdapter(instance, () => ({ status: 200, data: { ok: true } }))

    await instance.get('https://api.example.test/v2/users')

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatch(UUID_RE)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      requestId: seen[0],
      method: 'GET',
      path: 'https://api.example.test/v2/users',
      status: 200,
    })
  })

  it('reports non-retryable failures once, with the failing status', async () => {
    const events: OpenfortRequestInfo[] = []
    const clients = new BackendApiClients({
      basePath: 'https://api.example.test',
      accessToken: 'pk_test_x',
      onRequest: (info) => events.push(info),
    })
    const instance = axiosOf(clients)
    const seen = stubAdapter(instance, () => ({ status: 400, data: { message: 'bad' } }))

    await expect(instance.post('https://api.example.test/v2/users')).rejects.toThrow()

    expect(seen).toHaveLength(1)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ requestId: seen[0], method: 'POST', status: 400 })
  })

  it('a throwing onRequest callback never breaks the request', async () => {
    const clients = new BackendApiClients({
      basePath: 'https://api.example.test',
      accessToken: 'pk_test_x',
      onRequest: () => {
        throw new Error('observability exploded')
      },
    })
    const instance = axiosOf(clients)
    stubAdapter(instance, () => ({ status: 200, data: { ok: true } }))

    const response = await instance.get('https://api.example.test/v2/users')
    expect(response.data).toEqual({ ok: true })
  })

  it('works without onRequest and still sends the header', async () => {
    const clients = new BackendApiClients({
      basePath: 'https://api.example.test',
      accessToken: 'pk_test_x',
    })
    const instance = axiosOf(clients)
    const seen = stubAdapter(instance, () => ({ status: 200, data: {} }))

    await instance.get('https://api.example.test/v2/users')
    expect(seen[0]).toMatch(UUID_RE)
  })

  it('generates a UUID even without a crypto global (React Native)', async () => {
    // Simulate React Native: Hermes has no crypto global unless polyfilled.
    vi.stubGlobal('crypto', undefined)
    try {
      const clients = new BackendApiClients({
        basePath: 'https://api.example.test',
        accessToken: 'pk_test_x',
      })
      const instance = axiosOf(clients)
      const seen = stubAdapter(instance, () => ({ status: 200, data: {} }))

      await instance.get('https://api.example.test/v2/users')
      expect(seen[0]).toMatch(UUID_RE)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

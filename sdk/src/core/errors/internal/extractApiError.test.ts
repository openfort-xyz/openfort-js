import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { OpenfortError } from '../openfortError'
import { extractApiError } from './extractApiError'

function makeAxiosError(options: { requestId?: string; status?: number; data?: unknown }): AxiosError {
  const headers = new AxiosHeaders()
  if (options.requestId) {
    headers.set('x-request-id', options.requestId)
  }
  const config = { headers, method: 'post', url: '/v1/sessions' }
  const response =
    options.status !== undefined
      ? {
          status: options.status,
          statusText: '',
          headers: {},
          // biome-ignore lint/suspicious/noExplicitAny: test fixture
          config: config as any,
          data: options.data,
        }
      : undefined
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    // biome-ignore lint/suspicious/noExplicitAny: test fixture
    config as any,
    undefined,
    response
  )
}

describe('extractApiError request id correlation', () => {
  it('attaches the sent x-request-id to the extracted error', () => {
    const error = extractApiError(
      makeAxiosError({
        requestId: 'lp-123',
        status: 500,
        data: { message: 'boom' },
      })
    )
    expect(error).toBeInstanceOf(OpenfortError)
    expect(error.requestId).toBe('lp-123')
  })

  it('attaches the id even when no response was received (timeout/network)', () => {
    const error = extractApiError(makeAxiosError({ requestId: 'lp-timeout' }))
    expect(error.requestId).toBe('lp-timeout')
  })

  it('leaves requestId undefined when the header was never set', () => {
    const error = extractApiError(makeAxiosError({ status: 404, data: { message: 'nope' } }))
    expect(error.requestId).toBeUndefined()
  })
})

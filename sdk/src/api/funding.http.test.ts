// @vitest-environment node

import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { BackendApiClients } from '@openfort/openapi-clients'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OpenfortError } from '../core/errors/openfortError'
import { FundingApi } from './funding'

type SeenRequest = { method?: string; url?: string; authorization?: string; body?: unknown }

const seen: SeenRequest[] = []
const readJson = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined
}

const server = createServer(async (request, response) => {
  const body = await readJson(request)
  seen.push({
    method: request.method,
    url: request.url,
    authorization: request.headers.authorization,
    body,
  })
  response.setHeader('content-type', 'application/json')

  if (request.url === '/v2/funding/chains?livemode=true') {
    response.statusCode = 400
    response.end(JSON.stringify({ error: { message: 'live chains disabled' } }))
    return
  }
  if (request.url?.startsWith('/v2/funding/sessions/fnd_1/methods')) {
    response.end(JSON.stringify({ country: 'US', methods: [{ method: 'card', provider: 'coinbase', angle: 'popup' }] }))
    return
  }
  if (request.url === '/v2/funding/sessions/fnd_1/quotes') {
    response.end(
      JSON.stringify({
        provider: 'stripe',
        sourceAmount: '25.00',
        sourceCurrency: 'USD',
        destinationAmount: '24.50',
        destinationCurrency: 'USDC',
        destinationNetwork: 'arbitrum',
        fees: [],
        exchangeRate: '1',
        relay: {
          destinationAmount: '24.40',
          destinationCurrency: '0xtarget',
          destinationChain: 'eip155:42161',
          fees: [],
          minAmount: '1000000',
        },
      })
    )
    return
  }
  if (request.url === '/v2/funding/sessions/fnd_1/payment_methods') {
    response.end(JSON.stringify({ id: 'fnd_1', clientSecret: 'cs_1', status: 'waiting_payment', paymentMethod: null }))
    return
  }
  if (request.url === '/v2/funding/sessions/fnd_1/onramp_checkout') {
    response.end(JSON.stringify({ clientSecret: 'provider_secret' }))
    return
  }
  if (request.url === '/v2/funding/onramp/verifications') {
    response.end(JSON.stringify({ verificationId: 'verification_1' }))
    return
  }
  if (request.url === '/v2/funding/onramp/verifications/verification_1/submit') {
    response.end(JSON.stringify({ verificationId: 'verification_1', verificationExpiresAt: 'later' }))
    return
  }
  if (request.url === '/v2/funding/onramp/auth_intents') {
    response.end(JSON.stringify({ id: 'lai_1' }))
    return
  }
  if (request.url === '/v2/funding/onramp/auth_intents/lai_1/tokens') {
    response.end(JSON.stringify({ exchanged: true }))
    return
  }
  if (request.url === '/v2/funding/chains?livemode=false') {
    response.end(JSON.stringify({ chains: [] }))
    return
  }

  response.statusCode = 404
  response.end(JSON.stringify({ error: { message: 'unexpected request' } }))
})

let funding: FundingApi

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  funding = new FundingApi(new BackendApiClients({ basePath: `http://127.0.0.1:${port}`, accessToken: 'pk_test_http' }))
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

describe('FundingApi HTTP contract', () => {
  it('serializes session onramp operations through the generated client', async () => {
    seen.length = 0
    await funding.sessions.methods('fnd_1', { clientSecret: 'cs_1', country: 'US', subdivision: 'NY' })
    const quote = await funding.sessions.quote('fnd_1', {
      clientSecret: 'cs_1',
      method: 'card',
      sourceAmount: '25.00',
      sourceCurrency: 'USD',
      subdivision: 'NY',
      refundTo: '0xrefund',
    })
    await funding.sessions.setPaymentMethod('fnd_1', {
      clientSecret: 'cs_1',
      paymentMethod: { type: 'onramp', method: 'card', subdivision: 'NY' },
    })
    await funding.sessions.checkout('fnd_1', { clientSecret: 'cs_1' })
    await funding.verifications.create({ channel: 'sms', destination: '+14155550123' })
    await funding.verifications.submit('verification_1', '000000')
    await funding.embedded.createAuthIntent({ email: 'buyer@example.com' })
    await funding.embedded.exchangeToken('lai_1')
    await funding.chains({ livemode: false })

    expect(quote.relay?.destinationAmount).toBe('24.40')
    expect(seen.map(({ method, url }) => `${method} ${url}`)).toEqual([
      'GET /v2/funding/sessions/fnd_1/methods?clientSecret=cs_1&country=US&subdivision=NY',
      'POST /v2/funding/sessions/fnd_1/quotes',
      'POST /v2/funding/sessions/fnd_1/payment_methods',
      'POST /v2/funding/sessions/fnd_1/onramp_checkout',
      'POST /v2/funding/onramp/verifications',
      'POST /v2/funding/onramp/verifications/verification_1/submit',
      'POST /v2/funding/onramp/auth_intents',
      'POST /v2/funding/onramp/auth_intents/lai_1/tokens',
      'GET /v2/funding/chains?livemode=false',
    ])
    expect(seen.slice(0, -1).every(({ authorization }) => authorization === 'Bearer pk_test_http')).toBe(true)
    expect(seen.at(-1)?.authorization).toBeUndefined()
    expect(seen[1]?.body).toMatchObject({ subdivision: 'NY', refundTo: '0xrefund' })
    expect(seen[2]?.body).toMatchObject({ paymentMethod: { type: 'onramp', subdivision: 'NY' } })
  })

  it('maps a generated-client structured error', async () => {
    const error = await funding.chains({ livemode: true }).catch((caught) => caught)
    expect(error).toBeInstanceOf(OpenfortError)
    expect(error.message).toContain('live chains disabled')
  })
})

import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import { Openfort } from '../sdk/dist/sdk/src/index.js'

const publishableKey = process.env.OPENFORT_PUBLISHABLE_KEY
const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET
const backendUrl = process.env.OPENFORT_BACKEND_URL ?? 'http://127.0.0.1:3100'
const providerPort = Number(process.env.COINBASE_FIXTURE_PORT ?? 3199)

if (!publishableKey || !webhookSecret) {
  throw new Error('Set OPENFORT_PUBLISHABLE_KEY and COINBASE_WEBHOOK_SECRET')
}

const provider = createServer(async (request, response) => {
  for await (const _ of request) {
    // Drain the request before replying, matching a normal provider server.
  }
  response.setHeader('content-type', 'application/json')
  response.end(
    JSON.stringify({
      session: { onrampUrl: 'https://pay.test/openfort', sessionId: 'coinbase_smoke', status: 'PENDING' },
      quote: {
        paymentTotal: '10.25',
        paymentSubtotal: '10.00',
        paymentCurrency: 'USD',
        purchaseAmount: '10.00',
        purchaseCurrency: 'USDC',
        destinationNetwork: 'base',
        fees: [{ type: 'FEE_TYPE_EXCHANGE', amount: '0.25', currency: 'USD' }],
        exchangeRate: '1.0',
      },
    })
  )
})

await new Promise((resolve, reject) => {
  provider.once('error', reject)
  provider.listen(providerPort, '127.0.0.1', resolve)
})

try {
  const values = new Map()
  const storage = {
    get: async (key) => values.get(key) ?? null,
    save: (key, value) => values.set(key, value),
    remove: (key) => values.delete(key),
    flush: () => values.clear(),
  }
  const openfort = new Openfort({
    baseConfiguration: { publishableKey },
    overrides: { backendUrl, storage },
    disableTelemetry: true,
  })
  await openfort.waitForInitialization()

  const session = await openfort.funding.sessions.create({
    target: {
      chain: 'eip155:8453',
      currency: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      address: '0x03508bB71268BBA25ECaCC8F620e01866650532c',
    },
  })
  const region = { country: 'US', subdivision: 'ny' }
  const methods = await openfort.funding.sessions.methods(session.id, region)
  const card = methods.methods.find(({ method, angle }) => method === 'card' && angle === 'popup')
  if (!card) throw new Error('Expected the Coinbase popup card method')

  await openfort.funding.sessions.quote(session.id, {
    method: 'card',
    sourceAmount: '10',
    sourceCurrency: 'USD',
    ...region,
  })
  const committed = await openfort.funding.sessions.setPaymentMethod(session.id, {
    paymentMethod: {
      type: 'onramp',
      method: 'card',
      sourceAmount: '10',
      sourceCurrency: 'USD',
      ...region,
    },
  })
  if (committed.status !== 'waiting_payment') throw new Error(`Unexpected commit status: ${committed.status}`)

  const body = JSON.stringify({ eventType: 'onramp.transaction.success', partnerUserRef: session.id })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', webhookSecret).update(`${timestamp}.${body}`).digest('hex')
  const webhook = await fetch(`${backendUrl}/v2/funding/webhooks/coinbase`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hook0-signature': `t=${timestamp},v0=${signature}` },
    body,
  })
  if (!webhook.ok) throw new Error(`Webhook failed (${webhook.status}): ${await webhook.text()}`)

  const terminal = await openfort.funding.sessions.wait(session.id, { pollMs: 50, timeoutMs: 2_000 })
  if (terminal.status !== 'succeeded') throw new Error(`Unexpected terminal status: ${terminal.status}`)
  console.log(`Funding onramp smoke passed: ${session.id} -> ${terminal.status}`)
} finally {
  await new Promise((resolve) => provider.close(resolve))
}

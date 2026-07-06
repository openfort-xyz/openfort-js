import { describe, expect, it, vi } from 'vitest'
import type { Message } from './browserMessenger/types'
import { ReactNativeMessenger } from './ReactNativeMessenger'

// One microtask tick — enough for the messenger's queueMicrotask flush,
// which is scheduled before this await's continuation is queued.
const runMicrotasks = () => Promise.resolve()

function makeMessenger() {
  return new ReactNativeMessenger({ postMessage: vi.fn() })
}

// The iframe's first handshake message, in the deprecated (v5) wire format
// the WebView delivers. The messenger upgrades it to a modern SYN.
const deprecatedSyn = { penpal: 'syn', participantId: 'participant-1' }

describe('ReactNativeMessenger buffered-message flush ordering', () => {
  it('delivers messages buffered before initialize() to handlers registered after initialize()', async () => {
    const messenger = makeMessenger()

    // Message arrives before anyone initialized the messenger — the exact
    // shape of the production handshake, where the iframe's SYN triggers
    // manager initialization.
    messenger.handleMessage(deprecatedSyn)

    // Mirror penpal's connect(): initialize, then register handlers, all in
    // one synchronous block. A synchronous flush inside initialize() would
    // fire before the handler exists and drop the SYN.
    const received: unknown[] = []
    messenger.initialize()
    messenger.addMessageHandler((message) => received.push(message))

    expect(received).toHaveLength(0)

    await runMicrotasks()

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ namespace: 'penpal', type: 'SYN', participantId: 'participant-1' })
  })

  it('preserves arrival order for messages received between initialize() and the flush', async () => {
    const messenger = makeMessenger()

    messenger.handleMessage(deprecatedSyn)

    const received: { type?: string; penpal?: string }[] = []
    messenger.initialize()
    messenger.addMessageHandler((message) => received.push(message))

    // Arrives while the flush is still pending — must queue behind the
    // buffered SYN, not jump ahead of it.
    messenger.handleMessage({ penpal: 'synAck', methodNames: ['sign'] })

    await runMicrotasks()

    expect(received.map((m) => m.type)).toEqual(['SYN', 'ACK1'])
  })

  it('processes messages synchronously once the flush has completed', async () => {
    const messenger = makeMessenger()
    const received: unknown[] = []

    messenger.initialize()
    messenger.addMessageHandler((message) => received.push(message))
    await runMicrotasks()

    messenger.handleMessage(deprecatedSyn)

    expect(received).toHaveLength(1)
  })

  it('does not deliver buffered messages after destroy()', async () => {
    const messenger = makeMessenger()
    const received: unknown[] = []

    messenger.handleMessage(deprecatedSyn)
    messenger.initialize()
    messenger.addMessageHandler((message) => received.push(message))

    messenger.destroy()
    await runMicrotasks()

    expect(received).toHaveLength(0)
  })

  it('still validates flushed messages when a validator is provided', async () => {
    const messenger = makeMessenger()
    const received: unknown[] = []

    messenger.handleMessage({ unrelated: true })
    messenger.handleMessage(deprecatedSyn)

    messenger.initialize({
      validateReceivedMessage: (data: unknown): data is Message =>
        !!data && typeof data === 'object' && (data as { namespace?: string }).namespace === 'penpal',
    })
    messenger.addMessageHandler((message) => received.push(message))

    await runMicrotasks()

    // The non-penpal message is filtered by the validator; the upgraded SYN
    // passes.
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ type: 'SYN' })
  })
})

import { describe, expect, it, vi } from 'vitest'
import connect from './connect'
import type { Message } from './types'

// A minimal in-memory Messenger that records outgoing messages and lets the
// test play the remote participant by injecting handshake messages.
function makeFakeMessenger() {
  const handlers = new Set<(message: Message) => void>()
  const sent: any[] = []
  return {
    initialize: vi.fn(),
    addMessageHandler: (cb: (message: Message) => void) => {
      handlers.add(cb)
    },
    removeMessageHandler: (cb: (message: Message) => void) => {
      handlers.delete(cb)
    },
    sendMessage: (message: any) => {
      sent.push(message)
    },
    destroy: vi.fn(),
    emit: (message: any) => {
      for (const handler of [...handlers]) {
        handler(message)
      }
    },
    sent,
  }
}

// Remote participant IDs are compared as strings to pick the handshake
// leader. '!' (0x21) sorts below every hex digit, so an id of '!!' guarantees
// the local participant (a random UUID) is the leader and will send ACK1 —
// which makes the handshake fully drivable from the test: we inject SYN and
// ACK2, the local side does the rest.
const completeHandshakeAs = (messenger: ReturnType<typeof makeFakeMessenger>, remoteId: string) => {
  messenger.emit({ namespace: 'penpal', type: 'SYN', channel: undefined, participantId: remoteId })
  messenger.emit({ namespace: 'penpal', type: 'ACK2', channel: undefined })
}

describe('shakeHands remote re-connect detection', () => {
  it('completes the handshake without firing onRemoteReconnect', async () => {
    const messenger = makeFakeMessenger()
    const onRemoteReconnect = vi.fn()
    const connection = connect({ messenger: messenger as any, timeout: 5000, onRemoteReconnect })

    completeHandshakeAs(messenger, '!!')

    await expect(connection.promise).resolves.toBeDefined()
    expect(onRemoteReconnect).not.toHaveBeenCalled()

    // The local side must have sent SYN(s) and, as leader, an ACK1.
    expect(messenger.sent.some((m) => m.type === 'SYN')).toBe(true)
    expect(messenger.sent.some((m) => m.type === 'ACK1')).toBe(true)

    connection.destroy()
  })

  it('fires onRemoteReconnect when the remote completes a NEW handshake after the connection was established', async () => {
    const messenger = makeFakeMessenger()
    const onRemoteReconnect = vi.fn()
    const connection = connect({ messenger: messenger as any, timeout: 5000, onRemoteReconnect })

    completeHandshakeAs(messenger, '!!')
    await connection.promise

    // The remote page reloads: fresh participant id, new SYN → re-handshake.
    completeHandshakeAs(messenger, '!#')

    expect(onRemoteReconnect).toHaveBeenCalledTimes(1)

    connection.destroy()
  })

  it('does not fire onRemoteReconnect for duplicate SYNs from the SAME participant', async () => {
    const messenger = makeFakeMessenger()
    const onRemoteReconnect = vi.fn()
    const connection = connect({ messenger: messenger as any, timeout: 5000, onRemoteReconnect })

    completeHandshakeAs(messenger, '!!')
    await connection.promise

    // A duplicate SYN with the same id is part of the normal double-SYN
    // protocol, not a reload — handleSynMessage ignores it entirely.
    messenger.emit({ namespace: 'penpal', type: 'SYN', channel: undefined, participantId: '!!' })

    expect(onRemoteReconnect).not.toHaveBeenCalled()

    connection.destroy()
  })

  it('keeps working when onRemoteReconnect is not provided (reconnect stays supported)', async () => {
    const messenger = makeFakeMessenger()
    const connection = connect({ messenger: messenger as any, timeout: 5000 })

    completeHandshakeAs(messenger, '!!')
    await connection.promise

    expect(() => completeHandshakeAs(messenger, '!#')).not.toThrow()

    connection.destroy()
  })
})

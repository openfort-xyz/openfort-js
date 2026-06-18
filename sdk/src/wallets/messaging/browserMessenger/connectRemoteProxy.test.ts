import { beforeAll, describe, expect, it, vi } from 'vitest'
import CallOptions from './CallOptions'
import connectRemoteProxy from './connectRemoteProxy'
import type { Message } from './types'

// The shared test setup replaces `global.window` with a stub that omits timers
// (src/__tests__/setup.ts). `connectRemoteProxy` deliberately calls
// `window.setTimeout` (a real-browser global), so point it at the env timers.
beforeAll(() => {
  const w = globalThis as any
  w.window.setTimeout = globalThis.setTimeout.bind(globalThis)
  w.window.clearTimeout = globalThis.clearTimeout.bind(globalThis)
})

// A minimal in-memory Messenger: it records outgoing CALL messages and lets the
// test inject the matching REPLY, standing in for the iframe side of penpal.
function makeFakeMessenger() {
  let handler: ((message: Message) => void) | undefined
  const sent: any[] = []
  return {
    addMessageHandler: (cb: (message: Message) => void) => {
      handler = cb
    },
    removeMessageHandler: () => {
      handler = undefined
    },
    sendMessage: (message: any) => {
      sent.push(message)
    },
    reply: (callId: string, value: unknown) => {
      handler?.({ namespace: 'penpal', channel: undefined, type: 'REPLY', callId, value } as any)
    },
    sent,
  }
}

describe('connectRemoteProxy per-call timeout', () => {
  it('rejects with METHOD_CALL_TIMEOUT when no reply arrives within the timeout', async () => {
    const messenger = makeFakeMessenger()
    const { remoteProxy } = connectRemoteProxy(messenger as any, undefined, undefined)

    await expect((remoteProxy as any).sign('0xdeadbeef', new CallOptions({ timeout: 10 }))).rejects.toMatchObject({
      code: 'METHOD_CALL_TIMEOUT',
    })
  })

  it('clears the per-call timer once the reply arrives, leaking no timer', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const messenger = makeFakeMessenger()
    const { remoteProxy } = connectRemoteProxy(messenger as any, undefined, undefined)

    const pending = (remoteProxy as any).sign('0xdeadbeef', new CallOptions({ timeout: 10_000 }))
    const callId = messenger.sent[0].id
    messenger.reply(callId, { signature: '0xsig' })

    await expect(pending).resolves.toEqual({ signature: '0xsig' })
    // The reply path must clear the 10s timer — otherwise it lingers until
    // expiry. Without that clear, this assertion fails.
    expect(clearSpy).toHaveBeenCalled()

    clearSpy.mockRestore()
  })

  it('does not arm a timer when no timeout is supplied', async () => {
    const messenger = makeFakeMessenger()
    const { remoteProxy } = connectRemoteProxy(messenger as any, undefined, undefined)

    const pending = (remoteProxy as any).sign('0xdeadbeef')
    const callId = messenger.sent[0].id
    messenger.reply(callId, { signature: '0xsig' })

    await expect(pending).resolves.toEqual({ signature: '0xsig' })
  })
})

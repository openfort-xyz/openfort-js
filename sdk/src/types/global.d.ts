declare global {
  interface DedicatedWorkerGlobalScope {
    readonly name: string
    onmessage: ((this: DedicatedWorkerGlobalScope, ev: MessageEvent) => any) | null
    onmessageerror: ((this: DedicatedWorkerGlobalScope, ev: MessageEvent) => any) | null
    postMessage(message: any, transfer?: Transferable[]): void
  }
}

export {}

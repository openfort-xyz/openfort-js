const _brand: unique symbol = Symbol('CallOptions')

class CallOptions {
  readonly transferables?: Transferable[]

  readonly timeout?: number

  constructor(options?: { transferables?: Transferable[]; timeout?: number }) {
    this.transferables = options?.transferables
    this.timeout = options?.timeout
  }
}

export default CallOptions

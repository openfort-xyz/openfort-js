const _brand: unique symbol = Symbol('Reply')

class Reply<T = unknown> {
  readonly value: T

  readonly transferables?: Transferable[]

  constructor(
    value: T,
    options?: {
      transferables?: Transferable[]
    }
  ) {
    this.value = value
    this.transferables = options?.transferables
  }
}

export default Reply

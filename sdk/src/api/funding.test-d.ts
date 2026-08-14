import { describe, expectTypeOf, it } from 'vitest'
import type { FundingApi, FundingSession, OnrampPaymentMethodInput } from './funding'

declare const funding: FundingApi

describe('FundingApi public types', () => {
  it('keeps fund() non-interactive', () => {
    const onramp: OnrampPaymentMethodInput = { type: 'onramp', method: 'card' }

    // @ts-expect-error Interactive onramps must use sessions.create/setPaymentMethod and checkout.
    funding.fund({ target: { chain: 'eip155:8453', currency: '0xtoken', address: '0xwallet' }, paymentMethod: onramp })
  })

  it('discriminates crypto and onramp responses by type', () => {
    const narrow = (session: FundingSession) => {
      if (session.paymentMethod?.type === 'onramp') {
        expectTypeOf(session.paymentMethod.method).toBeString()
      } else if (session.paymentMethod?.type === 'evm') {
        expectTypeOf(session.paymentMethod.receiverAddress).toBeString()
      }
    }

    expectTypeOf(narrow).toBeFunction()
  })
})

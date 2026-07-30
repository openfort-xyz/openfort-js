import { Openfort } from '@openfort/openfort-js'
import { OpenfortError } from '@openfort/openfort-js/errors'
import { EmbeddedState } from '@openfort/openfort-js/types'
import { Client } from './client'

// A server component, so this module is evaluated in Node during the build with
// no `window`, `document` or `localStorage` in scope. Constructing the client
// here is the assertion: it must defer every browser API to first use rather
// than reach for one while initializing, or a consumer's build breaks before
// their code runs.
export default function Home() {
  const openfort = new Openfort({
    baseConfiguration: { publishableKey: 'pk_test_placeholder' },
  })

  // Read a value off each entry point so none is dropped as an unused import
  // and the render actually depends on the module having loaded.
  const state = EmbeddedState[EmbeddedState.UNAUTHENTICATED]
  const errorName = new OpenfortError('probe', 'probe').name
  const hasUserApi = typeof openfort.user.get === 'function'

  return (
    <>
      <div>{`server: ${hasUserApi ? 'ok' : 'fail'} ${state} ${errorName}`}</div>
      <Client />
    </>
  )
}

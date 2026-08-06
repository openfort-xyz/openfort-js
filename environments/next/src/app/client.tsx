'use client'

import { Openfort } from '@openfort/openfort-js'
import { OpenfortError } from '@openfort/openfort-js/errors'

// The browser half of the same check. This module goes through the Next client
// bundler rather than Node's resolver, so it exercises the `import` condition
// and the ESM output — a specifier the two resolve differently shows up here and
// nowhere else. Kept out of `useEffect` on purpose: the import and the
// construction must survive bundling, which is a build-time property.
export function Client() {
  const openfort = new Openfort({
    baseConfiguration: { publishableKey: 'pk_test_placeholder' },
  })
  const ok = typeof openfort.user.get === 'function' && new OpenfortError('probe', 'probe') instanceof Error

  return <div>{`client: ${ok ? 'ok' : 'fail'}`}</div>
}

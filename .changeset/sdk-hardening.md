---
"@openfort/openfort-js": major
---

This release contains security and correctness improvements. Upgrading is
recommended for all users.

**Type declarations**

`dist/index.d.ts` previously imported several modules by bare specifier, which
do not resolve from a consumer's `node_modules`. Since `skipLibCheck` defaults
to `true` in most projects this surfaced as types resolving to `any` rather
than as an error — for example, `openfort.user.get()` resolved to
`Promise<any>` instead of `Promise<User>`. Declarations now resolve correctly,
so these types are restored. If your project relied on the loosened types, you
may see new type errors; they reflect the intended API.

**Breaking: internal exports removed**

`OpenfortInternal`, `SDKConfiguration` and `SDKOverrides` were exported
unintentionally and are no longer part of the public API. They were never
documented or supported. If you import any of them, replace the usage with a
supported API or open an issue describing the use case.

**Runtime improvements**

- Debug logging redacts sensitive fields. If you enable `debug`, values whose
  key names contain fragments such as `key`, `token`, `secret` or `share` are
  replaced before anything is written to the console.
- Error telemetry attaches an allowlisted set of fields instead of request and
  response objects, with an additional scrubbing step before events are sent.
- Retries are limited to idempotent requests (GET/HEAD/OPTIONS/PUT/DELETE),
  including on network errors, so operations such as signature submission are
  never repeated automatically.
- Requests have a 30 second default timeout per attempt; transaction
  confirmation waits get a larger dedicated budget.
- `eth_signTypedData_v4` verifies that the requested `from` address matches
  the connected account. A `domain.chainId`, when present, must name the
  connected chain; domains that omit it (per EIP-712 every domain field is
  optional) are signed as before.
- `wallet_revokePermissions` without a `permissionContext` now fails with
  `INVALID_PARAMS` instead of returning an empty object typed as a completed
  revocation.
- EIP-7702 authorization inputs are validated before signing, and a malformed
  signer response is rejected instead of being padded into a plausible-looking
  signature.

**Fixed: `require()` of this package threw on `new Openfort()`**

The CommonJS build called a dependency's module namespace object instead of its
default export, so constructing the client from a CJS consumer failed with
`TypeError: axiosRetry is not a function`. The build now emits the interop
helper that unwraps the default export, and both the ESM and CJS entry points
are loaded in CI to keep it that way.

**New: `errors` and `types` entry points**

`@openfort/openfort-js/errors` and `@openfort/openfort-js/types` expose the
error classes and the shared types and enums without reaching the client. The
root entry point initializes the global event emitter when it loads, so it
cannot be tree-shaken; importing an error class through it pulled in signing,
telemetry, and HTTP. Importing `OpenfortError` from `/errors` costs 433 B
minified and brotlied, against 237 kB for the root entry point.

```ts
import { OpenfortError } from '@openfort/openfort-js/errors'
import type { User } from '@openfort/openfort-js/types'
```

**Errors**

Errors now record the SDK version, accept and forward `cause`, and expose
`walk()` for inspecting the cause chain.

Errors may also carry a link to the documentation page for the failure,
readable as `error.docsUrl` and appended to `error.message`. Messages without
such a link are unchanged. Ecosystem SDKs that publish their own documentation
can repoint these links:

```ts
import { setErrorConfig } from '@openfort/openfort-js'

setErrorConfig({ docsBaseUrl: 'https://docs.example.com/wallet' })
```

`DEFAULT_DOCS_BASE_URL` is exported alongside it, so a wrapper can restore the
default without hard-coding a copy of the URL.

**Type-only exports are no longer runtime properties**

Types such as `User` and `AuthResponse` were emitted as runtime properties
bound to `undefined`. They are now erased, so they no longer appear in
`Object.keys(require('@openfort/openfort-js'))`. Importing them as types is
unaffected; only code that enumerated the module's runtime keys sees a
difference.

**Packaging**

The published bundle is no longer minified and ships sourcemaps with the
original TypeScript embedded, so stack traces from within the SDK are readable
and debuggers can step into SDK frames without the package shipping `src/`.

`typescript` is declared as an optional peer dependency (`>=5.9.3`) to state
the oldest compiler the published declarations are tested against. Package
managers do not install it and JavaScript consumers are unaffected.

The shipped code targets `es2022` and relies on native class semantics for
`instanceof` on error classes. Toolchains that downlevel classes inside
`node_modules` (older Metro or Babel presets) will break `instanceof
OpenfortError`; exclude this package from transpilation or match the target.

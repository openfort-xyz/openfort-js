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

- Debug logging redacts sensitive fields. If you enable `debug`, values such as
  keys and tokens are replaced before anything is written to the console.
- Error telemetry attaches an allowlisted set of fields instead of request and
  response objects, with an additional scrubbing step before events are sent.
- Retries are limited to idempotent requests, so operations such as signature
  submission are no longer repeated automatically.
- Requests have a 30 second default timeout.
- `eth_signTypedData_v4` verifies that the requested `from` address matches the
  connected account and requires `domain.chainId`, so signatures are bound to
  an account and a chain. Requests that previously succeeded without these may
  now be rejected.
- EIP-7702 authorization inputs are validated before signing.

**Errors**

Errors now record the SDK version, accept and forward `cause`, and expose
`walk()` for inspecting the cause chain.

**Packaging**

The published bundle is no longer minified and ships sourcemaps and declaration
maps, so stack traces from within the SDK are readable.

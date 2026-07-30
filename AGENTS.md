# Openfort JS SDK — contributor and agent guide

Applies to humans and AI agents alike. `CLAUDE.md` points here.

## Layout

- `sdk/` — `@openfort/openfort-js`, the only published package.
  Public surface is `sdk/src/index.ts`; anything exported there is API you
  cannot change without a major version.
  - `src/api/` wraps the generated clients
  - `src/auth/` email, OAuth, SIWE, OTP flows
  - `src/core/` client, config, errors, passkey handling
  - `src/storage/` token storage abstraction
  - `src/wallets/` embedded wallet, EVM provider, iframe bridge
  - `src/wallets/messaging/browserMessenger/` — vendored penpal; it is not an
    npm dependency. Origin validation for the iframe bridge lives in
    `messengers/WindowMessenger.ts`.
- `packages/internal/openapi-clients/` — **generated**. Never hand-edit;
  regenerate from the spec.
- `packages/platform-bridge/` — platform integration bridge.
- `environments/tsc/` — compiles a consumer project against the *built*
  package with `skipLibCheck: false`, extending declaration checks beyond what
  `publint` and `attw` cover.
- `examples/` — sample apps, not published. Sandbox credentials only.
- `test/` — a manual Vite playground, not a test suite.

## Before opening a pull request

```bash
pnpm verify
```

Runs the same checks as CI: audit, sherif, biome, typecheck, unit tests, knip,
build, package-export validation.

## Rules

- Modify `sdk/` only. `packages/internal/openapi-clients/` is generated output.
- Any change to the published package needs a changeset (`pnpm changeset`).
  PR titles are imperative ("Add X"); changeset text is past tense ("Added X").
- New exports from `sdk/src/index.ts` need JSDoc with a runnable `@example`.
  Prefer not to export at all over exporting something internal. Avoid
  `export *`, which makes the public surface incidental rather than chosen.
- Do not log, snapshot or fixture sensitive material: private keys, recovery
  passwords, encryption keys, passkey-derived keys, access or refresh tokens.
  `debugLog` redacts by key name, but prefer not to pass whole RPC payloads to
  it in the first place.
- Storage goes through `sdk/src/storage`, never `localStorage` directly.
- Sentry is enabled by default. Anything added to an event should be an
  allowlisted, non-sensitive field; avoid attaching raw requests, response
  bodies or header collections.
- Retries apply to idempotent requests only; signature submission is not
  retried.
- Test fixtures use obviously fake values. Real credentials — even sandbox
  ones — do not belong in new code.

## Testing

- Colocated `*.test.ts`, run with vitest.
- Test behaviour, not implementation. Cover error paths, not just the happy
  path.
- After writing a test for a validation path, confirm it fails when that
  validation is removed.

## Style

- Biome: 120 columns, single quotes, ES5 trailing commas. `pnpm check:fix`.
- Intra-package imports are relative (`../utils/debug`). Bare specifiers such
  as `utils/debug` are indistinguishable from npm packages to tools other than
  `tsc`, and do not resolve correctly in emitted declarations.
- Prefer deleting dead code over commenting it out or suppressing the linter.

# Contributing

Thanks for your interest in contributing to the Openfort JavaScript SDK. Please
read this before opening a pull request.

If you are not sure where to start, open an
[issue](https://github.com/openfort-xyz/openfort-js/issues/new/choose)
describing what you want to change. For anything that alters the public API,
do that before writing code — the published surface is guarded by a snapshot
test and changing it requires a major version.

To report a security vulnerability, follow [SECURITY.md](../SECURITY.md)
instead of opening an issue.

## Prerequisites

- **Node.js 22.9 or newer.** CI builds on 22 and 24; `engines` declares the
  floor. Do not use an API that only exists in the newer one.
- **pnpm 10.16.1.** The `preinstall` script rejects npm and yarn, because the
  lockfile and the workspace protocol are pnpm-specific.
- **gitleaks.** Installed for you by `postinstall`; the pre-commit hook needs it.

```bash
pnpm install
```

`postinstall` also registers the git hooks. If you clone with hooks disabled,
run `pnpm postinstall` before your first commit.

## Repository layout

| Path | Contents |
| --- | --- |
| `sdk` | The published `@openfort/openfort-js` package. Most changes go here. |
| `packages/internal/openapi-clients` | Generated API clients. Regenerate rather than hand-edit. |
| `packages/platform-bridge` | Platform integration bridge. |
| `environments/*` | Consumer simulations run against the built package, not the source. |
| `examples/apps/*` | Runnable sample apps, also the host for the Playwright suite. |

Only `sdk` and `packages/internal/openapi-clients` are type-checked by
`pnpm check:types`, and only `sdk` is published.

## Making a change

```bash
pnpm dev            # rebuild the SDK on change
pnpm test:watch     # unit tests, watch mode
```

Then, before pushing:

```bash
pnpm check:fix      # format and autofix
pnpm verify         # everything CI runs, in one command
```

`pnpm verify` takes several minutes. To iterate faster, run the step you care
about on its own — the list is in the root `package.json`.

### What `pnpm verify` gates

Each step catches something the others cannot, which is why they all run:

| Step | Catches |
| --- | --- |
| `pnpm audit` | Known advisories in the dependency tree. |
| `check:repo` | Version mismatches between workspace packages. |
| `biome check` | Lint and formatting. |
| `build` | Compile errors, and produces the `dist` the later steps inspect. |
| `check:types` | Type errors in source. |
| `test:coverage` | Unit tests. |
| `knip --production` | Files, exports, and dependencies nothing reaches. |
| `test:build` | Packaging metadata (publint) and type resolution per module system (attw). |
| `test:env` | Type-checks *and executes* the built package as an ESM and a CJS consumer. |
| `build:docs` | The generated API reference still builds. |
| `size` | Per-entry-point bundle budgets. |

Two of these are easy to misread. `test:build` inspects metadata and
declarations but never runs the output, so `test:env` is the only step that
would notice the built package failing to load. And `size` budgets each entry
point separately: the `errors` and `types` entry points are budgeted in
kilobytes against the root entry point's 245 kB, so re-exporting something
heavy from them fails the build rather than quietly costing every consumer.

### Tests

Unit tests are colocated as `*.test.ts` and run under vitest with a jsdom
environment. Test behaviour through the public surface rather than asserting on
internals, so a refactor does not break the suite.

When you fix a bug, make the test fail first without your fix. A test that
passes either way documents the bug rather than preventing it.

Coverage is reported but not gated. Do not lower it without saying why in the
pull request.

End-to-end tests live in `examples/apps/auth-sample` and drive a real browser
against real credentials, so they only run in CI:

```bash
pnpm test-e2e
```

### Changing the public API

`sdk/src/index.test.ts` snapshots every runtime export. If your change is
intentional, update the snapshot in the same commit and add a changeset —
a reviewer needs to see both together to judge whether the break is warranted.

Note the snapshot covers runtime bindings only. A renamed or removed *type* will
not fail it; `environments/tsc` compiles a consumer against the built
declarations and covers that instead.

### Changesets

Every change to a published package needs one:

```bash
pnpm changeset
```

Pick `patch`, `minor`, or `major`, and write the entry for someone upgrading:
what changed, whether they must act, and the smallest code sample that shows
the new usage. Changes confined to examples, tests, or CI do not need one.

## Commits and pull requests

- Imperative mood, one logical change per commit.
- Never commit secrets. The pre-commit hook runs gitleaks, and CI rescans the
  commits a pull request adds.
- Describe what the code does now. Skip discarded approaches and earlier
  iterations — the diff is the subject, not the journey.
- Prefer plain language. A bug fix is a bug fix.

CI runs the same `verify` pipeline on your pull request, plus a TypeScript
version matrix and the Playwright suite. The release workflow re-runs it against
the exact commit it is about to publish, so a green pull request is necessary
but not sufficient — rebase if `main` has moved.

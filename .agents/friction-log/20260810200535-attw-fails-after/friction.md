---
title: 'attw fails after successful npm pack'
severity: 'minor'
---

## Expected Behavior

`pnpm test:build` completes after `publint` and `npm pack` succeed.

## Current Behavior

`publint` passes and a direct `npm pack --dry-run` succeeds, but `attw --pack ./sdk` exits 3 with only `Command failed: npm pack`.

## Possible Solution

Expose the nested npm stderr or update the package-validation tooling once the incompatibility is identified.

## Minimal Reproducible Example

Run `pnpm build`, then `pnpm test:build` with Node 24 and npm 11. Running `cd sdk && npm pack --dry-run` succeeds in the same worktree.

## Context

Observed while running the required full verification after updating an audit override. It reproduces in an unrelated existing worktree, so it is not caused by the override.

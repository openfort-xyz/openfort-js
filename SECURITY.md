# Security Policy

## Reporting a Vulnerability

Report privately through
[GitHub private vulnerability reporting](https://github.com/openfort-xyz/openfort-js/security/advisories/new),
or by email to security@openfort.xyz. Please do not open a public issue for a
security report.

Include:

- a description of the issue and its impact,
- a suggested severity (Critical / High / Medium / Low),
- the affected SDK version,
- a minimal reproducible example.

**Response targets:** acknowledgement within 2 business days, initial triage
within 5 business days, and a status update at least every 7 days until the
issue is resolved.

## Scope

In scope — the packages published from this repository, in particular
`@openfort/openfort-js`:

- key handling and the embedded-wallet iframe bridge,
- session keys and delegated signing,
- authentication flows and token storage,
- signing paths (`personal_sign`, `eth_signTypedData_v4`, EIP-7702
  authorizations).

Out of scope:

- the Openfort dashboard and backend API — report those to
  security@openfort.xyz, which covers all Openfort products,
- issues that require an already-compromised device or a malicious host
  application (an attacker executing JavaScript on the integrating origin can
  already reach anything the SDK can),
- dependency advisories with no exploitable path through this SDK,
- the sample applications under `examples/`, which use sandbox credentials and
  are illustrative only.

## Safe Harbor

We will not pursue legal action for security research conducted in good faith
under this policy. Good faith means: no access to other users' data or accounts
beyond what is needed to demonstrate the issue, no service degradation, no data
exfiltration, and private disclosure to us before any public discussion.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | :white_check_mark: |
| 0.x     | :x:       |

Security patches are released on the latest minor of a supported major and
published as a GitHub Security Advisory on this repository as well as to npm.

## Supply Chain

Measures applied to this repository and its releases:

- dependencies must be at least 24 hours old before they can be installed
  (`minimumReleaseAge`), limiting exposure to a compromised fresh publish;
  the first-party packages `@openfort/shield-js` and `@openfort/openfort-node`
  are exempt (`minimumReleaseAgeExclude`),
- dependency install scripts are disabled (`ignore-dep-scripts`); only this
  repository's own lifecycle scripts run,
- runtime dependencies are pinned to exact versions, so a published SDK version
  always resolves the same tree,
- releases are published from CI via npm Trusted Publishing (OIDC) with
  provenance attestations; no long-lived npm token exists,
- all GitHub Actions are pinned to full commit SHAs,
- every pull request is scanned for secrets, and the release pipeline runs the
  full verification suite on the exact commit being published.

You can verify a release's provenance with:

```bash
npm audit signatures
```

## Legal

This project is made available under the Apache License 2.0, which disclaims
all warranties and limits the liability of those who contribute to and maintain
it, including Openfort. You are solely responsible for your use of this
software and assume all associated risks. This Security Policy does not create
an ongoing duty for any contributor, including Openfort, to correct any flaw or
to alert you to any or all potential risks of using the project.

---
'@openfort/openfort-js': minor
---

Add a canonical, SDK-agnostic funding-session analytics contract. `openfort-js`
now defines the `FundingAnalyticsEvent` union + `FundingAnalyticsSink` and emits
the session-lifecycle events (`funding_session_created`,
`funding_payment_method_set`, `funding_status_changed`, `funding_succeeded` /
`funding_bounced` / `funding_expired`, `funding_session_error`) from
`client.funding` as sessions are created, funded, and polled. Wire a sink via
`overrides.funding.onEvent` at SDK construction, or `client.funding.setAnalyticsSink(sink)`
at runtime, then forward events to PostHog (or any backend). Emission is
best-effort and never throws into the deposit path. UI-intent events
(`funding_route_selected`, `funding_address_copied`, `funding_session_abandoned`)
remain client-emitted since the SDK does not observe them.

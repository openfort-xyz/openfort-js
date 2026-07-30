/**
 * Error entry point: `@openfort/openfort-js/errors`
 *
 * The root entry point cannot be tree-shaken — it evaluates
 * `Openfort.getEventEmitter()` at module scope, which retains the whole client
 * graph (signing, telemetry, HTTP). Importing an error class through it costs
 * the entire SDK.
 *
 * Every module reachable from here is free of module-scope side effects, so
 * this entry point costs roughly the classes themselves. Import from here when
 * you only need to branch on errors, e.g. in a shared error boundary that
 * should not pull the SDK into its bundle.
 *
 * The invariant to preserve when adding an export: its module must not reach
 * anything that touches the client, transport, or telemetry. That rules out the
 * `wallets/iframeManager` connection errors, which are declared alongside the
 * bridge they describe, so exporting them here would pull the bridge in and
 * collapse this entry point back into the root one. The `size-limit` budgets in
 * package.json fail the build if that happens.
 */

// biome-ignore lint/performance/noBarrelFile: subpath entry point, consolidating the public error surface
export {
  OPENFORT_AUTH_ERROR_CODES,
  OPENFORT_ERROR_CODES,
  type OpenfortAuthErrorCode,
  type OpenfortErrorCode,
} from './core/errors/authErrorCodes'
export {
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  DEFAULT_DOCS_BASE_URL,
  OAuthError,
  OpenfortError,
  type OpenfortErrorOptions,
  OTPError,
  RecoveryError,
  RequestError,
  SessionError,
  SignerError,
  setErrorConfig,
  UserError,
} from './core/errors/openfortError'

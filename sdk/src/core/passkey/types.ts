/**
 * Passkey types and interfaces.
 */

/**
 * Configuration for creating a new passkey.
 */
export interface PasskeyCreateConfig {
  /** Unique identifier for the passkey */
  id: string
  /** Human-readable display name shown in passkey dialogs */
  displayName: string
  /** Seed value used for PRF-based key derivation */
  seed: string
}

/**
 * Configuration for deriving a key from an existing passkey.
 */
export interface PasskeyDeriveConfig {
  /** The passkey ID (base64 encoded credential ID) */
  id: string
  /** Seed value used for PRF-based key derivation */
  seed: string
}

/**
 * Result of passkey creation.
 */
export interface PasskeyDetails {
  /** The passkey ID (base64 encoded credential ID) */
  id: string
  /** Human-readable display name */
  displayName?: string
  /** Derived key material as base64url string */
  key?: string
}

/**
 * Strategy interface for passkey handlers.
 * Implementations: PasskeyHandler (browser), native handlers (React Native)
 */
export interface IPasskeyHandler {
  /** Creates a new passkey and derives a key using the PRF extension. */
  createPasskey(config: PasskeyCreateConfig): Promise<PasskeyDetails>

  /** Derives and exports key material from an existing passkey as base64url string. */
  deriveAndExportKey(config: PasskeyDeriveConfig): Promise<string>
}

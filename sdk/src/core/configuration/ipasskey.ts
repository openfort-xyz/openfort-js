/**
 * Interface for passkey handlers that can be injected into the SDK.
 * This allows custom implementations (e.g., React Native) to replace
 * the default browser-based PasskeyHandler.
 */
export interface IPasskeyHandler {
  createPasskey(config: {
    id: string
    displayName: string
    seed: string
  }): Promise<{ id: string; displayName?: string; key?: Uint8Array }>

  deriveKey(config: { id: string; seed: string }): Promise<CryptoKey>

  deriveAndExportKey(config: { id: string; seed: string }): Promise<Uint8Array>
}

/**
 * Interface for passkey handlers that can be injected into the SDK.
 * This allows custom implementations (e.g., React Native) to replace
 * the default browser-based PasskeyHandler.
 */
export interface IPasskeyHandler {
  // Browser methods - return Uint8Array (works with structured clone in postMessage)
  createPasskey(config: {
    id: string
    displayName: string
    seed: string
  }): Promise<{ id: string; displayName?: string; key?: Uint8Array }>

  deriveKey(config: { id: string; seed: string }): Promise<CryptoKey>

  deriveAndExportKey(config: { id: string; seed: string }): Promise<Uint8Array>

  // Native methods (optional) - return base64url strings (JSON-friendly for React Native WebView)
  // SDK uses feature detection to prefer these when available
  createNativePasskey?(config: {
    id: string
    displayName: string
    seed: string
  }): Promise<{ id: string; displayName?: string; key?: string }>

  deriveAndExportNativeKey?(config: { id: string; seed: string }): Promise<string>
}

/**
 * ProviderErrors should take priority over RpcErrorCodes
 * https://eips.ethereum.org/EIPS/eip-1193#provider-errors
 * https://eips.ethereum.org/EIPS/eip-1474#error-codes
 */
export enum ProviderErrorCode {
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
}

export enum RpcErrorCode {
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  TRANSACTION_REJECTED = -32003,
}

export class JsonRpcError extends Error {
  public readonly message: string

  public readonly code: ProviderErrorCode | RpcErrorCode

  constructor(code: ProviderErrorCode | RpcErrorCode, message: string) {
    super(message)
    this.message = message
    this.code = code
  }
}

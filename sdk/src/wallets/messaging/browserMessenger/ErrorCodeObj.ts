// Not intended to be used internally. Can be useful externally
// in projects not using TypeScript. It has the `Obj` suffix to disambiguate
// it from the ErrorCode string union.
// eslint-disable-next-line @typescript-eslint/naming-convention
const ErrorCodeObj = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ConnectionDestroyed: 'CONNECTION_DESTROYED',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ConnectionTimeout: 'CONNECTION_TIMEOUT',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  InvalidArgument: 'INVALID_ARGUMENT',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  MethodCallTimeout: 'METHOD_CALL_TIMEOUT',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  MethodNotFound: 'METHOD_NOT_FOUND',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  TransmissionFailed: 'TRANSMISSION_FAILED',
} as const

export default ErrorCodeObj

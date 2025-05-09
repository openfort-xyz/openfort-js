import { isAxiosError } from 'axios';

export enum OpenfortErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  NOT_LOGGED_IN_ERROR = 'NOT_LOGGED_IN_ERROR',
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR',
  USER_REGISTRATION_ERROR = 'USER_REGISTRATION_ERROR',
  LOGOUT_ERROR = 'LOGOUT_ERROR',
  OPERATION_NOT_SUPPORTED_ERROR = 'OPERATION_NOT_SUPPORTED_ERROR',
  MISSING_SESSION_SIGNER_ERROR = 'MISSING_SESSION_SIGNER_ERROR',
  MISSING_EMBEDDED_SIGNER_ERROR = 'MISSING_EMBEDDED_SIGNER_ERROR',
  MISSING_SIGNER_ERROR = 'MISSING_SIGNER_ERROR',
  USER_NOT_AUTHORIZED_ON_ECOSYSTEM = 'USER_NOT_AUTHORIZED_ON_ECOSYSTEM',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

function isAPIError(error: any): error is Error {
  return 'type' in error && 'message' in error;
}

export interface Data {
  [key: string]: any;
}

export class OpenfortError extends Error {
  public type: OpenfortErrorType;

  public data: Data;

  constructor(message: string, type: OpenfortErrorType, data: Data = {}) {
    super(message);
    this.type = type;
    this.data = data;
  }
}

export interface StatusCodeOpenfortError {
  default: OpenfortErrorType;
  [statusCode: number]: OpenfortErrorType;
}

export const withOpenfortError = async <T>(
  fn: () => Promise<T>,
  customErrorType: StatusCodeOpenfortError,
  onError?: (error: OpenfortError) => void,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    let errorMessage: string;
    const data: Data = {};
    let errorType: OpenfortErrorType = customErrorType.default;

    if (isAxiosError(error)) {
      const statusCode = error.response?.status;
      errorType = statusCode ? customErrorType[statusCode] || customErrorType.default : customErrorType.default;

      if (error.response?.data && error.response.data.error) {
        if (isAPIError(error.response.data.error)) {
          errorMessage = error.response.data.error.message;
        } else {
          errorMessage = (error as Error).message;
        }
      } else {
        errorMessage = (error as Error).message;
      }
    } else {
      errorMessage = (error as Error).message;
    }

    const openfortError = new OpenfortError(errorMessage, errorType, data);
    if (onError) {
      onError(openfortError);
    }
    throw openfortError;
  }
};

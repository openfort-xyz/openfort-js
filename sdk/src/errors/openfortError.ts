import { isAxiosError } from 'axios';

export enum OpenfortErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  WALLET_CONNECTION_ERROR = 'WALLET_CONNECTION_ERROR',
  NOT_LOGGED_IN_ERROR = 'NOT_LOGGED_IN_ERROR',
  SILENT_LOGIN_ERROR = 'SILENT_LOGIN_ERROR',
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR',
  USER_REGISTRATION_ERROR = 'USER_REGISTRATION_ERROR',
  USER_NOT_REGISTERED_ERROR = 'USER_NOT_REGISTERED_ERROR',
  LOGOUT_ERROR = 'LOGOUT_ERROR',
  TRANSFER_ERROR = 'TRANSFER_ERROR',
  OPERATION_NOT_SUPPORTED_ERROR = 'OPERATION_NOT_SUPPORTED_ERROR',
}

function isAPIError(error: any): error is Error {
  return 'code' in error && 'message' in error;
}

export class OpenfortError extends Error {
  public type: OpenfortErrorType;

  constructor(message: string, type: OpenfortErrorType) {
    super(message);
    this.type = type;
  }
}

export const withOpenfortError = async <T>(
  fn: () => Promise<T>,
  customErrorType: OpenfortErrorType,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    let errorMessage: string;

    if (isAxiosError(error) && error.response?.data && isAPIError(error.response.data)) {
      errorMessage = error.response.data.message;
    } else {
      errorMessage = (error as Error).message;
    }

    throw new OpenfortError(errorMessage, customErrorType);
  }
};

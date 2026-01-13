/**
 * Test fixtures for authentication flows
 * Contains mock data for users, sessions, tokens, etc.
 */

/**
 * Mock user data
 */
export const mockUser = {
  id: 'usr_test_123456',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/**
 * Mock session data
 */
export const mockSession = {
  id: 'ses_test_123456',
  userId: mockUser.id,
  token: 'mock_access_token_abc123',
  refreshToken: 'mock_refresh_token_xyz789',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  createdAt: Date.now(),
}

/**
 * Mock OAuth provider data
 */
export const mockOAuthData = {
  provider: 'google',
  key: 'oauth_key_123',
  state: 'oauth_state_xyz',
  url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=test&response_type=code&state=oauth_state_xyz',
}

/**
 * Mock ID token (JWT format)
 */
export const mockIdToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfdGVzdF8xMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

/**
 * Mock SIWE message
 */
export const mockSiweMessage = {
  message:
    'localhost:3000 wants you to sign in with your Ethereum account:\n0x1234567890123456789012345678901234567890\n\nSign in with Ethereum\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: abc123xyz\nIssued At: 2024-01-01T00:00:00.000Z',
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  nonce: 'abc123xyz',
}

/**
 * Mock linked accounts
 */
export const mockLinkedAccounts = [
  {
    accountId: 'acc_test_123',
    address: '0x1234567890123456789012345678901234567890',
    chainType: 'evm',
    externalAccountId: 'ext_acc_test_123',
    createdAt: Date.now(),
  },
]

/**
 * Mock OTP token data
 */
export const mockOTPData = {
  token: 'otp_token_123456',
  expiresAt: Date.now() + 300000, // 5 minutes
  type: 'email',
}

/**
 * Mock password reset data
 */
export const mockPasswordResetData = {
  token: 'reset_token_abc123',
  expiresAt: Date.now() + 900000, // 15 minutes
}

/**
 * Mock API error responses
 */
export const mockApiErrors = {
  invalidCredentials: {
    error: 'invalid_credentials',
    error_description: 'The email or password is incorrect',
  },
  sessionExpired: {
    error: 'session_expired',
    error_description: 'Your session has expired. Please log in again',
  },
  invalidToken: {
    error: 'invalid_token',
    error_description: 'The provided token is invalid or expired',
  },
  userNotFound: {
    error: 'user_not_found',
    error_description: 'No user found with the provided email',
  },
  emailAlreadyExists: {
    error: 'email_already_exists',
    error_description: 'An account with this email already exists',
  },
  invalidOAuthCode: {
    error: 'invalid_oauth_code',
    error_description: 'The OAuth authorization code is invalid or expired',
  },
  rateLimitExceeded: {
    error: 'rate_limit_exceeded',
    error_description: 'Too many requests. Please try again later',
  },
}

/**
 * Mock Axios error factory
 */
export const createMockAxiosError = (status: number, data?: Record<string, unknown>) => {
  const error = new Error('Request failed') as any
  error.isAxiosError = true
  error.response = {
    status,
    data: data || {},
    statusText: 'Error',
    headers: {},
    config: {},
  }
  return error
}

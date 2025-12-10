/**
 * Mock implementations for OpenAPI clients
 * Used across tests to avoid real API calls
 */

import { vi } from 'vitest'

/**
 * Creates a mock auth client with all methods
 */
export const createMockAuthClient = () => ({
  emailPasswordSignUp: vi.fn(),
  emailPasswordLogIn: vi.fn(),
  oauth: {
    initOAuth: vi.fn(),
    authenticateWithOAuth: vi.fn(),
    linkOAuthAccount: vi.fn(),
    unlinkOAuthAccount: vi.fn(),
  },
  siwe: {
    initSIWE: vi.fn(),
    authenticateSIWE: vi.fn(),
  },
  passwordless: {
    createEmailToken: vi.fn(),
    authenticateWithEmailToken: vi.fn(),
    createSMSToken: vi.fn(),
    authenticateWithSMSToken: vi.fn(),
  },
  requestResetPassword: vi.fn(),
  resetPassword: vi.fn(),
  requestEmailVerification: vi.fn(),
  verifyEmail: vi.fn(),
  logout: vi.fn(),
  guest: {
    signUpAsGuest: vi.fn(),
  },
})

/**
 * Creates a mock user client
 */
export const createMockUserClient = () => ({
  getMe: vi.fn(),
  getLinkedAccounts: vi.fn(),
  linkWallet: vi.fn(),
  unlinkWallet: vi.fn(),
  linkEmail: vi.fn(),
  unlinkEmail: vi.fn(),
})

/**
 * Creates a mock embedded wallet client
 */
export const createMockEmbeddedWalletClient = () => ({
  getEmbeddedAccounts: vi.fn(),
  signMessage: vi.fn(),
  signTypedData: vi.fn(),
  sendTransaction: vi.fn(),
  getAccountBalances: vi.fn(),
  estimateGas: vi.fn(),
})

/**
 * Creates a mock proxy client
 */
export const createMockProxyClient = () => ({
  proxyRequest: vi.fn(),
})

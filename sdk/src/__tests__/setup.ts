/**
 * Test setup file - runs before all tests
 * Sets up global mocks and test environment
 */

import { afterEach, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

// Assign localStorage mock to global
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock window object for SSR compatibility tests
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
    },
  },
  writable: true,
})

// Mock Sentry to avoid real error reporting in tests
vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  init: vi.fn(),
}))

// Clear mocks and localStorage before each test
beforeEach(() => {
  localStorageMock.clear()
})

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

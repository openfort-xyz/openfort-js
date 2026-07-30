import { afterEach, describe, expect, it } from 'vitest'
import {
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  OAuthError,
  OpenfortError,
  OTPError,
  RecoveryError,
  RequestError,
  SessionError,
  SignerError,
  setErrorConfig,
  UserError,
} from './openfortError'

describe('OpenfortError', () => {
  describe('constructor', () => {
    it('should create error with code and description', () => {
      const error = new OpenfortError('test_error', 'Test error description')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(OpenfortError)
      expect(error.name).toBe('OpenfortError')
      expect(error.error).toBe('test_error')
      expect(error.error_description).toBe('Test error description')
      expect(error.message).toBe('Test error description')
    })

    it('should set prototype correctly for instanceof checks', () => {
      const error = new OpenfortError('test_error', 'Test description')
      expect(error instanceof OpenfortError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('fromPayload', () => {
    it('should create error from flat payload', () => {
      const error = OpenfortError.fromPayload({
        error: 'invalid_request',
        error_description: 'The request is invalid',
      })

      expect(error.error).toBe('invalid_request')
      expect(error.error_description).toBe('The request is invalid')
    })

    it('should create error from nested error object', () => {
      const error = OpenfortError.fromPayload({
        error: {
          code: 'invalid_token',
          message: 'Token has expired',
        },
      })

      expect(error.error).toBe('invalid_token')
      expect(error.error_description).toBe('Token has expired')
    })

    it('should use message field when error_description is missing', () => {
      const error = OpenfortError.fromPayload({
        error: 'server_error',
        message: 'Internal server error occurred',
      })

      expect(error.error).toBe('server_error')
      expect(error.error_description).toBe('Internal server error occurred')
    })

    it('should use code field when error string is missing', () => {
      const error = OpenfortError.fromPayload({
        code: 'network_error',
        message: 'Network connection failed',
      })

      expect(error.error).toBe('network_error')
      expect(error.error_description).toBe('Network connection failed')
    })

    it('should handle nested error with code but no message', () => {
      const error = OpenfortError.fromPayload({
        error: {
          code: 'timeout_error',
        },
        message: 'Request timed out',
      })

      expect(error.error).toBe('timeout_error')
      expect(error.error_description).toBe('Request timed out')
    })

    it('should use default values when all fields are missing', () => {
      const error = OpenfortError.fromPayload({})

      expect(error.error).toBe('unknown_error')
      expect(error.error_description).toBe('An unknown error occurred')
    })

    it('should handle empty nested error object', () => {
      const error = OpenfortError.fromPayload({
        error: {},
      })

      expect(error.error).toBe('unknown_error')
      expect(error.error_description).toBe('An unknown error occurred')
    })

    it('should prioritize nested error fields over flat fields', () => {
      const error = OpenfortError.fromPayload({
        error: {
          code: 'nested_code',
          message: 'Nested message',
        },
        code: 'flat_code',
        message: 'Flat message',
      })

      expect(error.error).toBe('nested_code')
      expect(error.error_description).toBe('Nested message')
    })
  })
})

describe('AuthenticationError', () => {
  it('should create authentication error with status code', () => {
    const error = new AuthenticationError('invalid_credentials', 'Email or password is incorrect', 401)

    expect(error).toBeInstanceOf(OpenfortError)
    expect(error).toBeInstanceOf(AuthenticationError)
    expect(error.name).toBe('AuthenticationError')
    expect(error.error).toBe('invalid_credentials')
    expect(error.error_description).toBe('Email or password is incorrect')
    expect(error.statusCode).toBe(401)
  })

  it('should create authentication error without status code', () => {
    const error = new AuthenticationError('authentication_failed', 'Authentication failed')

    expect(error.statusCode).toBeUndefined()
  })

  it('should maintain prototype chain', () => {
    const error = new AuthenticationError('test', 'Test', 401)
    expect(error instanceof AuthenticationError).toBe(true)
    expect(error instanceof OpenfortError).toBe(true)
    expect(error instanceof Error).toBe(true)
  })
})

describe('SessionError', () => {
  it('should create session error with audience and scope', () => {
    const error = new SessionError('session_expired', 'Session has expired', 'api.openfort.io', 'openid profile')

    expect(error).toBeInstanceOf(SessionError)
    expect(error.name).toBe('SessionError')
    expect(error.error).toBe('session_expired')
    expect(error.audience).toBe('api.openfort.io')
    expect(error.scope).toBe('openid profile')
  })

  it('should create session error without optional fields', () => {
    const error = new SessionError('invalid_session', 'Session is invalid')

    expect(error.audience).toBeUndefined()
    expect(error.scope).toBeUndefined()
  })
})

describe('ConfigurationError', () => {
  it('should create configuration error with fixed code', () => {
    const error = new ConfigurationError('API key is missing')

    expect(error).toBeInstanceOf(ConfigurationError)
    expect(error.name).toBe('ConfigurationError')
    expect(error.error).toBe('invalid_configuration')
    expect(error.error_description).toBe('API key is missing')
  })

  it('should handle various configuration issues', () => {
    const errors = ['Missing publishable key', 'Invalid base URL format', 'Storage not available']

    errors.forEach((msg) => {
      const error = new ConfigurationError(msg)
      expect(error.error).toBe('invalid_configuration')
      expect(error.error_description).toBe(msg)
    })
  })
})

describe('SignerError', () => {
  it('should create signer error with account ID', () => {
    const error = new SignerError('missing_signer', 'No signer found for account', 'acc_123')

    expect(error).toBeInstanceOf(SignerError)
    expect(error.name).toBe('SignerError')
    expect(error.accountId).toBe('acc_123')
  })

  it('should create signer error without account ID', () => {
    const error = new SignerError('signer_unavailable', 'Signer is unavailable')
    expect(error.accountId).toBeUndefined()
  })
})

describe('UserError', () => {
  it('should create user error with user ID', () => {
    const error = new UserError('user_not_found', 'User does not exist', 'usr_456')

    expect(error).toBeInstanceOf(UserError)
    expect(error.name).toBe('UserError')
    expect(error.userId).toBe('usr_456')
  })

  it('should create user error without user ID', () => {
    const error = new UserError('registration_failed', 'Failed to create user')
    expect(error.userId).toBeUndefined()
  })
})

describe('OTPError', () => {
  it('should create OTP error', () => {
    const error = new OTPError('invalid_otp', 'The OTP code is invalid')

    expect(error).toBeInstanceOf(OTPError)
    expect(error.name).toBe('OTPError')
    expect(error.error).toBe('invalid_otp')
    expect(error.error_description).toBe('The OTP code is invalid')
  })

  it('should handle different OTP error types', () => {
    const errors = [
      { code: 'otp_expired', desc: 'OTP has expired' },
      { code: 'otp_invalid', desc: 'Invalid OTP code' },
      { code: 'too_many_attempts', desc: 'Too many failed attempts' },
    ]

    errors.forEach(({ code, desc }) => {
      const error = new OTPError(code, desc)
      expect(error.error).toBe(code)
      expect(error.error_description).toBe(desc)
    })
  })
})

describe('OAuthError', () => {
  it('should create OAuth error with provider', () => {
    const error = new OAuthError('oauth_failed', 'OAuth authentication failed', 'google')

    expect(error).toBeInstanceOf(OAuthError)
    expect(error.name).toBe('OAuthError')
    expect(error.provider).toBe('google')
  })

  it('should create OAuth error without provider', () => {
    const error = new OAuthError('oauth_cancelled', 'User cancelled OAuth flow')
    expect(error.provider).toBeUndefined()
  })

  it('should handle different OAuth providers', () => {
    const providers = ['google', 'facebook', 'discord', 'twitter']

    providers.forEach((provider) => {
      const error = new OAuthError('oauth_error', 'OAuth failed', provider)
      expect(error.provider).toBe(provider)
    })
  })
})

describe('AuthorizationError', () => {
  it('should create authorization error with default message', () => {
    const error = new AuthorizationError()

    expect(error).toBeInstanceOf(AuthorizationError)
    expect(error.name).toBe('AuthorizationError')
    expect(error.error).toBe('user_not_authorized')
    expect(error.error_description).toBe('User not authorized to access this ecosystem')
  })

  it('should create authorization error with custom message', () => {
    const error = new AuthorizationError('Access denied to this resource')

    expect(error.error).toBe('user_not_authorized')
    expect(error.error_description).toBe('Access denied to this resource')
  })
})

describe('RecoveryError', () => {
  it('should create recovery error with method', () => {
    const error = new RecoveryError('recovery_failed', 'Failed to recover account', 'passkey')

    expect(error).toBeInstanceOf(RecoveryError)
    expect(error.name).toBe('RecoveryError')
    expect(error.recoveryMethod).toBe('passkey')
  })

  it('should create recovery error without method', () => {
    const error = new RecoveryError('invalid_recovery', 'Invalid recovery token')
    expect(error.recoveryMethod).toBeUndefined()
  })
})

describe('RequestError', () => {
  it('should create request error with status code', () => {
    const error = new RequestError('Network request failed', 500)

    expect(error).toBeInstanceOf(RequestError)
    expect(error.name).toBe('RequestError')
    expect(error.error).toBe('request_error')
    expect(error.error_description).toBe('Network request failed')
    expect(error.statusCode).toBe(500)
  })

  it('should create request error without status code', () => {
    const error = new RequestError('Request timeout')
    expect(error.statusCode).toBeUndefined()
  })

  it('should handle different HTTP status codes', () => {
    const codes = [400, 401, 403, 404, 500, 502, 503]

    codes.forEach((code) => {
      const error = new RequestError(`HTTP ${code} error`, code)
      expect(error.statusCode).toBe(code)
    })
  })
})

describe('error type guards', () => {
  it('should distinguish between error types', () => {
    const authError = new AuthenticationError('auth', 'Auth failed', 401)
    const sessionError = new SessionError('session', 'Session expired')
    const configError = new ConfigurationError('Config invalid')

    expect(authError instanceof AuthenticationError).toBe(true)
    expect(authError instanceof SessionError).toBe(false)
    expect(sessionError instanceof SessionError).toBe(true)
    expect(configError instanceof ConfigurationError).toBe(true)

    // All should be OpenfortErrors
    expect(authError instanceof OpenfortError).toBe(true)
    expect(sessionError instanceof OpenfortError).toBe(true)
    expect(configError instanceof OpenfortError).toBe(true)
  })
})

describe('error serialization', () => {
  it('should serialize error properties', () => {
    const error = new AuthenticationError('invalid_credentials', 'Invalid email or password', 401)

    const serialized = JSON.parse(JSON.stringify(error))

    expect(serialized.error).toBe('invalid_credentials')
    expect(serialized.error_description).toBe('Invalid email or password')
    expect(serialized.statusCode).toBe(401)
    expect(serialized.name).toBe('AuthenticationError')
  })
})

describe('OpenfortError cause chain and version', () => {
  it('stamps the SDK version so bug reports identify the build', () => {
    const error = new OpenfortError('some_code', 'something failed')
    expect(error.version).toMatch(/^@openfort\/openfort-js@/)
  })

  it('threads cause so the originating failure survives wrapping', () => {
    const root = new Error('socket hang up')
    const wrapped = new OpenfortError('request_error', 'request failed', { cause: root })
    expect(wrapped.cause).toBe(root)
  })

  it('omits cause entirely when none is given', () => {
    expect(new OpenfortError('c', 'd').cause).toBeUndefined()
  })

  it('walk() returns the root cause by default', () => {
    const root = new Error('ECONNRESET')
    const middle = new OpenfortError('mid', 'middle', { cause: root })
    const outer = new OpenfortError('outer', 'outer', { cause: middle })
    expect(outer.walk()).toBe(root)
  })

  it('walk(predicate) finds a specific error in the chain', () => {
    const root = new SessionError('session_expired', 'expired')
    const outer = new OpenfortError('outer', 'outer', { cause: root })
    expect(outer.walk((e) => e instanceof SessionError)).toBe(root)
  })

  it('walk(predicate) returns null when nothing matches', () => {
    const outer = new OpenfortError('outer', 'outer', { cause: new Error('x') })
    expect(outer.walk((e) => e instanceof SessionError)).toBeNull()
  })

  it('preserves instanceof across subclasses without setPrototypeOf', () => {
    const error = new SessionError('session_expired', 'expired')
    expect(error).toBeInstanceOf(SessionError)
    expect(error).toBeInstanceOf(OpenfortError)
    expect(error).toBeInstanceOf(Error)
  })

  // `Openfort`'s synchronous init collapses every wiring fault into one
  // ConfigurationError with a fixed message, so the cause chain is the only
  // channel carrying which dependency actually failed. It has to survive both
  // the subclass constructor and `walk()` for that to be diagnosable.
  it('ConfigurationError forwards its cause and keeps it reachable via walk()', () => {
    const cause = new TypeError('axiosRetry is not a function')
    const error = new ConfigurationError('Openfort SDK synchronous initialization failed', { cause })

    expect(error.cause).toBe(cause)
    expect(error.walk()).toBe(cause)
    expect(error.walk((e) => e instanceof TypeError)).toBe(cause)
  })

  it('ConfigurationError without a cause omits the property', () => {
    const error = new ConfigurationError('missing publishable key')
    expect(error.cause).toBeUndefined()
    expect(error.walk()).toBe(error)
  })

  describe('docs links', () => {
    afterEach(() => {
      setErrorConfig({ docsBaseUrl: 'https://www.openfort.io/docs' })
    })

    it('leaves the message untouched when no docsPath is given', () => {
      const error = new OpenfortError('some_code', 'something broke')
      expect(error.message).toBe('something broke')
      expect(error.docsUrl).toBeUndefined()
    })

    it('appends a Docs line and exposes the resolved URL', () => {
      const error = new OpenfortError('some_code', 'something broke', {
        docsPath: 'configuration/native-apps',
      })
      expect(error.docsUrl).toBe('https://www.openfort.io/docs/configuration/native-apps')
      expect(error.message).toBe('something broke\n\nDocs: https://www.openfort.io/docs/configuration/native-apps')
      // The structured description stays clean so callers can render it alone.
      expect(error.error_description).toBe('something broke')
    })

    it('honours a reconfigured docs base URL', () => {
      setErrorConfig({ docsBaseUrl: 'https://docs.example.com/wallet' })
      const error = new OpenfortError('some_code', 'nope', { docsPath: 'errors/nope' })
      expect(error.docsUrl).toBe('https://docs.example.com/wallet/errors/nope')
    })

    it('does not double up slashes at the join', () => {
      setErrorConfig({ docsBaseUrl: 'https://docs.example.com/wallet/' })
      const error = new OpenfortError('some_code', 'nope', { docsPath: '/errors/nope' })
      expect(error.docsUrl).toBe('https://docs.example.com/wallet/errors/nope')
    })
  })
})

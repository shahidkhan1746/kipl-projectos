import { describe, expect, it } from 'vitest'
import { loginErrorMessage } from './loginFailure'

describe('loginErrorMessage', () => {
  it('uses a credential message only for an API 401', () => {
    expect(loginErrorMessage({
      response: { status: 401, data: { message: 'Invalid credentials' } },
    })).toBe('Invalid credentials')
  })

  it('preserves an account lock message from the API', () => {
    expect(loginErrorMessage({
      response: { status: 401, data: { message: 'Account temporarily locked. Try again later.' } },
    })).toContain('Account temporarily locked')
  })

  it('identifies a gateway timeout as a waking server', () => {
    expect(loginErrorMessage({ response: { status: 504 } })).toContain('waking up')
  })

  it('does not call a network failure invalid credentials', () => {
    const message = loginErrorMessage({ code: 'ERR_NETWORK' })
    expect(message).toContain('could not be reached')
    expect(message).not.toContain('credentials')
  })

  it('does not call an internal server error invalid credentials', () => {
    const message = loginErrorMessage({
      response: { status: 500, data: { message: 'Internal server error' } },
    })
    expect(message).toContain('could not complete sign-in')
    expect(message).not.toContain('credentials')
  })
})

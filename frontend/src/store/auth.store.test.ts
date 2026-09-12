import { describe, expect, it } from 'vitest'
import { persistedFields, useAuthStore, withoutExpiredAccessToken } from './auth.store'

/**
 * What survives a reload, and what must not.
 *
 * The refresh token survives a reload so the session hydrator and API client can
 * mint a fresh access token without forcing the user to log in on every refresh.
 *
 * The short-lived access token is in-memory only and must NEVER be persisted to
 * storage, avoiding stale expired token bugs.
 */
describe('what the auth store persists', () => {
  const full = {
    user: { id: 'u1', name: 'Shahid', email: 's@kipl.com', role: 'super_admin' as const },
    accessToken: 'access-token-value',
    refreshToken: 'refresh-token-value',
    activeProjectId: 'dal-stp-2025',
  }

  it('keeps the user, active project, and refresh token', () => {
    const kept = persistedFields(full as never) as unknown as Record<string, unknown>
    expect((kept.user as { name: string }).name).toBe('Shahid')
    expect(kept.activeProjectId).toBe('dal-stp-2025')
    expect(kept.refreshToken).toBe('refresh-token-value')
  })

  it('never persists the access token', () => {
    const kept = persistedFields(full as never)
    expect(JSON.stringify(kept)).not.toContain('access-token-value')
  })

  it('still holds both tokens in memory, which is where the client reads them', () => {
    useAuthStore.getState().setAuth(full.user, full.accessToken, full.refreshToken)
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-value')
    expect(useAuthStore.getState().accessToken).toBe('access-token-value')
  })
})

describe('what the auth store accepts back out of storage', () => {
  it('drops an access token that was persisted in storage', () => {
    const stored = { user: { name: 'Shahid' }, activeProjectId: 'p1', accessToken: 'expired-days-ago' }
    expect(withoutExpiredAccessToken(stored)).not.toHaveProperty('accessToken')
  })

  it('preserves the refresh token so the session can be minted fresh', () => {
    const stored = { user: { name: 'Shahid' }, refreshToken: 'live-refresh-token' }
    expect(withoutExpiredAccessToken(stored)).toHaveProperty('refreshToken', 'live-refresh-token')
  })

  it('leaves a blob with no credentials in it untouched', () => {
    const stored = { user: { name: 'Shahid' }, activeProjectId: 'p1' }
    expect(withoutExpiredAccessToken(stored)).toEqual(stored)
  })

  it('survives storage holding something that is not an object', () => {
    expect(withoutExpiredAccessToken(null)).toBeNull()
    expect(withoutExpiredAccessToken(undefined)).toBeUndefined()
    expect(withoutExpiredAccessToken('corrupt')).toBe('corrupt')
  })
})

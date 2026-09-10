import { describe, expect, it } from 'vitest'
import { persistedFields, useAuthStore } from './auth.store'

/**
 * What survives a reload, and what must not.
 *
 * The refresh token is a bearer credential with a seven-day life. Persisting it
 * puts it within reach of any script running on the page, which is the whole of
 * what an XSS needs. It belongs in the httpOnly kipl_refresh cookie, and this
 * test exists because it has already been added back once.
 *
 * Asserted against the configured `partialize` rather than against localStorage:
 * that function IS the rule about what leaves memory, and reading it directly
 * needs no jsdom and no dependency on how zustand schedules its writes.
 */
describe('what the auth store persists', () => {
  const full = {
    user: { id: 'u1', name: 'Shahid', email: 's@kipl.com', role: 'super_admin' as const },
    accessToken: 'access-token-value',
    refreshToken: 'refresh-token-value',
    activeProjectId: 'dal-stp-2025',
  }

  it('keeps the user and the active project', () => {
    const kept = persistedFields(full as never) as unknown as Record<string, unknown>
    expect((kept.user as { name: string }).name).toBe('Shahid')
    expect(kept.activeProjectId).toBe('dal-stp-2025')
  })

  it('lets no credential through, under any key', () => {
    const kept = persistedFields(full as never)
    expect(JSON.stringify(kept)).not.toContain('refresh-token-value')
    expect(JSON.stringify(kept)).not.toContain('access-token-value')
  })

  it('still holds both tokens in memory, which is where the client reads them', () => {
    useAuthStore.getState().setAuth(full.user, full.accessToken, full.refreshToken)
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-value')
    expect(useAuthStore.getState().accessToken).toBe('access-token-value')
  })
})

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'super_admin' | 'admin' | 'project_manager' | 'engineer'
  | 'accounts' | 'qa_engineer' | 'supervisor'
  | 'hr_officer' | 'liaison_officer' | 'accountant' | 'field_staff' | 'viewer'

export interface AuthUser { id: string; name: string; email: string; role: UserRole }

function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, role: user.role }
}

interface S {
  user: AuthUser | null; accessToken: string | null
  refreshToken: string | null; activeProjectId: string | null
  setAuth:     (u: AuthUser, at: string, rt: string) => void
  setToken:    (t: string) => void
  setProject:  (id: string) => void
  hydrateUser: (u: AuthUser) => void
  logout:      () => void
}

/**
 * The only state that outlives a reload.
 *
 * No tokens. The refresh token lives in the httpOnly kipl_refresh cookie, which
 * survives a reload without being readable by script — so an XSS on this site
 * cannot walk off with a session.
 *
 * It was briefly persisted here to fix a logout-on-reload attributed to Safari
 * blocking a third-party cookie. That diagnosis was wrong: vercel.json rewrites
 * /api/v1/* through to Render, so the browser only ever addresses
 * kiplstpsrinagar.com and the cookie is first-party. There was no third-party
 * cookie to block.
 *
 * Named and exported so the rule can be asserted directly. zustand's persist
 * middleware makes itself inert when localStorage is absent, which it is under
 * the node test environment, so there is nothing to read back from storage.
 */
export const persistedFields = (s: S) => ({
  user: s.user,
  activeProjectId: s.activeProjectId,
})

/**
 * Strips credentials off whatever comes back out of storage.
 *
 * `partialize` governs what is WRITTEN, and nothing else. Changing it stopped
 * new tokens being saved and did absolutely nothing about the ones already
 * sitting in every browser that had used the site before: zustand merges the
 * stored blob back over the initial state, so those long-dead tokens were
 * rehydrated into memory on every load.
 *
 * What that cost: the session hydrator sees an access token, concludes the
 * session is live and skips the cookie refresh, so every request goes out
 * bearing a token that expired days ago and comes back 401. Worse, the stale
 * refresh token gets posted to /auth/refresh, where the server had been
 * preferring the body over the cookie — and a refresh token that is expired in
 * the database is treated as replay, which revokes every token the user has,
 * including the perfectly good cookie session they arrived with.
 *
 * Applied on the way out rather than by a version bump, so it holds for every
 * stored blob regardless of what version it claims to be.
 */
export function withoutCredentials<T>(persisted: T): T {
  if (!persisted || typeof persisted !== 'object') return persisted
  const { accessToken: _access, refreshToken: _refresh, ...rest } =
    persisted as Record<string, unknown>
  return rest as T
}

export const useAuthStore = create<S>()(persist(
  set => ({
    user: null, accessToken: null, refreshToken: null, activeProjectId: null,
    setAuth:    (user, accessToken, refreshToken) => {
      set({ user: user ? normalizeUser(user) : null, accessToken, refreshToken });
    },
    setToken:   accessToken => set({ accessToken }),
    setProject: activeProjectId => set({ activeProjectId }),
    hydrateUser: user => set({ user: normalizeUser(user) }),
    logout:     () => set({ user: null, accessToken: null, refreshToken: null, activeProjectId: null }),
  }),
  {
    name: 'kipl-auth',
    version: 2,
    partialize: persistedFields,
    // Tokens live in memory and in the httpOnly cookie. Anything claiming to
    // be one that came out of localStorage is a leftover, and is dropped.
    merge: (persisted, current) => ({ ...current, ...withoutCredentials(persisted as object) }),
  }
))

const L: Record<UserRole, number> = {
  super_admin: 100, admin: 90, project_manager: 70,
  engineer: 50, accounts: 50, qa_engineer: 50, supervisor: 50,
  hr_officer: 50, liaison_officer: 50, accountant: 50,
  field_staff: 30, viewer: 10,
}
export const can = (user: AuthUser | null, min: UserRole) =>
  !!user && (user.role === 'super_admin' || L[user.role] >= L[min])

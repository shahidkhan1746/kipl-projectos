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
    partialize: persistedFields,
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

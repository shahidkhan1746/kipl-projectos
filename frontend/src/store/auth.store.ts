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
    partialize: s => ({ user: s.user, activeProjectId: s.activeProjectId }),
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

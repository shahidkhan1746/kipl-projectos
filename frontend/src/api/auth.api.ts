import api from './client'
import { useAuthStore } from '@/store/auth.store'

export const authApi = {
  login:   (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  refresh: (refresh_token?: string | null) => {
    const token = refresh_token || useAuthStore.getState().refreshToken
    return api.post('/api/v1/auth/refresh', token ? { refresh_token: token } : {})
  },
  logout:  (refresh_token?: string | null) => {
    const token = refresh_token || useAuthStore.getState().refreshToken
    return api.post('/api/v1/auth/logout', token ? { refresh_token: token } : {})
  },
  me:      () => api.get('/api/v1/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email: string) =>
    api.post('/api/v1/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),
  deleteAccount: (password: string) =>
    api.post('/api/v1/auth/delete-account', { password }),
}

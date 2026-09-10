import api from './client'

export const authApi = {
  login:   (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  refresh: (refresh_token?: string) =>
    api.post('/api/v1/auth/refresh', refresh_token ? { refresh_token } : {}),
  logout:  (refresh_token?: string) =>
    api.post('/api/v1/auth/logout', refresh_token ? { refresh_token } : {}),
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

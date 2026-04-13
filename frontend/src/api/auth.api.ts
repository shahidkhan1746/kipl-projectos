import api from './client'

export const authApi = {
  login:   (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  refresh: (refresh_token: string) =>
    api.post('/api/v1/auth/refresh', { refresh_token }),
  logout:  (refresh_token: string) =>
    api.post('/api/v1/auth/logout', { refresh_token }),
  me:      () => api.get('/api/v1/auth/me'),
}

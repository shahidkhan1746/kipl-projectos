import api from './client'
import { useAuthStore } from '@/store/auth.store'
import type { DevicePayload } from '@/lib/deviceIdentity'

export interface UserDeviceItem {
  id: string
  deviceId: string
  deviceName: string
  ipAddress?: string
  subnet?: string
  isTrusted: boolean
  trustScore: number
  lastActiveAt: string
  loginCount: number
  isCurrentDevice: boolean
}

export const authApi = {
  login: (
    email: string,
    password: string,
    deviceMeta?: DevicePayload,
    rememberMe = true,
  ) =>
    api.post('/api/v1/auth/login', {
      email,
      password,
      deviceId: deviceMeta?.deviceId,
      deviceName: deviceMeta?.deviceName,
      deviceFingerprint: deviceMeta?.deviceFingerprint,
      rememberMe,
    }),

  refresh: (refresh_token?: string | null, deviceMeta?: Partial<DevicePayload>) => {
    const token = refresh_token || useAuthStore.getState().refreshToken
    return api.post('/api/v1/auth/refresh', {
      ...(token ? { refresh_token: token } : {}),
      ...(deviceMeta ? {
        deviceId: deviceMeta.deviceId,
        deviceName: deviceMeta.deviceName,
        deviceFingerprint: deviceMeta.deviceFingerprint,
      } : {}),
    })
  },

  logout: (refresh_token?: string | null) => {
    const token = refresh_token || useAuthStore.getState().refreshToken
    return api.post('/api/v1/auth/logout', token ? { refresh_token: token } : {})
  },

  me: () => api.get('/api/v1/auth/me'),

  getDevices: () => api.get<UserDeviceItem[]>('/api/v1/auth/devices'),

  revokeDevice: (deviceId: string) =>
    api.post<{ ok: boolean }>(`/api/v1/auth/devices/${deviceId}/revoke`),

  revokeOtherDevices: () =>
    api.post<{ ok: boolean }>('/api/v1/auth/devices/revoke-others'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email: string) =>
    api.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),

  deleteAccount: (password: string) =>
    api.post('/api/v1/auth/delete-account', { password }),
}

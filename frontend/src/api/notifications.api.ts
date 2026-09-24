import api from './client'

export interface NotificationItem {
  id: string
  userId: string
  projectId?: string | null
  category: 'info' | 'warning' | 'critical' | 'success'
  type: string
  title: string
  message: string
  link?: string | null
  isRead: boolean
  readAt?: string | null
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ListNotificationsParams {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  category?: string
}

/**
 * What GET /api/v1/notifications actually answers with.
 *
 * It has always been a wrapper, never a bare array. The client typed it as
 * `NotificationItem[]` and guarded with `Array.isArray(...) ? ... : []`, so the
 * guard held every time and the bell showed an empty list for good.
 */
export interface NotificationListResponse {
  items: NotificationItem[]
  unreadCount: number
}

export const notificationsApi = {
  list: (params?: ListNotificationsParams) =>
    api.get<NotificationListResponse>('/api/v1/notifications', { params }),

  // The key is unreadCount, not count. Reading `.count` gave undefined, which
  // fell through to counting an empty array, which is why the badge never lit.
  unreadCount: () =>
    api.get<{ unreadCount: number }>('/api/v1/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch<NotificationItem>(`/api/v1/notifications/${id}/read`),

  markAllRead: () =>
    api.post<{ message: string }>('/api/v1/notifications/mark-all-read'),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/v1/notifications/${id}`),

  clearRead: () =>
    api.delete<{ message: string }>('/api/v1/notifications/clear-read'),
}

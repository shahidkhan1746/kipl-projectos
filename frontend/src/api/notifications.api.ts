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

export const notificationsApi = {
  list: (params?: ListNotificationsParams) =>
    api.get<NotificationItem[]>('/api/v1/notifications', { params }),

  unreadCount: () =>
    api.get<{ count: number }>('/api/v1/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch<NotificationItem>(`/api/v1/notifications/${id}/read`),

  markAllRead: () =>
    api.post<{ message: string }>('/api/v1/notifications/mark-all-read'),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/v1/notifications/${id}`),

  clearRead: () =>
    api.delete<{ message: string }>('/api/v1/notifications/clear-read'),
}

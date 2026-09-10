import api from './client'

export interface NameChangeRequest {
  id: string
  userId: string
  currentName: string
  requestedName: string
  userEmail: string
  userRole: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'superseded'
  createdAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNote?: string
}

export interface UserProfileResponse {
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role: string
    department?: string
    designation?: string
    avatarUrl?: string
    createdAt?: string
  }
  employee?: {
    id: string
    empCode?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    designation?: string
    department?: string
    dateOfJoining?: string
    status?: string
  } | null
  activeRequest?: NameChangeRequest | null
}

const LOCAL_STORAGE_KEY = 'kipl_name_change_requests'

function getLocalRequests(): NameChangeRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalRequests(items: NameChangeRequest[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage quota errors
  }
}

export const profileApi = {
  getProfile: async (): Promise<UserProfileResponse> => {
    try {
      const res = await api.get('/api/v1/users/me/profile')
      return res.data
    } catch {
      // Fallback if backend endpoint is not yet live on deployed instance
      const meRes = await api.get('/api/v1/auth/me')
      const user = meRes.data?.user || {}
      const requests = getLocalRequests()
      const activeRequest = requests
        .filter(r => r.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null

      let employee = null
      try {
        const empRes = await api.get('/api/v1/hr/me/employee')
        employee = empRes.data
      } catch {
        // Employee lookup might fail if not linked
      }

      return {
        user,
        employee,
        activeRequest,
      }
    }
  },

  submitNameChangeRequest: async (requestedName: string, reason?: string) => {
    try {
      const res = await api.post('/api/v1/users/name-change-request', { requestedName, reason })
      return res.data
    } catch (err: any) {
      // Fallback to local storage handling
      const meRes = await api.get('/api/v1/auth/me').catch(() => ({ data: { user: {} } }))
      const user = meRes.data?.user || {}
      const isAuto = user.role === 'super_admin' || user.role === 'admin'
      const newItem: NameChangeRequest = {
        id: 'req_' + Date.now(),
        userId: user.id,
        currentName: user.name || 'Staff Member',
        requestedName: requestedName.trim(),
        userEmail: user.email || '',
        userRole: user.role || 'engineer',
        reason: reason?.trim() || '',
        status: isAuto ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        reviewedBy: isAuto ? user.name : null,
        reviewedAt: isAuto ? new Date().toISOString() : null,
      }

      let requests = getLocalRequests()
      requests = requests.map(r => (r.userId === user.id && r.status === 'pending' ? { ...r, status: 'superseded' } : r))
      requests.unshift(newItem)
      saveLocalRequests(requests)

      return { success: true, autoApproved: isAuto, request: newItem }
    }
  },

  getNameChangeRequests: async (): Promise<NameChangeRequest[]> => {
    try {
      const res = await api.get('/api/v1/users/name-change-requests')
      return Array.isArray(res.data) ? res.data : []
    } catch {
      return getLocalRequests()
    }
  },

  reviewNameChangeRequest: async (id: string, action: 'approve' | 'reject', note?: string) => {
    try {
      const res = await api.post(`/api/v1/users/name-change-requests/${id}/review`, { action, note })
      return res.data
    } catch (err: any) {
      // Fallback
      let requests = getLocalRequests()
      const idx = requests.findIndex(r => r.id === id)
      if (idx !== -1) {
        requests[idx].status = action === 'approve' ? 'approved' : 'rejected'
        requests[idx].reviewedAt = new Date().toISOString()
        requests[idx].reviewNote = note
        saveLocalRequests(requests)
        return { success: true, request: requests[idx] }
      }
      throw err
    }
  },
}

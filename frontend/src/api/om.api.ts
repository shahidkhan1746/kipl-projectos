import api from './client'

export const omApi = {
  dashboard:   (projectId: string) => api.get('/api/v1/om/dashboard', { params: { projectId } }),

  logs:        (p: any) => api.get('/api/v1/om/logs', { params: p }),
  createLog:   (d: any) => api.post('/api/v1/om/logs', d),
  updateLog:   (id: string, d: any) => api.patch('/api/v1/om/logs/' + id, d),
  deleteLog:   (id: string) => api.delete('/api/v1/om/logs/' + id),

  events:      (p: any) => api.get('/api/v1/om/events', { params: p }),
  createEvent: (d: any) => api.post('/api/v1/om/events', d),
  updateEvent: (id: string, d: any) => api.patch('/api/v1/om/events/' + id, d),
  deleteEvent: (id: string) => api.delete('/api/v1/om/events/' + id),

  pm:          (projectId: string) => api.get('/api/v1/om/pm', { params: { projectId } }),
  createPm:    (d: any) => api.post('/api/v1/om/pm', d),
  updatePm:    (id: string, d: any) => api.patch('/api/v1/om/pm/' + id, d),
  pmDone:      (id: string) => api.post('/api/v1/om/pm/' + id + '/done', {}),
  deletePm:    (id: string) => api.delete('/api/v1/om/pm/' + id),
}

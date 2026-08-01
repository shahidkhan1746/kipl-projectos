import api from './client'

export const materialRegisterApi = {
  list:    (projectId: string) => api.get('/api/v1/material-register', { params: { projectId } }),
  summary: (projectId: string) => api.get('/api/v1/material-register/summary', { params: { projectId } }),
  create:  (d: any) => api.post('/api/v1/material-register', d),
  update:  (id: string, d: any) => api.patch('/api/v1/material-register/' + id, d),
  remove:  (id: string) => api.delete('/api/v1/material-register/' + id),
}

export const siteOrderApi = {
  list:    (projectId: string, status?: string) => api.get('/api/v1/site-orders', { params: { projectId, status } }),
  create:  (d: any) => api.post('/api/v1/site-orders', d),
  update:  (id: string, d: any) => api.patch('/api/v1/site-orders/' + id, d),
  remove:  (id: string) => api.delete('/api/v1/site-orders/' + id),
}

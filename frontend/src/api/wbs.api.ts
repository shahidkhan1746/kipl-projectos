import api from './client'
export const wbsApi = {
  dashboard: (projectId: string) => api.get('/api/v1/wbs/dashboard', { params: { projectId } }),
  list:      (projectId: string) => api.get('/api/v1/wbs', { params: { projectId } }),
  seed:      (projectId: string) => api.post('/api/v1/wbs/seed', { projectId }),
  create:    (d: any) => api.post('/api/v1/wbs', d),
  update:    (id: string, d: any) => api.patch('/api/v1/wbs/' + id, d),
}

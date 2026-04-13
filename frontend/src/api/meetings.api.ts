import api from './client'
export const meetingsApi = {
  dashboard:    (projectId: string) => api.get('/api/v1/meetings/dashboard', { params: { projectId } }),
  list:         (p?: any) => api.get('/api/v1/meetings', { params: p }),
  getOne:       (id: string) => api.get('/api/v1/meetings/' + id),
  create:       (d: any) => api.post('/api/v1/meetings', d),
  update:       (id: string, d: any) => api.patch('/api/v1/meetings/' + id, d),
  circulate:    (id: string) => api.patch('/api/v1/meetings/' + id + '/circulate', {}),
  confirm:      (id: string) => api.patch('/api/v1/meetings/' + id + '/confirm', {}),
  updateAction: (id: string, idx: number, d: any) => api.patch('/api/v1/meetings/' + id + '/actions/' + idx, d),
}

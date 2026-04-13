import api from './client'
export const fleetApi = {
  dashboard: (projectId: string) =>
    api.get('/api/v1/fleet/dashboard', { params: { projectId } }),
  list: (params: any) =>
    api.get('/api/v1/fleet', { params }),
  create: (dto: any) =>
    api.post('/api/v1/fleet', dto),
  update: (id: string, dto: any) =>
    api.patch('/api/v1/fleet/' + id, dto),
  delete: (id: string) =>
    api.delete('/api/v1/fleet/' + id),
}

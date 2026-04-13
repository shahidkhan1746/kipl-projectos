import api from './client'

export const projectsApi = {
  list:     ()                       => api.get('/api/v1/projects'),
  get:      (id: string)             => api.get(`/api/v1/projects/${id}`),
  create:   (data: any)              => api.post('/api/v1/projects', data),
  update:   (id: string, data: any)  => api.patch(`/api/v1/projects/${id}`, data),
  public:   (code: string)           => api.get(`/api/v1/projects/public/${code}`),
}

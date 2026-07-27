import api from './client'

export const storageApi = {
  getConfig: () => api.get('/api/v1/storage/config'),
  save:      (body: any) => api.post('/api/v1/storage/config', body),
  test:      () => api.post('/api/v1/storage/test'),
}

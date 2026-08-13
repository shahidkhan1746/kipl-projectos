import api from './client'

export const aiApi = {
  getConfig:  () => api.get('/api/v1/ai/config'),
  saveConfig: (body: any) => api.post('/api/v1/ai/config', body),
  createKey:  (body: any) => api.post('/api/v1/ai/keys', body),
  updateKey:  (id: string, body: any) => api.patch(`/api/v1/ai/keys/${id}`, body),
  deleteKey:  (id: string) => api.delete(`/api/v1/ai/keys/${id}`),
  testKey:    (id: string) => api.post(`/api/v1/ai/keys/${id}/test`, {}),
  generate:   (prompt: string, system?: string) => api.post('/api/v1/ai/generate', { prompt, system }),
}

import api from './client'

export const aiApi = {
  getConfig:  () => api.get('/api/v1/ai/config'),
  saveConfig: (body: any) => api.post('/api/v1/ai/config', body),
  test:       () => api.post('/api/v1/ai/test', {}),
  generate:   (prompt: string, system?: string) => api.post('/api/v1/ai/generate', { prompt, system }),
}

import api from './client'
export const mailerApi = {
  status:     () => api.get('/api/v1/mailer/status'),
  getConfig:  () => api.get('/api/v1/mailer/config'),
  saveConfig: (d: any) => api.post('/api/v1/mailer/config', d),
  test:       (to: string) => api.post('/api/v1/mailer/test', { to }),
  send:       (d: any) => api.post('/api/v1/mailer/send', d),
}

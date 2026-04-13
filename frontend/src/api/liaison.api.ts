import api from './client'
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'
export const liaisonApi = {
  dashboard:    (projectId?: string) => api.get('/api/v1/liaison/dashboard', { params: { projectId } }),
  files:        (p?: any) => api.get('/api/v1/liaison/files', { params: p }),
  file:         (id: string) => api.get('/api/v1/liaison/files/' + id),
  createFile:   (d: any) => api.post('/api/v1/liaison/files', d),
  approveFile:  (id: string, d: any) => api.patch('/api/v1/liaison/files/' + id + '/approve', d),
  letters:      (p?: any) => api.get('/api/v1/liaison/letters', { params: p }),
  letter:       (id: string) => api.get('/api/v1/liaison/letters/' + id),
  createLetter: (d: any) => api.post('/api/v1/liaison/letters', d),
  sendLetter:   (id: string, d: any) => api.post('/api/v1/liaison/letters/' + id + '/send', d),
  pdfUrl:       (id: string) => BASE + '/api/v1/liaison/letters/' + id + '/pdf',
  gmailStatus:  () => api.get('/api/v1/gmail/status'),
}

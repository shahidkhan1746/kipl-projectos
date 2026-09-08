import api from './client'
import { API_BASE as BASE } from '@/api/base'

export const liaisonApi = {
  dashboard:    (projectId?: string) => api.get('/api/v1/liaison/dashboard', { params: { projectId } }),
  files:        (p?: any) => api.get('/api/v1/liaison/files', { params: p }),
  file:         (id: string) => api.get('/api/v1/liaison/files/' + id),
  createFile:   (d: any) => api.post('/api/v1/liaison/files', d),
  approveFile:  (id: string, d: any) => api.patch('/api/v1/liaison/files/' + id + '/approve', d),
  updateFile:   (id: string, d: any) => api.patch('/api/v1/liaison/files/' + id, d),
  closeFile:    (id: string) => api.patch('/api/v1/liaison/files/' + id + '/close', {}),
  letters:      (p?: any) => api.get('/api/v1/liaison/letters', { params: p }),
  letter:       (id: string) => api.get('/api/v1/liaison/letters/' + id),
  createLetter: (d: any) => api.post('/api/v1/liaison/letters', d),
  sendLetter:   (id: string, d: any) => api.post('/api/v1/liaison/letters/' + id + '/send', d),
  pdfUrl:       (id: string) => BASE + '/api/v1/liaison/letters/' + id + '/pdf',
  gmailStatus:  () => api.get('/api/v1/gmail/status'),
}

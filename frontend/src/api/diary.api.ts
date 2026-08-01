import api from './client'
export const diaryApi = {
  dashboard: (projectId: string) => api.get('/api/v1/diary/dashboard', { params: { projectId } }),
  list:      (p?: any) => api.get('/api/v1/diary', { params: p }),
  byDate:    (projectId: string, date: string) => api.get('/api/v1/diary/by-date', { params: { projectId, date } }),
  getOne:    (id: string) => api.get('/api/v1/diary/' + id),
  create:    (d: any) => api.post('/api/v1/diary', d),
  update:    (id: string, d: any) => api.patch('/api/v1/diary/' + id, d),
  submit:    (id: string) => api.patch('/api/v1/diary/' + id + '/submit', {}),
  approve:   (id: string) => api.patch('/api/v1/diary/' + id + '/approve', {}),
  uploadPhoto: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post('/api/v1/diary/upload', fd) },
}

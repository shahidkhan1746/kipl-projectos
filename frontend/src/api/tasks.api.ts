import api from './client'
export const tasksApi = {
  dashboard: (projectId: string) => api.get('/api/v1/tasks-board/dashboard', { params: { projectId } }),
  list:      (p?: any) => api.get('/api/v1/tasks-board', { params: p }),
  create:    (d: any) => api.post('/api/v1/tasks-board', d),
  update:    (id: string, d: any) => api.patch('/api/v1/tasks-board/' + id, d),
  comment:   (id: string, text: string) => api.post('/api/v1/tasks-board/' + id + '/comments', { text }),
  delete:    (id: string) => api.delete('/api/v1/tasks-board/' + id),
}

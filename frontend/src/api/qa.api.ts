import api from './client'
export const qaApi = {
  dashboard:       (projectId: string) => api.get('/api/v1/qa/dashboard', { params: { projectId } }),
  checklists:      (projectId: string, category?: string) => api.get('/api/v1/qa/checklists', { params: { projectId, category } }),
  seedChecklists:  (projectId: string) => api.post('/api/v1/qa/checklists/seed', { projectId }),
  getChecklist:    (id: string) => api.get('/api/v1/qa/checklists/' + id),
  createChecklist: (d: any) => api.post('/api/v1/qa/checklists', d),
  inspections:     (p?: any) => api.get('/api/v1/qa/inspections', { params: p }),
  createInspection:(d: any) => api.post('/api/v1/qa/inspections', d),
  updateInspection:(id: string, d: any) => api.patch('/api/v1/qa/inspections/' + id, d),
  ncrs:            (p?: any) => api.get('/api/v1/qa/ncrs', { params: p }),
  createNcr:       (d: any) => api.post('/api/v1/qa/ncrs', d),
  closeNcr:        (id: string, d: any) => api.patch('/api/v1/qa/ncrs/' + id + '/close', d),
  cubeTests:       (projectId?: string) => api.get('/api/v1/qa/cube-tests', { params: { projectId } }),
  createCubeTest:  (d: any) => api.post('/api/v1/qa/cube-tests', d),
  record7DayBreak: (id: string, d: any) => api.post('/api/v1/qa/cube-tests/' + id + '/break-7d', d),
  record28DayBreak:(id: string, d: any) => api.post('/api/v1/qa/cube-tests/' + id + '/break-28d', d),
  deleteCubeTest:  (id: string) => api.delete('/api/v1/qa/cube-tests/' + id),
}
import api from './client'
export const wbsApi = {
  dashboard:    (projectId: string) => api.get('/api/v1/wbs/dashboard', { params: { projectId } }),
  list:         (projectId: string) => api.get('/api/v1/wbs', { params: { projectId } }),
  seed:         (projectId: string, force = false) => api.post('/api/v1/wbs/seed', { projectId, force }),
  create:       (d: any) => api.post('/api/v1/wbs', d),
  update:       (id: string, d: any) => api.patch('/api/v1/wbs/' + id, d),

  // CPM & PERT
  cpm:          (projectId: string) => api.get('/api/v1/wbs/cpm',  { params: { projectId } }),
  pert:         (projectId: string) => api.get('/api/v1/wbs/pert', { params: { projectId } }),
  eotRegister:  (projectId: string) => api.get('/api/v1/wbs/eot-register', { params: { projectId } }),
  recalculate:  (projectId: string) => api.post('/api/v1/wbs/recalculate', { projectId }),

  // PDF downloads
  ganttFullPdf: (projectId: string) => api.get('/api/v1/wbs/pdf/gantt-full',      { params: { projectId }, responseType: 'blob' }),
  ganttQuartPdf:(projectId: string) => api.get('/api/v1/wbs/pdf/gantt-quarterly', { params: { projectId }, responseType: 'blob' }),
  reportPdf:    (projectId: string) => api.get('/api/v1/wbs/pdf/report',          { params: { projectId }, responseType: 'blob' }),
}

import api from './client'
export const wbsApi = {
  dashboard:    (projectId: string) => api.get('/api/v1/wbs/dashboard', { params: { projectId } }),
  list:         (projectId: string) => api.get('/api/v1/wbs', { params: { projectId } }),
  seed:         (projectId: string, force = false) => api.post('/api/v1/wbs/seed', { projectId, force }),
  addEnabling:  (projectId: string) => api.post('/api/v1/wbs/enabling', { projectId }),
  create:       (d: any) => api.post('/api/v1/wbs', d),
  update:       (id: string, d: any) => api.patch('/api/v1/wbs/' + id, d),

  // CPM & PERT
  cpm:          (projectId: string) => api.get('/api/v1/wbs/cpm',  { params: { projectId } }),
  pert:         (projectId: string) => api.get('/api/v1/wbs/pert', { params: { projectId } }),
  eotRegister:  (projectId: string) => api.get('/api/v1/wbs/eot-register', { params: { projectId } }),
  issues:       (projectId: string) => api.get('/api/v1/wbs/issues', { params: { projectId } }),
  recalculate:  (projectId: string) => api.post('/api/v1/wbs/recalculate', { projectId }),

  // Baselines — frozen copies of the programme that progress and delay are measured against
  baselines:        (projectId: string) => api.get('/api/v1/wbs/baselines', { params: { projectId } }),
  createBaseline:   (projectId: string, name: string, notes?: string) => api.post('/api/v1/wbs/baselines', { projectId, name, notes }),
  baselineVariance: (id: string) => api.get(`/api/v1/wbs/baselines/${id}/variance`),

  activeBaseline:   (projectId: string) => api.get('/api/v1/wbs/baselines/active', { params: { projectId } }),
  activateBaseline: (id: string) => api.post(`/api/v1/wbs/baselines/${id}/activate`, {}),

  // S-curve: baseline, forecast and latest-permissible progress, with Clause 16.3
  sCurve:       (projectId: string, baselineId?: string) => api.get('/api/v1/wbs/s-curve', { params: { projectId, baselineId } }),

  // PDF downloads
  ganttFullPdf: (projectId: string) => api.get('/api/v1/wbs/pdf/gantt-full',      { params: { projectId }, responseType: 'blob' }),
  ganttQuartPdf:(projectId: string) => api.get('/api/v1/wbs/pdf/gantt-quarterly', { params: { projectId }, responseType: 'blob' }),
  reportPdf:    (projectId: string) => api.get('/api/v1/wbs/pdf/report',          { params: { projectId }, responseType: 'blob' }),
}

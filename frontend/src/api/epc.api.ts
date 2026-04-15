import api from './client'

export const epcApi = {
  // BOQ
  boqItems:    (projectId: string, category?: string) =>
    api.get('/api/v1/epc/boq', { params: { projectId, category } }),
  boqSummary:  (projectId: string) =>
    api.get('/api/v1/epc/boq/summary', { params: { projectId } }),
  seedBoq:     (projectId: string) =>
    api.post('/api/v1/epc/boq/seed', { projectId }),
  createBoq:   (d: any) => api.post('/api/v1/epc/boq', d),
  updateBoq:   (id: string, d: any) => api.patch('/api/v1/epc/boq/' + id, d),
  measureQty:  (id: string, measuredQty: number) =>
    api.patch('/api/v1/epc/boq/' + id + '/measure', { measuredQty }),

  saveQuotedRate: (projectId: string, category: string, subCategory: string, quotedAmount: number) =>
    api.patch('/api/v1/epc/boq/quoted-rate', { projectId, category, subCategory, quotedAmount }),

  // RA Bills
  raBills:     (projectId: string) =>
    api.get('/api/v1/epc/ra-bills', { params: { projectId } }),
  createRaBill:(d: any) => api.post('/api/v1/epc/ra-bills', d),
  getRaBill:   (id: string) => api.get('/api/v1/epc/ra-bills/' + id),
  updateStatus:(id: string, status: string, remarks?: string) =>
    api.patch('/api/v1/epc/ra-bills/' + id + '/status', { status, remarks }),

  // Measurements
  measurements:(p: any) => api.get('/api/v1/epc/measurements', { params: p }),
  addMeasurement:(d: any) => api.post('/api/v1/epc/measurements', d),

  // Payment milestones
  milestones:  () => api.get('/api/v1/epc/payment-milestones'),
}
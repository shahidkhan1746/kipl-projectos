import api from './client'

export interface ComplianceRecordDto {
  id?: string
  projectId: string
  itemId: string
  status?: string
  deadline?: string | null
  evidenceUrl?: string | null
  notes?: string | null
  updatedBy?: string
}

export interface JhaCheckDto {
  id?: string
  projectId: string
  paramKey: string
  itemId: string
  checked?: boolean
  evidenceUrl?: string | null
  notes?: string | null
  updatedBy?: string
}

export const complianceApi = {
  getItems: (projectId: string) =>
    api.get<ComplianceRecordDto[]>('/api/v1/compliance/items', { params: { projectId } }),

  saveItem: (data: Partial<ComplianceRecordDto> & { projectId: string; itemId: string }) =>
    api.post<ComplianceRecordDto>('/api/v1/compliance/items', data),

  getJha: (projectId: string) =>
    api.get<JhaCheckDto[]>('/api/v1/compliance/jha', { params: { projectId } }),

  saveJha: (data: Partial<JhaCheckDto> & { projectId: string; paramKey: string; itemId: string }) =>
    api.post<JhaCheckDto>('/api/v1/compliance/jha', data),

  uploadEvidence: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<{ url: string }>('/api/v1/compliance/evidence', fd)
  },
}

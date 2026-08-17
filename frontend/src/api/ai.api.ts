import api from './client'

export interface KnowledgeDocument {
  id: string
  projectId?: string
  documentName: string
  category: string
  fileUrl?: string
  fileSizeBytes?: number
  mimeType?: string
  sourceType: 'direct_upload' | 'liaison_fetch' | 'system_sync'
  sourceId?: string
  totalChunks: number
  status: 'indexed' | 'processing' | 'failed'
  errorMessage?: string
  uploadedBy?: string
  createdAt: string
  updatedAt: string
}

export const aiApi = {
  getConfig:  () => api.get('/api/v1/ai/config'),
  saveConfig: (body: any) => api.post('/api/v1/ai/config', body),
  createKey:  (body: any) => api.post('/api/v1/ai/keys', body),
  updateKey:  (id: string, body: any) => api.patch(`/api/v1/ai/keys/${id}`, body),
  deleteKey:  (id: string) => api.delete(`/api/v1/ai/keys/${id}`),
  testKey:    (id: string) => api.post(`/api/v1/ai/keys/${id}/test`, {}),
  generate:   (prompt: string, system?: string) => api.post('/api/v1/ai/generate', { prompt, system }),
  getSessions: (projectId: string) => api.get(`/api/v1/ai/chat/sessions`, { params: { projectId } }),
  getSessionHistory: (id: string) => api.get(`/api/v1/ai/chat/sessions/${id}`),
  deleteSession: (id: string) => api.delete(`/api/v1/ai/chat/sessions/${id}`),
  chat: (sessionId: string, query: string, projectId: string) => api.post(`/api/v1/ai/chat`, { sessionId, query, projectId }),
  syncKnowledge: (projectId?: string) => api.post(`/api/v1/ai/sync-knowledge`, { projectId }),

  // Knowledge Vault & Pool
  uploadKnowledgeFile: (formData: FormData) => api.post<KnowledgeDocument>('/api/v1/ai/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getKnowledgeDocuments: (params?: { projectId?: string; category?: string; search?: string }) =>
    api.get<KnowledgeDocument[]>('/api/v1/ai/knowledge/documents', { params }),
  fetchLiaisonDocuments: (projectId?: string) => api.post<{ fetched: number; details: string[] }>('/api/v1/ai/knowledge/fetch-liaison', { projectId }),
  reindexKnowledgeDocument: (id: string) => api.post<KnowledgeDocument>(`/api/v1/ai/knowledge/documents/${id}/reindex`),
  deleteKnowledgeDocument: (id: string) => api.delete<{ success: boolean }>(`/api/v1/ai/knowledge/documents/${id}`),
}

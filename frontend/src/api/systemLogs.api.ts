import api from './client'

export interface SystemLogItem {
  id: string
  source: 'backend' | 'frontend' | 'mobile'
  level: 'error' | 'warn' | 'fatal' | 'info'
  errorName?: string
  message: string
  stack?: string
  path?: string
  method?: string
  statusCode?: number
  userId?: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  resolved: boolean
  createdAt: string
}

export interface SystemLogsListResponse {
  items: SystemLogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SystemLogsStatsResponse {
  total: number
  today: number
  last7Days: number
  unresolved: number
  bySource: {
    backend: number
    frontend: number
    mobile: number
  }
  topErrors: Array<{
    path: string
    statusCode: number
    count: number
  }>
}

export interface SystemDiagnosticsResponse {
  timestamp: string
  status: 'healthy' | 'degraded'
  diagnostics: {
    database: {
      status: string
      latencyMs: number
      error?: string | null
    }
    memory: {
      rssMb: number
      heapUsedMb: number
      heapTotalMb: number
    }
    runtime: {
      uptimeSeconds: number
      uptimeFormatted: string
      nodeVersion: string
      platform: string
      environment: string
    }
    migrations: {
      appliedCount: number
      skippedCount: number
      failedCount: number
      upToDate: boolean
    }
  }
}

export interface SystemLogsFilterParams {
  source?: string
  level?: string
  statusCode?: number
  search?: string
  resolved?: boolean
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export const systemLogsApi = {
  async listLogs(params: SystemLogsFilterParams = {}): Promise<SystemLogsListResponse> {
    const { data } = await api.get('/api/v1/system-logs', { params })
    return data
  },

  async getStats(): Promise<SystemLogsStatsResponse> {
    const { data } = await api.get('/api/v1/system-logs/stats')
    return data
  },

  async getDiagnostics(): Promise<SystemDiagnosticsResponse> {
    const { data } = await api.get('/api/v1/system-logs/diagnostics')
    return data
  },

  async resolveLog(id: string, resolved = true): Promise<{ ok: boolean; id: string; resolved: boolean }> {
    const { data } = await api.patch(`/api/v1/system-logs/${id}/resolve`, { resolved })
    return data
  },

  async resolveAll(): Promise<{ ok: boolean; updated: number }> {
    const { data } = await api.post('/api/v1/system-logs/resolve-all')
    return data
  },

  async pruneLogs(days = 30): Promise<{ ok: boolean; deleted: number }> {
    const { data } = await api.delete('/api/v1/system-logs/prune', { params: { days } })
    return data
  },
}

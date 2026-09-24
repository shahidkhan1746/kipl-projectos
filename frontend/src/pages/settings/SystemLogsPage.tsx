import React, { useState, useEffect, useCallback } from 'react'
import {
  systemLogsApi,
  type SystemLogItem,
  type SystemLogsStatsResponse,
  type SystemDiagnosticsResponse,
} from '@/api/systemLogs.api'
import {
  getLocalClientLogs,
  clearLocalClientLogs,
  getClientDiagnostics,
  type ClientLogEntry,
  type ClientDiagnostics,
} from '@/lib/clientLog'
import {
  Bug,
  ChartLine,
  CheckCircle,
  WarningCircle,
  Warning,
  Info,
  MagnifyingGlass,
  ArrowCounterClockwise,
  Trash,
  DownloadSimple,
  Check,
  X,
  CaretLeft,
  CaretRight,
  HardDrives,
  Clock,
  DeviceMobile,
  Globe,
  Copy,
} from '@phosphor-icons/react'

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<'server' | 'client' | 'diagnostics'>('server')
  const [logs, setLogs] = useState<SystemLogItem[]>([])
  const [localLogs, setLocalLogs] = useState<ClientLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<SystemLogsStatsResponse | null>(null)
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsResponse | null>(null)
  const [clientDiag, setClientDiag] = useState<ClientDiagnostics | null>(null)
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | ClientLogEntry | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [resolvedFilter, setResolvedFilter] = useState<string>('all')

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3500)
  }

  // Load server logs and statistics
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const resolvedParam =
        resolvedFilter === 'unresolved' ? false : resolvedFilter === 'resolved' ? true : undefined

      const data = await systemLogsApi.listLogs({
        page,
        limit,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        statusCode: statusFilter !== 'all' ? Number(statusFilter) : undefined,
        resolved: resolvedParam,
        search: search.trim() ? search.trim() : undefined,
      })

      setLogs(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err: any) {
      console.error('Failed to load system logs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, sourceFilter, levelFilter, statusFilter, resolvedFilter, search])

  const fetchStats = useCallback(async () => {
    try {
      const st = await systemLogsApi.getStats()
      setStats(st)
    } catch {}
  }, [])

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const [srv, cli] = await Promise.all([
        systemLogsApi.getDiagnostics().catch(() => null),
        Promise.resolve(getClientDiagnostics()),
      ])
      setDiagnostics(srv)
      setClientDiag(cli)
      showFeedback('Live diagnostic check completed')
    } catch (err) {
      showFeedback('Diagnostics check encountered an issue')
    } finally {
      setLoading(false)
    }
  }

  const loadLocalClientLogs = () => {
    setLocalLogs(getLocalClientLogs())
    setClientDiag(getClientDiagnostics())
  }

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchStats()
    loadLocalClientLogs()
  }, [fetchStats])

  const handleResolve = async (id: string, current: boolean) => {
    try {
      await systemLogsApi.resolveLog(id, !current)
      setLogs(prev => prev.map(l => (l.id === id ? { ...l, resolved: !current } : l)))
      if (selectedLog && 'id' in selectedLog && selectedLog.id === id) {
        setSelectedLog({ ...(selectedLog as SystemLogItem), resolved: !current })
      }
      fetchStats()
      showFeedback(current ? 'Marked as unresolved' : 'Marked as resolved')
    } catch {
      showFeedback('Failed to update log status')
    }
  }

  const handleResolveAll = async () => {
    if (!window.confirm('Mark all unresolved error logs as resolved?')) return
    try {
      const res = await systemLogsApi.resolveAll()
      showFeedback(`Resolved ${res.updated} error log(s)`)
      fetchLogs()
      fetchStats()
    } catch {
      showFeedback('Failed to resolve all logs')
    }
  }

  const handlePrune = async () => {
    if (!window.confirm('Delete logs older than 30 days?')) return
    try {
      const res = await systemLogsApi.pruneLogs(30)
      showFeedback(`Pruned ${res.deleted} old log entries`)
      fetchLogs()
      fetchStats()
    } catch {
      showFeedback('Failed to prune old logs')
    }
  }

  const handleExportJson = () => {
    const dataToExport = activeTab === 'server' ? logs : localLogs
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kipl_error_logs_${activeTab}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showFeedback('Logs exported to JSON')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    showFeedback('Copied to clipboard')
  }

  const formatRelativeTime = (iso: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
      if (diff < 60) return `${Math.max(1, diff)}s ago`
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return `${Math.floor(diff / 86400)}d ago`
    } catch {
      return iso
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bug size={26} color="#dc2626" weight="duotone" />
            System Error Logs & Diagnostics
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Permanent database audit log of server exceptions, client crashes, network anomalies, and infrastructure health.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              fetchLogs()
              fetchStats()
              loadLocalClientLogs()
              showFeedback('Logs refreshed')
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ArrowCounterClockwise size={16} />
            Refresh
          </button>

          <button
            onClick={runDiagnostics}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: '#2563eb',
              border: '1px solid #1d4ed8',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ChartLine size={16} weight="bold" />
            Run Diagnostics
          </button>

          <button
            onClick={handleExportJson}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <DownloadSimple size={16} />
            Export JSON
          </button>

          <button
            onClick={handleResolveAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <CheckCircle size={16} weight="bold" />
            Resolve All
          </button>

          <button
            onClick={handlePrune}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#be123c',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Trash size={16} />
            Prune 30d+
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          background: '#0f172a',
          color: '#f8fafc',
          padding: '10px 16px',
          borderRadius: 8,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <Info size={18} color="#38bdf8" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Card 1: Server Status */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Database & API</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12,
              background: diagnostics?.status === 'degraded' ? '#fee2e2' : '#dcfce7',
              color: diagnostics?.status === 'degraded' ? '#991b1b' : '#166534',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {diagnostics?.status === 'degraded' ? 'Degraded' : 'Healthy'}
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {diagnostics?.diagnostics?.database?.latencyMs !== undefined ? `${diagnostics.diagnostics.database.latencyMs}ms` : 'Connected'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Uptime: {diagnostics?.diagnostics?.runtime?.uptimeFormatted || 'Online'}
          </div>
        </div>

        {/* Card 2: Unresolved Issues */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Unresolved Issues</span>
            <Warning size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: stats?.unresolved ? '#b45309' : '#0f172a' }}>
            {stats?.unresolved ?? 0}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {stats?.today ?? 0} logged today • {stats?.last7Days ?? 0} past 7 days
          </div>
        </div>

        {/* Card 3: Total Logs */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>All Logged Incidents</span>
            <HardDrives size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {stats?.total ?? total}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Backend: {stats?.bySource?.backend ?? 0} • Frontend: {stats?.bySource?.frontend ?? 0}
          </div>
        </div>

        {/* Card 4: Local Client Buffer */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Browser Ring Buffer</span>
            <Globe size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {localLogs.length}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Local browser storage (retained even offline)
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Server Logs vs Browser Ring Buffer vs Diagnostic Deep Dive */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('server')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: activeTab === 'server' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'server' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <HardDrives size={16} />
          Database Logs ({total})
        </button>

        <button
          onClick={() => {
            setActiveTab('client')
            loadLocalClientLogs()
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: activeTab === 'client' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'client' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Globe size={16} />
          Browser Ring Buffer ({localLogs.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('diagnostics')
            if (!diagnostics) runDiagnostics()
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: activeTab === 'diagnostics' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'diagnostics' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ChartLine size={16} />
          Live Diagnostics Telemetry
        </button>
      </div>

      {/* VIEW 1: Database Error Logs */}
      {activeTab === 'server' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Filters Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <MagnifyingGlass size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search error message, path, user email, or stack..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={sourceFilter}
              onChange={e => {
                setSourceFilter(e.target.value)
                setPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', outline: 'none' }}
            >
              <option value="all">All Sources</option>
              <option value="backend">Backend Server</option>
              <option value="frontend">Frontend Web</option>
              <option value="mobile">Mobile App</option>
            </select>

            <select
              value={levelFilter}
              onChange={e => {
                setLevelFilter(e.target.value)
                setPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', outline: 'none' }}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="fatal">Fatal</option>
              <option value="info">Info</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', outline: 'none' }}
            >
              <option value="all">All HTTP Codes</option>
              <option value="500">500 Server Error</option>
              <option value="429">429 Rate Limited / Sleep</option>
              <option value="502">502 Bad Gateway</option>
              <option value="503">503 Unavailable</option>
              <option value="504">504 Gateway Timeout</option>
            </select>

            <select
              value={resolvedFilter}
              onChange={e => {
                setResolvedFilter(e.target.value)
                setPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', outline: 'none' }}
            >
              <option value="all">All Statuses</option>
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px', width: 110 }}>Time</th>
                  <th style={{ padding: '12px 16px', width: 100 }}>Source</th>
                  <th style={{ padding: '12px 16px', width: 90 }}>Status</th>
                  <th style={{ padding: '12px 16px', width: 180 }}>Endpoint / Path</th>
                  <th style={{ padding: '12px 16px' }}>Error Details</th>
                  <th style={{ padding: '12px 16px', width: 160 }}>User</th>
                  <th style={{ padding: '12px 16px', width: 130, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      Loading system logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                      <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>No system error logs found</div>
                      <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                        The system has encountered zero logged exceptions matching the selected criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const isError = log.level === 'error' || log.level === 'fatal'
                    const isWarn = log.level === 'warn'
                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: log.resolved ? '#fafafa' : '#fff',
                          opacity: log.resolved ? 0.75 : 1,
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#64748b' }} title={log.createdAt}>
                          {formatRelativeTime(log.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background:
                                log.source === 'backend'
                                  ? '#eff6ff'
                                  : log.source === 'frontend'
                                  ? '#fdf4ff'
                                  : '#f0fdf4',
                              color:
                                log.source === 'backend'
                                  ? '#1d4ed8'
                                  : log.source === 'frontend'
                                  ? '#a21caf'
                                  : '#15803d',
                            }}
                          >
                            {log.source === 'backend' ? (
                              <HardDrives size={12} />
                            ) : log.source === 'frontend' ? (
                              <Globe size={12} />
                            ) : (
                              <DeviceMobile size={12} />
                            )}
                            {log.source}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: isError ? '#fee2e2' : isWarn ? '#fef3c7' : '#e0f2fe',
                              color: isError ? '#991b1b' : isWarn ? '#92400e' : '#0369a1',
                            }}
                          >
                            {log.statusCode || log.errorName || 'ERR'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: '#334155',
                          }}
                          title={log.path}
                        >
                          {log.method && <strong style={{ color: '#0284c7', marginRight: 4 }}>{log.method}</strong>}
                          {log.path || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div
                            onClick={() => setSelectedLog(log)}
                            style={{
                              cursor: 'pointer',
                              fontWeight: log.resolved ? 400 : 600,
                              color: log.resolved ? '#64748b' : '#0f172a',
                              maxWidth: 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title="Click to view full stack trace and metadata"
                          >
                            {log.message}
                          </div>
                          {log.stack && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              Includes stack trace • click to inspect
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>
                          {log.userEmail ? (
                            <div>
                              <div style={{ color: '#1e293b', fontWeight: 500 }}>{log.userEmail}</div>
                              {log.userRole && <div style={{ fontSize: 11, color: '#94a3b8' }}>{log.userRole}</div>}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Anonymous</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => setSelectedLog(log)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#334155',
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleResolve(log.id, log.resolved)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: '1px solid',
                                borderColor: log.resolved ? '#cbd5e1' : '#bbf7d0',
                                background: log.resolved ? '#f8fafc' : '#f0fdf4',
                                color: log.resolved ? '#64748b' : '#166534',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                              title={log.resolved ? 'Mark unresolved' : 'Mark resolved'}
                            >
                              {log.resolved ? 'Unresolve' : 'Resolve'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748b' }}>
            <div>
              Showing {logs.length ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} errors
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: page <= 1 ? '#f8fafc' : '#fff',
                  color: page <= 1 ? '#cbd5e1' : '#334155',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <CaretLeft size={14} /> Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: page >= totalPages ? '#f8fafc' : '#fff',
                  color: page >= totalPages ? '#cbd5e1' : '#334155',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next <CaretRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Browser Ring Buffer */}
      {activeTab === 'client' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Client-Side Local Ring Buffer
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                Retains the last 50 exceptions directly inside this browser&apos;s localStorage. Crucial for diagnosing issues when the network or server is sleeping or failing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  loadLocalClientLogs()
                  showFeedback('Reloaded local ring buffer')
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Clear local browser logs?')) {
                    clearLocalClientLogs()
                    loadLocalClientLogs()
                    showFeedback('Local browser logs cleared')
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#fee2e2',
                  border: 'none',
                  color: '#991b1b',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Clear Buffer
              </button>
            </div>
          </div>

          {localLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600 }}>Your browser ring buffer is empty</div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                No unhandled frontend crashes or network dropouts are stored on this device.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localLogs.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedLog(item)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: item.level === 'error' ? '#fee2e2' : '#fef3c7',
                          color: item.level === 'error' ? '#991b1b' : '#92400e',
                        }}
                      >
                        {item.errorName || item.level.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{item.path || 'UI Component'}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{item.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Live Diagnostics Telemetry */}
      {activeTab === 'diagnostics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {/* Server Telemetry */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HardDrives size={18} color="#2563eb" />
              Backend Server & Database Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>PostgreSQL Connectivity:</span>
                <strong style={{ color: diagnostics?.diagnostics?.database?.status === 'ok' ? '#16a34a' : '#dc2626' }}>
                  {diagnostics?.diagnostics?.database?.status === 'ok' ? 'Connected (SELECT 1 passed)' : 'Error'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Query Latency:</span>
                <strong>{diagnostics?.diagnostics?.database?.latencyMs ?? 0} ms</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Server Uptime:</span>
                <strong>{diagnostics?.diagnostics?.runtime?.uptimeFormatted || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Node.js Version:</span>
                <code>{diagnostics?.diagnostics?.runtime?.nodeVersion || '—'}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Platform / OS:</span>
                <strong>{diagnostics?.diagnostics?.runtime?.platform || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Server Memory (RSS):</span>
                <strong>{diagnostics?.diagnostics?.memory?.rssMb ?? '—'} MB</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Heap Memory Used:</span>
                <strong>{diagnostics?.diagnostics?.memory?.heapUsedMb ?? '—'} / {diagnostics?.diagnostics?.memory?.heapTotalMb ?? '—'} MB</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Database Migrations:</span>
                <strong style={{ color: diagnostics?.diagnostics?.migrations?.upToDate ? '#16a34a' : '#d97706' }}>
                  {diagnostics?.diagnostics?.migrations?.appliedCount ?? 0} applied
                  {diagnostics?.diagnostics?.migrations?.failedCount ? ` (${diagnostics.diagnostics.migrations.failedCount} failed)` : ''}
                </strong>
              </div>
            </div>
          </div>

          {/* Client Telemetry */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color="#0891b2" />
              Browser & Client Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Browser Network State:</span>
                <strong style={{ color: clientDiag?.online ? '#16a34a' : '#dc2626' }}>
                  {clientDiag?.online ? 'Online' : 'Offline'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Local Storage:</span>
                <strong style={{ color: clientDiag?.localStorageAvailable ? '#16a34a' : '#dc2626' }}>
                  {clientDiag?.localStorageAvailable ? 'Operational' : 'Unavailable'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Screen Resolution:</span>
                <strong>{clientDiag?.screen || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Browser Language:</span>
                <strong>{clientDiag?.language || '—'}</strong>
              </div>
              {clientDiag?.memoryUsageMb && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>JS Heap in Tab:</span>
                  <strong>{clientDiag.memoryUsageMb} MB</strong>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#64748b' }}>User Agent:</span>
                <code style={{ fontSize: 11, background: '#f8fafc', padding: 8, borderRadius: 6, wordBreak: 'break-all', color: '#475569' }}>
                  {clientDiag?.userAgent || '—'}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT DETAIL MODAL */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: selectedLog.level === 'error' ? '#fee2e2' : '#fef3c7',
                      color: selectedLog.level === 'error' ? '#991b1b' : '#92400e',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedLog.level}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    {selectedLog.source.toUpperCase()}
                  </span>
                  {'statusCode' in selectedLog && selectedLog.statusCode && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>
                      HTTP {selectedLog.statusCode}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {selectedLog.errorName || 'Error Exception'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Message Banner */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Error Message</div>
                <div style={{ fontSize: 14, color: '#7f1d1d', fontWeight: 600, wordBreak: 'break-word' }}>
                  {selectedLog.message}
                </div>
              </div>

              {/* Attributes Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Time:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {'createdAt' in selectedLog ? selectedLog.createdAt : selectedLog.timestamp}
                  </div>
                </div>

                {selectedLog.path && (
                  <div>
                    <span style={{ color: '#64748b' }}>Path / URL:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                      {selectedLog.method ? `${selectedLog.method} ` : ''}
                      {selectedLog.path}
                    </div>
                  </div>
                )}

                {'userEmail' in selectedLog && selectedLog.userEmail && (
                  <div>
                    <span style={{ color: '#64748b' }}>User:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedLog.userEmail} ({selectedLog.userRole || 'user'})
                    </div>
                  </div>
                )}

                {'ipAddress' in selectedLog && selectedLog.ipAddress && (
                  <div>
                    <span style={{ color: '#64748b' }}>IP Address:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedLog.ipAddress}</div>
                  </div>
                )}
              </div>

              {/* Stack Trace */}
              {selectedLog.stack && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Stack Trace</span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.stack || '')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '3px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      <Copy size={12} />
                      {isCopied ? 'Copied' : 'Copy Stack'}
                    </button>
                  </div>
                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#f8fafc',
                      padding: 14,
                      borderRadius: 8,
                      fontSize: 11,
                      overflowX: 'auto',
                      maxHeight: 240,
                      fontFamily: 'monospace',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Context Metadata
                  </span>
                  <pre
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 11,
                      overflowX: 'auto',
                      maxHeight: 160,
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {'id' in selectedLog && 'resolved' in selectedLog && (
                <button
                  onClick={() => handleResolve(selectedLog.id, selectedLog.resolved)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: selectedLog.resolved ? '#cbd5e1' : '#bbf7d0',
                    background: selectedLog.resolved ? '#f8fafc' : '#f0fdf4',
                    color: selectedLog.resolved ? '#64748b' : '#166534',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {selectedLog.resolved ? 'Mark Unresolved' : 'Mark as Resolved'}
                </button>
              )}

              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { API_BASE } from '@/api/base'
import { useAuthStore } from '@/store/auth.store'

export interface ClientLogEntry {
  id: string
  timestamp: string
  source: 'frontend' | 'network' | 'unhandled'
  level: 'error' | 'warn' | 'info'
  errorName?: string
  message: string
  stack?: string
  path?: string
  method?: string
  statusCode?: number
  metadata?: Record<string, any>
}

export interface ClientDiagnostics {
  userAgent: string
  online: boolean
  screen: string
  language: string
  pathname: string
  href: string
  localStorageAvailable: boolean
  memoryUsageMb?: number
  timestamp: string
}

const STORAGE_KEY = 'kipl_client_troubleshoot_logs'
const MAX_LOCAL_LOGS = 50

let isInitialized = false
let lastLoggedMessage = ''
let lastLoggedAt = 0
const memoryRingBuffer: ClientLogEntry[] = []

/**
 * Retrieves client troubleshooting logs stored in the browser's ring buffer.
 */
export function getLocalClientLogs(): ClientLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [...memoryRingBuffer]
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...memoryRingBuffer]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...memoryRingBuffer]
  } catch {
    return [...memoryRingBuffer]
  }
}

/**
 * Clears the local browser ring buffer logs.
 */
export function clearLocalClientLogs(): void {
  memoryRingBuffer.length = 0
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}

/**
 * Saves a new log entry into the local browser ring buffer (last 50 items).
 */
function saveToLocalStorage(entry: ClientLogEntry): void {
  memoryRingBuffer.unshift(entry)
  if (memoryRingBuffer.length > MAX_LOCAL_LOGS) {
    memoryRingBuffer.length = MAX_LOCAL_LOGS
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = getLocalClientLogs()
      if (!existing.some(e => e.id === entry.id)) {
        existing.unshift(entry)
      }
      const trimmed = existing.slice(0, MAX_LOCAL_LOGS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    }
  } catch {}
}

/**
 * Gathers system diagnostics from the browser environment.
 */
export function getClientDiagnostics(): ClientDiagnostics {
  let localStorageOk = false
  try {
    const testKey = '__kipl_test_storage__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    localStorageOk = true
  } catch {
    localStorageOk = false
  }

  const memory = (performance as any)?.memory?.usedJSHeapSize
  const memoryMb = memory ? Math.round(memory / (1024 * 1024)) : undefined

  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    screen:
      typeof window !== 'undefined'
        ? `${window.screen?.width || 0}x${window.screen?.height || 0} (DPR: ${window.devicePixelRatio || 1})`
        : 'Unknown',
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    href: typeof window !== 'undefined' ? window.location.href : '',
    localStorageAvailable: localStorageOk,
    memoryUsageMb: memoryMb,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Reports a client error to both local storage and the server error telemetry endpoint.
 */
export async function reportClientError(
  details: Omit<ClientLogEntry, 'id' | 'timestamp'> & { timestamp?: string },
): Promise<void> {
  const now = Date.now()
  const cleanMessage = String(details.message || 'Unknown error').trim()

  // Rate-limit identical messages within 3 seconds to prevent runaway cascades
  if (cleanMessage === lastLoggedMessage && now - lastLoggedAt < 3000) {
    return
  }

  lastLoggedMessage = cleanMessage
  lastLoggedAt = now

  const entry: ClientLogEntry = {
    id: `cl_${now}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: details.timestamp || new Date().toISOString(),
    source: details.source || 'frontend',
    level: details.level || 'error',
    errorName: details.errorName || 'ClientError',
    message: cleanMessage,
    stack: details.stack ? String(details.stack).slice(0, 5000) : undefined,
    path: details.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    method: details.method,
    statusCode: details.statusCode,
    metadata: {
      ...details.metadata,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
  }

  // Always save locally in ring buffer
  saveToLocalStorage(entry)

  // Asynchronously dispatch to server
  try {
    const user = useAuthStore.getState?.()?.user
    const payload = {
      source: entry.source,
      level: entry.level,
      errorName: entry.errorName,
      message: entry.message,
      stack: entry.stack,
      path: entry.path,
      method: entry.method,
      statusCode: entry.statusCode,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      metadata: entry.metadata,
    }

    const endpoint = `${API_BASE}/api/v1/system-logs/client`
    if (typeof fetch !== 'undefined') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently tolerate beacon delivery errors so we never cascade
      })
    }
  } catch {}
}

/**
 * Attaches global unhandled error and promise rejection listeners.
 */
export function initClientLogging(): void {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  // Standard runtime exceptions
  window.addEventListener('error', (event: ErrorEvent) => {
    // Ignore benign cross-origin script error noise
    if (event.message === 'Script error.' && !event.filename) return

    reportClientError({
      source: 'unhandled',
      level: 'error',
      errorName: event.error?.name || 'UncaughtException',
      message: event.message || event.error?.message || 'Uncaught runtime error',
      stack: event.error?.stack,
      path: window.location.pathname,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason
    // Skip chunk load errors as they are handled by automatic reload
    const isChunk =
      reason?.message?.includes('dynamically imported module') ||
      reason?.message?.includes('Loading chunk') ||
      reason?.message?.includes('Failed to fetch dynamically imported module')

    if (isChunk) return

    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
        ? reason
        : JSON.stringify(reason || 'Unhandled Promise Rejection')

    reportClientError({
      source: 'unhandled',
      level: 'error',
      errorName: reason instanceof Error ? reason.name : 'UnhandledRejection',
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
      path: window.location.pathname,
    })
  })
}

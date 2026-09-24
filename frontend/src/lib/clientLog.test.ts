import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getLocalClientLogs,
  clearLocalClientLogs,
  reportClientError,
  getClientDiagnostics,
} from './clientLog'

describe('clientLog', () => {
  beforeEach(() => {
    clearLocalClientLogs()
    vi.restoreAllMocks()
  })

  it('starts with an empty ring buffer in a clean session', () => {
    expect(getLocalClientLogs()).toEqual([])
  })

  it('records client errors into the local ring buffer', async () => {
    await reportClientError({
      source: 'frontend',
      level: 'error',
      errorName: 'TypeError',
      message: 'Cannot read properties of undefined',
      path: '/tasks',
    })

    const logs = getLocalClientLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].message).toBe('Cannot read properties of undefined')
    expect(logs[0].errorName).toBe('TypeError')
    expect(logs[0].source).toBe('frontend')
  })

  it('rate-limits duplicate error logs within 3 seconds', async () => {
    await reportClientError({
      message: 'Repeated network failure',
      source: 'network',
    })
    await reportClientError({
      message: 'Repeated network failure',
      source: 'network',
    })

    const logs = getLocalClientLogs()
    expect(logs).toHaveLength(1)
  })

  it('clears local logs on demand', async () => {
    await reportClientError({
      message: 'Temporary glitch',
      source: 'frontend',
    })
    expect(getLocalClientLogs()).toHaveLength(1)

    clearLocalClientLogs()
    expect(getLocalClientLogs()).toHaveLength(0)
  })

  it('returns valid client diagnostics telemetry', () => {
    const diag = getClientDiagnostics()
    expect(diag).toHaveProperty('online')
    expect(diag).toHaveProperty('userAgent')
    expect(diag).toHaveProperty('localStorageAvailable')
    expect(diag).toHaveProperty('timestamp')
  })
})

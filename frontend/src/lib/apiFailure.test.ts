import { describe, it, expect } from 'vitest'
import {
  statusOf, shouldRetryQuery, faultOf, describeStatus, summariseFaults, MAX_QUERY_RETRIES,
} from './apiFailure'

const withStatus = (status: number) => ({ response: { status } })

describe('statusOf', () => {
  it('reads the status off an axios error', () => {
    expect(statusOf(withStatus(429))).toBe(429)
  })

  it('is null when no response arrived', () => {
    expect(statusOf({ code: 'ECONNABORTED', message: 'timeout' })).toBeNull()
    expect(statusOf(new Error('boom'))).toBeNull()
    expect(statusOf(null)).toBeNull()
    expect(statusOf(undefined)).toBeNull()
  })

  it('ignores a non-numeric status rather than passing it through', () => {
    expect(statusOf({ response: { status: '429' } })).toBeNull()
  })
})

describe('shouldRetryQuery', () => {
  it('never repeats a rate limit — the retry is what made it worse', () => {
    expect(shouldRetryQuery(0, withStatus(429))).toBe(false)
  })

  it('never repeats a refusal, because the answer does not change', () => {
    expect(shouldRetryQuery(0, withStatus(401))).toBe(false)
    expect(shouldRetryQuery(0, withStatus(403))).toBe(false)
    expect(shouldRetryQuery(0, withStatus(404))).toBe(false)
  })

  it('repeats a server error once', () => {
    expect(shouldRetryQuery(0, withStatus(500))).toBe(true)
    expect(shouldRetryQuery(0, withStatus(503))).toBe(true)
  })

  it('repeats a request timeout, which is the 4xx that can succeed next time', () => {
    expect(shouldRetryQuery(0, withStatus(408))).toBe(true)
  })

  it('repeats a failure that never got a response', () => {
    expect(shouldRetryQuery(0, { code: 'ECONNABORTED' })).toBe(true)
  })

  it('stops at the budget even for a retryable failure', () => {
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, withStatus(500))).toBe(false)
    expect(shouldRetryQuery(MAX_QUERY_RETRIES + 1, withStatus(500))).toBe(false)
  })
})

describe('faultOf', () => {
  it('is nothing when the query did not fail', () => {
    expect(faultOf('Project', null)).toBeNull()
    expect(faultOf('Project', undefined)).toBeNull()
  })

  it('carries the label, the status and a readable cause', () => {
    expect(faultOf('Schedule', withStatus(429))).toEqual({
      label: 'Schedule',
      status: 429,
      detail: 'rate limited (429) — too many requests in the last minute',
    })
  })

  it('reports a missing response rather than inventing a status', () => {
    const fault = faultOf('Schedule', { code: 'ECONNABORTED' })
    expect(fault?.status).toBeNull()
    expect(fault?.detail).toContain('no response')
  })
})

describe('describeStatus', () => {
  it('names each cause distinguishably', () => {
    const causes = [null, 429, 401, 403, 404, 500, 418].map(describeStatus)
    expect(new Set(causes).size).toBe(causes.length)
  })

  it('states the status number for a server error', () => {
    expect(describeStatus(502)).toBe('server error (502)')
  })

  it('falls back to the bare status for anything unclassified', () => {
    expect(describeStatus(418)).toBe('HTTP 418')
  })
})

describe('summariseFaults', () => {
  it('is empty when nothing failed', () => {
    expect(summariseFaults([])).toBe('')
  })

  it('states one shared cause once, not once per panel', () => {
    const rate = describeStatus(429)
    const line = summariseFaults([
      { label: 'Project', status: 429, detail: rate },
      { label: 'Schedule', status: 429, detail: rate },
      { label: 'Liaison', status: 429, detail: rate },
    ])
    expect(line).toBe(`Project, Schedule, Liaison could not be loaded: ${rate}.`)
    expect(line.match(/rate limited/g)).toHaveLength(1)
  })

  it('keeps both causes when they differ', () => {
    const line = summariseFaults([
      { label: 'Project', status: 404, detail: describeStatus(404) },
      { label: 'Schedule', status: 500, detail: describeStatus(500) },
    ])
    expect(line).toContain('not found (404)')
    expect(line).toContain('server error (500)')
  })

  it('lists every panel that failed', () => {
    const line = summariseFaults([
      { label: 'Project', status: 500, detail: describeStatus(500) },
      { label: 'Schedule', status: 500, detail: describeStatus(500) },
    ])
    expect(line).toContain('Project')
    expect(line).toContain('Schedule')
  })
})

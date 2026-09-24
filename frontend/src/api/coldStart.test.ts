import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import {
  MAX_COLD_START_RETRIES,
  MAX_HIBERNATE_429_RETRIES,
  attachColdStartRetry,
  isRenderHibernate,
  looksLikeColdStart,
  safeToRepeat,
} from './coldStart'

/**
 * The API sleeps when idle and takes ~50s to wake, and neither Render nor the
 * Vercel rewrite in front of it reports that as anything but a timeout, a
 * gateway error, or a 429 hibernate rate limit. Every one of these cases came
 * from a real field failure or from a way this retry could make one worse.
 */

let hits: Record<string, number>
let server: Server
let base: string

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0]
    const attempt = (hits[path] = (hits[path] ?? 0) + 1)

    const ok = () => res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
    const fail = (status: number, body: string, headers?: Record<string, string>) =>
      res.writeHead(status, headers || {}).end(body)

    switch (path) {
      // Wakes on the third attempt, like an instance coming up.
      case '/api/v1/diary':
        return void (attempt <= 2 ? fail(503, 'waking') : ok())

      // Health is the repeatable preflight used before login.
      case '/api/v1/health':
        return void (attempt <= 2 ? fail(504, 'gateway timeout') : ok())

      // Render router returns fast 429 hibernate-rate-limited for 4 attempts, then wakes
      case '/api/v1/waking-hibernate':
        if (attempt <= 4) {
          return void fail(429, 'Too Many Requests', { 'x-render-routing': 'hibernate-rate-limited' })
        }
        return void ok()

      case '/api/v1/auth/login':
        return void ok()

      // Login is a write: it must never be replayed after a timeout.
      case '/api/v1/auth/login-timeout':
        return void fail(504, 'gateway timeout')

      case '/api/v1/down':
        return void fail(503, 'waking')

      case '/api/v1/missing':
        return void fail(404, 'nope')

      case '/api/v1/broken':
        return void fail(500, 'boom')

      // The first response arrives only after the client's warm timeout.
      case '/api/v1/lag':
        if (attempt === 1) return void setTimeout(ok, 400)
        return void ok()

      default:
        return void fail(418, '')
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('server did not bind a port')
  base = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  hits = {}
})

/** A short warm timeout keeps the timeout case fast; the retry gets 90s. */
const client = (): AxiosInstance =>
  attachColdStartRetry(axios.create({ baseURL: base, timeout: 150 }))

describe('cold-start retry', () => {
  it('recovers a read from an instance that was still waking', async () => {
    const res = await client().get('/api/v1/diary')

    expect(res.status).toBe(200)
    expect(hits['/api/v1/diary']).toBe(3)
  })

  it('recovers from Render 429 hibernate-rate-limited over multiple attempts', async () => {
    const res = await client().get('/api/v1/waking-hibernate', {
      _coldStartDelayMs: 5,
    } as any)

    expect(res.status).toBe(200)
    expect(hits['/api/v1/waking-hibernate']).toBe(5)
  })

  it('never replays login, because it creates a session row', async () => {
    await expect(
      client().post('/api/v1/auth/login-timeout', { email: 'a@kipl.in' }),
    ).rejects.toThrow()

    expect(hits['/api/v1/auth/login-timeout']).toBe(1)
  })

  it('wakes with GET retries, then submits login exactly once', async () => {
    const c = client()
    await c.get('/api/v1/health')
    const res = await c.post('/api/v1/auth/login', { email: 'a@kipl.in' })

    expect(res.status).toBe(200)
    expect(hits['/api/v1/health']).toBe(3)
    expect(hits['/api/v1/auth/login']).toBe(1)
  })

  it('never replays a write, which may already have been committed', async () => {
    await expect(client().post('/api/v1/down', { workDone: 'shuttering' })).rejects.toThrow()

    expect(hits['/api/v1/down']).toBe(1)
  })

  it('retries a timed-out read, since the response was only slow', async () => {
    const res = await client().get('/api/v1/lag')

    expect(res.status).toBe(200)
    expect(hits['/api/v1/lag']).toBe(2)
  })

  it('gives up after a bounded number of attempts for gateway statuses', async () => {
    await expect(client().get('/api/v1/down')).rejects.toThrow()

    expect(hits['/api/v1/down']).toBe(1 + MAX_COLD_START_RETRIES)
  })

  it('does not retry a 404 — the server answered', async () => {
    await expect(client().get('/api/v1/missing')).rejects.toThrow()

    expect(hits['/api/v1/missing']).toBe(1)
  })

  it('does not retry a 500 — the app is up and failing', async () => {
    await expect(client().get('/api/v1/broken')).rejects.toThrow()

    expect(hits['/api/v1/broken']).toBe(1)
  })
})

describe('safeToRepeat', () => {
  it('allows any read', () => {
    expect(safeToRepeat({ method: 'get', url: '/api/v1/diary' })).toBe(true)
    expect(safeToRepeat({ method: 'GET', url: '/api/v1/hr/attendance' })).toBe(true)
    expect(safeToRepeat({ method: undefined, url: '/api/v1/tasks' })).toBe(true)
  })

  it('allows idempotent session refresh over cold start, but disallows other writes', () => {
    expect(safeToRepeat({ method: 'post', url: '/api/v1/auth/refresh' })).toBe(true)
    expect(safeToRepeat({ method: 'POST', url: '/api/v1/auth/refresh' })).toBe(true)
    expect(safeToRepeat({ method: 'post', url: '/api/v1/auth/login' })).toBe(false)
    expect(safeToRepeat({ method: 'post', url: '/api/v1/diary' })).toBe(false)
    expect(safeToRepeat({ method: 'patch', url: '/api/v1/site-orders/abc' })).toBe(false)
    expect(safeToRepeat({ method: 'delete', url: '/api/v1/tasks/abc' })).toBe(false)
  })
})

describe('isRenderHibernate', () => {
  it('identifies routing hibernate-rate-limited header', () => {
    expect(isRenderHibernate({
      response: {
        status: 429,
        headers: { 'x-render-routing': 'hibernate-rate-limited' },
      } as never,
    })).toBe(true)
  })

  it('identifies Vercel proxied Render rate limit response', () => {
    expect(isRenderHibernate({
      response: {
        status: 429,
        headers: { 'rndr-id': 'test-123' },
        data: 'Too Many Requests',
      } as never,
    })).toBe(true)
  })

  it('rejects ordinary rate limits without Render hibernate markers', () => {
    expect(isRenderHibernate({
      response: {
        status: 429,
        data: { message: 'Too many requests' },
      } as never,
    })).toBe(false)
  })
})

describe('looksLikeColdStart', () => {
  it('accepts the statuses a waking instance produces', () => {
    for (const status of [502, 503, 504]) {
      expect(looksLikeColdStart({ response: { status } as never })).toBe(true)
    }
  })

  it('rejects statuses that mean the app answered', () => {
    for (const status of [200, 400, 401, 404, 405, 409, 500]) {
      expect(looksLikeColdStart({ response: { status } as never })).toBe(false)
    }
  })

  it('accepts Render free-tier hibernate rate limit 429', () => {
    expect(
      looksLikeColdStart({
        response: {
          status: 429,
          headers: { 'x-render-routing': 'hibernate-rate-limited' },
        } as never,
      }),
    ).toBe(true)
  })

  it('accepts a timeout', () => {
    expect(looksLikeColdStart({ code: 'ECONNABORTED' })).toBe(true)
    expect(looksLikeColdStart({ code: 'ETIMEDOUT' })).toBe(true)
  })

  it('rejects a connection error, which is usually a dead network', () => {
    expect(looksLikeColdStart({ code: 'ERR_NETWORK' })).toBe(false)
    expect(looksLikeColdStart({ code: 'ERR_CANCELED' })).toBe(false)
  })
})

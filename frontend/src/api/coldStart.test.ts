import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import {
  MAX_COLD_START_RETRIES,
  attachColdStartRetry,
  looksLikeColdStart,
  safeToRepeat,
} from './coldStart'

/**
 * The API sleeps when idle and takes ~50s to wake, and neither Render nor the
 * Vercel rewrite in front of it reports that as anything but a timeout or a
 * gateway error. Every one of these cases came from a real field failure or
 * from a way this retry could make one worse — replaying a write being the
 * one that would actually corrupt data.
 *
 * They run against a loopback server rather than a mocked adapter, so what is
 * asserted is the number of requests that reached a server, which is the thing
 * that matters.
 */

/** How many times each path was actually hit. Reset before every test. */
let hits: Record<string, number>
let server: Server
let base: string

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0]
    const attempt = (hits[path] = (hits[path] ?? 0) + 1)

    const ok = () => res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
    const fail = (status: number, body: string) => res.writeHead(status).end(body)

    switch (path) {
      // Wakes on the third attempt, like an instance coming up.
      case '/api/v1/diary':
        return void (attempt <= 2 ? fail(503, 'waking') : ok())

      // Same, but behind a proxy that gives up before the instance is ready.
      case '/api/v1/auth/login':
        return void (attempt <= 2 ? fail(504, 'gateway timeout') : ok())

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

  it('retries login, because a repeat costs at most a spare token', async () => {
    // 504 is what the Vercel rewrite returns when it stops waiting for Render.
    const res = await client().post('/api/v1/auth/login', { email: 'a@kipl.in' })

    expect(res.status).toBe(200)
    expect(hits['/api/v1/auth/login']).toBe(3)
  })

  it('never replays a write, which may already have been committed', async () => {
    // The whole reason the retry is restricted: a timeout means the request
    // WAS delivered. Replaying it duplicates the diary entry.
    await expect(client().post('/api/v1/down', { workDone: 'shuttering' })).rejects.toThrow()

    expect(hits['/api/v1/down']).toBe(1)
  })

  it('retries a timed-out read, since the response was only slow', async () => {
    const res = await client().get('/api/v1/lag')

    expect(res.status).toBe(200)
    expect(hits['/api/v1/lag']).toBe(2)
  })

  it('gives up after a bounded number of attempts', async () => {
    await expect(client().get('/api/v1/down')).rejects.toThrow()

    expect(hits['/api/v1/down']).toBe(1 + MAX_COLD_START_RETRIES)
  })

  it('does not retry a 404 — the server answered', async () => {
    await expect(client().get('/api/v1/missing')).rejects.toThrow()

    expect(hits['/api/v1/missing']).toBe(1)
  })

  it('does not retry a 500 — the app is up and failing', async () => {
    // Retrying would hide a real fault behind a longer wait.
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

  it('allows login and nothing else that writes', () => {
    expect(safeToRepeat({ method: 'post', url: '/api/v1/auth/login' })).toBe(true)
    expect(safeToRepeat({ method: 'post', url: '/api/v1/diary' })).toBe(false)
    expect(safeToRepeat({ method: 'patch', url: '/api/v1/site-orders/abc' })).toBe(false)
    expect(safeToRepeat({ method: 'delete', url: '/api/v1/tasks/abc' })).toBe(false)
    expect(safeToRepeat({ method: 'post', url: '/api/v1/auth/refresh' })).toBe(false)
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

  it('accepts a timeout', () => {
    expect(looksLikeColdStart({ code: 'ECONNABORTED' })).toBe(true)
    expect(looksLikeColdStart({ code: 'ETIMEDOUT' })).toBe(true)
  })

  it('rejects a connection error, which is usually a dead network', () => {
    // Retrying these only triples the wait before the real error is shown.
    expect(looksLikeColdStart({ code: 'ERR_NETWORK' })).toBe(false)
    expect(looksLikeColdStart({ code: 'ERR_CANCELED' })).toBe(false)
  })
})

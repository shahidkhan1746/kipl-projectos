import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

/**
 * Retry around a Render free-tier cold start.
 *
 * The API sleeps when idle and takes roughly 50 seconds to wake. Requests do
 * not fail fast while that happens — Render's router accepts the connection
 * and holds it, and the Vercel rewrite in front of it applies its own, shorter
 * deadline. So a cold start reaches the browser either as a timeout, a
 * 502/503/504, or as a fast 429 hibernate-rate-limited response.
 *
 * Without this the first request after an idle period always failed: the
 * default 30s timeout expires ~20 seconds before the instance is up. A reload
 * then worked, which is exactly the kind of intermittent fault nobody reports
 * properly.
 *
 * Deliberately mirrors ColdStartInterceptor in
 * mobile/lib/core/api/api_client.dart — same statuses, same retry budget, same
 * rule about what may be repeated. Change one, change the other.
 */

/** Normal requests keep a short timeout so a genuinely dead server fails fast. */
export const WARM_TIMEOUT_MS = 30_000

/** Applied to a retry, with headroom over a ~50s wake. */
export const COLD_START_TIMEOUT_MS = 90_000

/**
 * Two, not one. Going direct the retry gets the full 90s and clears a wake on
 * its own; through the Vercel rewrite the retry inherits the proxy's shorter
 * deadline instead and can expire again while the instance is still coming up.
 */
export const MAX_COLD_START_RETRIES = 2

/**
 * For Render hibernate-rate-limited 429s, the response returns in ~100ms.
 * With a 2.5s delay between attempts, 35 retries spans ~90s, giving Render
 * sufficient time to fully boot the sleeping instance.
 */
export const MAX_HIBERNATE_429_RETRIES = 35

/** What a sleeping instance looks like once something in front of it gives up. */
const GATEWAY_STATUSES = new Set([502, 503, 504])

type RetryableConfig = InternalAxiosRequestConfig & {
  _coldStartRetries?: number
  _coldStartDelayMs?: number
}

/**
 * A timeout means the request WAS delivered, so replaying a write could commit
 * it twice — a duplicate site-diary entry, attendance record, or login session.
 * Login is not exempt: it updates audit state and inserts a refresh-token row.
 * The login page wakes the service with a repeatable health GET before sending
 * credentials exactly once.
 */
export function safeToRepeat(config: Pick<RetryableConfig, 'method' | 'url'>, isHibernate = false): boolean {
  if (isHibernate) return true
  const method = (config.method ?? 'get').toUpperCase()
  if (method === 'GET') return true
  // Refresh rotates credentials. A timed-out response may already have committed;
  // replaying its old token can trigger reuse protection after the grace window.
  return false
}

/**
 * Detects whether an error is specifically Render's router returning a 429
 * while spinning up a hibernating free-tier container.
 */
export function isRenderHibernate(error: Pick<AxiosError, 'code' | 'response'>): boolean {
  if (error.response?.status !== 429) return false
  const headers = error.response?.headers as Record<string, any> | undefined
  const routing = headers?.['x-render-routing'] ?? (typeof headers?.get === 'function' ? headers.get('x-render-routing') : undefined)
  if (typeof routing === 'string' && routing.toLowerCase().includes('hibernate')) {
    return true
  }
  const data = error.response?.data
  // Render's edge router returns raw text "Too Many Requests" (or empty string) when hibernating.
  // In contrast, NestJS Throttler in our backend returns a structured JSON object: { statusCode: 429, message: ... }.
  // In web browsers, CORS prevents JS from reading custom response headers like rndr-id and x-render-routing,
  // so any 429 carrying a raw text string payload (or with Render markers) correctly identifies Render's edge waking up.
  if (typeof data === 'string' && (data.includes('Too Many Requests') || data.trim() === '')) {
    return true
  }
  return false
}

/**
 * Timeouts, gateway statuses, and Render free-tier router wake-up limits.
 *
 * When an idle service on Render is hibernating, incoming requests begin spinning
 * it up. Render's edge router returns HTTP 429 with 'x-render-routing: hibernate-rate-limited'
 * (or plain text "Too Many Requests") if requests arrive while the instance is starting.
 * Treating this as a normal rate limit fails immediately; treating it as a cold-start
 * allows the client to wait a moment and retry until the service comes online.
 */
export function looksLikeColdStart(error: Pick<AxiosError, 'code' | 'response'>): boolean {
  const status = error.response?.status
  if (status !== undefined) {
    if (GATEWAY_STATUSES.has(status)) return true
    if (isRenderHibernate(error)) return true
    return false
  }
  return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ERR_NETWORK'
}

/** Registers the retry on an axios instance. Attach before any auth handling. */
export function attachColdStartRetry(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableConfig | undefined
      if (!config) return Promise.reject(error)

      const isHibernate = isRenderHibernate(error)
      const maxRetries = isHibernate ? MAX_HIBERNATE_429_RETRIES : MAX_COLD_START_RETRIES
      const attempts = config._coldStartRetries ?? 0

      if (
        attempts >= maxRetries ||
        !looksLikeColdStart(error) ||
        !safeToRepeat(config, isHibernate)
      ) {
        return Promise.reject(error)
      }

      // Counted on the config, which travels with the replay, so a second
      // failure lands back here already knowing how many attempts it has had.
      config._coldStartRetries = attempts + 1
      config.timeout = COLD_START_TIMEOUT_MS

      // When Render router is hibernate-rate-limiting, waiting 2.5s gives the
      // waking container time to boot rather than immediately exhausting retries.
      if (isHibernate) {
        const delay = config._coldStartDelayMs ?? 2500
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      return instance.request(config)
    },
  )
  return instance
}

/**
 * How long a sign-in or a saved session waits for a sleeping server.
 *
 * Render's free tier has been measured taking 4¾ and 8 minutes to wake
 * (1 Oct, 30 Sep), against the ~1 minute it documents. A 2½-minute budget gave
 * up on most of those mornings while the server was still on its way, and the
 * page then asked people to start again. The user can cancel at any point.
 */
export const WAKE_BUDGET_MS = 10 * 60_000

/**
 * Waits until the API answers its health check, for up to `budgetMs`.
 *
 * The retry above counts attempts, and through the Vercel rewrite each attempt
 * can be cut short well before its own timeout, so a slow free-tier wake (well
 * over a minute is not unusual) used all of them while the instance was still
 * booting — and the login page gave up with "still waking up". This waits on
 * the clock instead: it keeps asking, pausing between tries, until the API
 * answers or the budget is spent. Plain fetch, so the axios retry does not
 * stack its own waits on top.
 */
export async function waitForApi(
  base: string,
  opts: {
    budgetMs?: number
    attemptMs?: number
    pauseMs?: number
    signal?: AbortSignal
    onWaiting?: (elapsedMs: number) => void
    fetchImpl?: typeof fetch
    now?: () => number
    sleep?: (ms: number) => Promise<void>
  } = {},
): Promise<boolean> {
  const {
    budgetMs = WAKE_BUDGET_MS,
    attemptMs = 15_000,
    pauseMs = 2_500,
    signal,
    onWaiting,
    fetchImpl = fetch,
    now = Date.now,
    sleep = (ms: number) => new Promise(r => setTimeout(r, ms)),
  } = opts
  const started = now()
  const deadline = Number.isFinite(budgetMs) ? started + budgetMs : Infinity
  while (now() < deadline) {
    if (signal?.aborted) return false

    const ctrl = new AbortController()
    const remainingBudget = deadline - now()
    const timeoutMs = Math.max(1, Math.min(attemptMs, remainingBudget))
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)

    const onAbort = () => ctrl.abort()
    signal?.addEventListener('abort', onAbort)

    try {
      const res = await fetchImpl(`${base}/api/v1/health`, { signal: ctrl.signal, cache: 'no-store' })
      if (res.ok) {
        // Proxies can return HTML with HTTP 200 while the application is down.
        // Only our own health payload proves that the API is accepting traffic.
        const health = await res.json()
        if (health?.service === 'kipl-projectos-api' && health?.status === 'ok') return true
      }
    } catch {
      // Not up yet: a timeout, a refused connection or a gateway page.
      if (signal?.aborted) return false
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (signal?.aborted) return false
    onWaiting?.(now() - started)
    if (now() + pauseMs >= deadline) break
    await sleep(pauseMs)
  }
  return false
}

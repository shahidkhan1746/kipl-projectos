import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

/**
 * Retry around a Render free-tier cold start.
 *
 * The API sleeps when idle and takes roughly 50 seconds to wake. Requests do
 * not fail fast while that happens — Render's router accepts the connection
 * and holds it, and the Vercel rewrite in front of it applies its own, shorter
 * deadline. So a cold start reaches the browser either as a timeout or as a
 * 502/503/504, never as a clean "server is starting" signal.
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

/** What a sleeping instance looks like once something in front of it gives up. */
const GATEWAY_STATUSES = new Set([502, 503, 504])

type RetryableConfig = InternalAxiosRequestConfig & { _coldStartRetries?: number }

/**
 * A timeout means the request WAS delivered, so replaying a write could commit
 * it twice — a duplicate site-diary entry, attendance record, or login session.
 * Login is not exempt: it updates audit state and inserts a refresh-token row.
 * The login page wakes the service with a repeatable health GET before sending
 * credentials exactly once.
 */
export function safeToRepeat(config: Pick<RetryableConfig, 'method' | 'url'>): boolean {
  return (config.method ?? 'get').toUpperCase() === 'GET'
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
    if (status === 429) {
      const headers = error.response?.headers as Record<string, any> | undefined
      const routing = headers?.['x-render-routing'] ?? (typeof headers?.get === 'function' ? headers.get('x-render-routing') : undefined)
      if (typeof routing === 'string' && routing.toLowerCase().includes('hibernate')) {
        return true
      }
      const data = error.response?.data
      if (
        typeof data === 'string' &&
        data.includes('Too Many Requests') &&
        (headers?.['rndr-id'] || headers?.server === 'Vercel')
      ) {
        return true
      }
    }
    return false
  }
  return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
}

/** Registers the retry on an axios instance. Attach before any auth handling. */
export function attachColdStartRetry(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableConfig | undefined
      if (!config) return Promise.reject(error)

      const attempts = config._coldStartRetries ?? 0
      if (
        attempts >= MAX_COLD_START_RETRIES ||
        !looksLikeColdStart(error) ||
        !safeToRepeat(config)
      ) {
        return Promise.reject(error)
      }

      // Counted on the config, which travels with the replay, so a second
      // failure lands back here already knowing how many attempts it has had.
      config._coldStartRetries = attempts + 1
      config.timeout = COLD_START_TIMEOUT_MS

      // When Render router is hibernate-rate-limiting, waiting 2.5s gives the
      // waking container time to boot rather than immediately exhausting retries.
      if (error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2500))
      }

      return instance.request(config)
    },
  )
  return instance
}

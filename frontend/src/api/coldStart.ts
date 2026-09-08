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
 * it twice — a duplicate site-diary entry or attendance record. Only reads, and
 * login, are safe to send again; a repeated login costs at most a spare token.
 */
export function safeToRepeat(config: Pick<RetryableConfig, 'method' | 'url'>): boolean {
  if ((config.method ?? 'get').toUpperCase() === 'GET') return true
  return (config.url ?? '').includes('/auth/login')
}

/**
 * Timeouts and gateway statuses only. A connection error is left alone: it is
 * far more often a dead network or a blocked origin than a waking instance, and
 * retrying triples the wait before the real error reaches the user.
 */
export function looksLikeColdStart(error: Pick<AxiosError, 'code' | 'response'>): boolean {
  const status = error.response?.status
  if (status !== undefined) return GATEWAY_STATUSES.has(status)
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
      return instance.request(config)
    },
  )
  return instance
}

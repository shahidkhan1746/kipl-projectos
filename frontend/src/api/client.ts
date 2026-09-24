import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { API_BASE as BASE } from '@/api/base'
import { attachColdStartRetry, WARM_TIMEOUT_MS } from '@/api/coldStart'
import { RefreshCoordinator, isRefreshExempt } from '@/api/refreshQueue'
import { statusOf } from '@/lib/apiFailure'
import { getDeviceIdSync, getFriendlyDeviceName } from '@/lib/deviceIdentity'
import { reportClientError } from '@/lib/clientLog'

const api = axios.create({ baseURL: BASE, timeout: WARM_TIMEOUT_MS, withCredentials: true })

// Registered before the 401 handler so a waking instance is retried at the
// wire, rather than surfacing as a failure the token logic has to reason about.
attachColdStartRetry(api)

api.interceptors.request.use(c => {
  const t = useAuthStore.getState().accessToken
  if (t) c.headers.Authorization = 'Bearer ' + t
  const devId = getDeviceIdSync()
  if (devId) c.headers['x-device-id'] = devId
  return c
})

const refresh = new RefreshCoordinator()

/**
 * Dedicated refresh client that also retries around Render cold starts.
 * This ensures that when the instance is waking, refresh does not fail
 * with a 30s timeout and accidentally log out active users.
 */
const refreshClient = axios.create({ baseURL: BASE, timeout: WARM_TIMEOUT_MS, withCredentials: true })
attachColdStartRetry(refreshClient)

function endSession() {
  useAuthStore.getState().logout()
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

function logNetworkAnomaly(e: any) {
  try {
    const url = String(e?.config?.url || '')
    if (url.includes('/system-logs')) return
    const status = e?.response?.status
    const isNetworkErr = e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED'
    if ((status && status >= 500) || status === 429 || (!status && isNetworkErr)) {
      reportClientError({
        source: 'network',
        level: status && status >= 500 ? 'error' : 'warn',
        errorName: e?.name || 'NetworkError',
        message: e?.response?.data?.message || e?.message || 'Network request failed',
        path: url,
        method: e?.config?.method?.toUpperCase(),
        statusCode: status,
        metadata: {
          code: e?.code,
          xRenderRouting: e?.response?.headers?.['x-render-routing'],
        },
      })
    }
  } catch {}
}

api.interceptors.response.use(r => r, async e => {
  const orig = e.config
  if (e.response?.status !== 401 || !orig || orig._retry) {
    logNetworkAnomaly(e)
    return Promise.reject(e)
  }
  if (isRefreshExempt(orig.url)) return Promise.reject(e)

  // Marked before anything is awaited, and on every path — including the
  // parked ones, which previously replayed unmarked and could each open
  // another refresh round when the replay came back 401 too.
  orig._retry = true

  // The token may already have been rotated by a round that finished between
  // this request going out and its 401 coming back. Replaying with what the
  // store now holds costs nothing; refreshing again would spend one of the
  // twenty refreshes a minute the server allows, for a token we already have.
  const current = useAuthStore.getState().accessToken
  if (current && orig.headers.Authorization !== 'Bearer ' + current) {
    orig.headers.Authorization = 'Bearer ' + current
    return api(orig)
  }

  if (!refresh.begin()) {
    // Someone else is already refreshing. Take their outcome: their new token,
    // or their failure. Never neither.
    const token = await refresh.wait()
    orig.headers.Authorization = 'Bearer ' + token
    return api(orig)
  }

  try {
    const rt = useAuthStore.getState().refreshToken
    const devId = getDeviceIdSync()
    const { data } = await refreshClient.post(
      '/api/v1/auth/refresh',
      {
        ...(rt ? { refresh_token: rt } : {}),
        deviceId: devId,
        deviceName: getFriendlyDeviceName(),
      },
      {
        withCredentials: true,
        headers: {
          'x-device-id': devId,
        },
      },
    )
    useAuthStore.getState().setAuth(
      useAuthStore.getState().user ?? data.user,
      data.access_token,
      data.refresh_token ?? rt,
    )
    refresh.succeed(data.access_token)
    orig.headers.Authorization = 'Bearer ' + data.access_token
    return api(orig)
  } catch (err) {
    // Everyone parked on this round is rejected with the reason. They used to
    // be dropped silently, which left their requests pending for the life of
    // the page: no data, no error, and a screen of blanks explaining nothing.
    refresh.fail(err)

    // A refusal or invalid token payload ends the session. A rate limit, a cold start
    // or a dropped connection means try again, not start again.
    const status = statusOf(err)
    if (status === 400 || status === 401 || status === 403) endSession()

    // The refresh failure, not the original 401. "Rate limited" or "the server
    // did not answer" is the fact worth surfacing; the 401 is only its symptom.
    return Promise.reject(err)
  }
})

export default api

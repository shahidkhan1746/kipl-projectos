import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { API_BASE as BASE } from '@/api/base'
import { attachColdStartRetry, WARM_TIMEOUT_MS } from '@/api/coldStart'
import { RefreshCoordinator, isRefreshExempt } from '@/api/refreshQueue'
import { statusOf } from '@/lib/apiFailure'

const api = axios.create({ baseURL: BASE, timeout: WARM_TIMEOUT_MS, withCredentials: true })

// Registered before the 401 handler so a waking instance is retried at the
// wire, rather than surfacing as a failure the token logic has to reason about.
attachColdStartRetry(api)

api.interceptors.request.use(c => {
  const t = useAuthStore.getState().accessToken
  if (t) c.headers.Authorization = 'Bearer ' + t
  return c
})

const refresh = new RefreshCoordinator()

/**
 * The refresh call is made with a bare axios, which defaults to no timeout at
 * all. Left that way a stalled connection pinned the refresh "in flight"
 * forever and every later 401 parked behind it permanently. It gets the same
 * deadline as every other request instead: a cold Render instance then fails
 * honestly and the caller can ask again, rather than the app hanging.
 */
const REFRESH_TIMEOUT_MS = WARM_TIMEOUT_MS

function endSession() {
  useAuthStore.getState().logout()
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

api.interceptors.response.use(r => r, async e => {
  const orig = e.config
  if (e.response?.status !== 401 || !orig || orig._retry) return Promise.reject(e)
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
    const { data } = await axios.post(
      BASE + '/api/v1/auth/refresh',
      rt ? { refresh_token: rt } : {},
      { withCredentials: true, timeout: REFRESH_TIMEOUT_MS },
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

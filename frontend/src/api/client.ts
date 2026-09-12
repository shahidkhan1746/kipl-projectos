import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { API_BASE as BASE } from '@/api/base'
import { attachColdStartRetry, WARM_TIMEOUT_MS } from '@/api/coldStart'

const api = axios.create({ baseURL: BASE, timeout: WARM_TIMEOUT_MS, withCredentials: true })

// Registered before the 401 handler so a waking instance is retried at the
// wire, rather than surfacing as a failure the token logic has to reason about.
attachColdStartRetry(api)

api.interceptors.request.use(c => {
  const t = useAuthStore.getState().accessToken
  if (t) c.headers.Authorization = 'Bearer ' + t
  return c
})

let refreshing = false
let q: Array<(t: string) => void> = []

api.interceptors.response.use(r => r, async e => {
  const orig = e.config
  if (e.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise(res => q.push(t => { orig.headers.Authorization = 'Bearer ' + t; res(api(orig)) }))
    orig._retry = true; refreshing = true
    try {
      const rt = useAuthStore.getState().refreshToken
      const { data } = await axios.post(BASE + '/api/v1/auth/refresh', rt ? { refresh_token: rt } : {}, { withCredentials: true })
      useAuthStore.getState().setAuth(
        useAuthStore.getState().user ?? data.user,
        data.access_token,
        data.refresh_token,
      )
      q.forEach(fn => fn(data.access_token)); q = []
      orig.headers.Authorization = 'Bearer ' + data.access_token
      return api(orig)
    } catch (err) {
      // Only a refusal ends the session. A rate limit, a cold start or a
      // dropped connection means try again, not start again — signing out on
      // those threw away a valid session and sent the user to /login with no
      // explanation of why.
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') window.location.href = '/login'
      }
      q = []
      return Promise.reject(e)
    }
    finally { refreshing = false }
  }
  return Promise.reject(e)
})

export default api

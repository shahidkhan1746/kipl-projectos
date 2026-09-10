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
    } catch { useAuthStore.getState().logout(); if (window.location.pathname !== '/login') window.location.href = '/login'; return Promise.reject(e) }
    finally { refreshing = false }
  }
  return Promise.reject(e)
})

export default api

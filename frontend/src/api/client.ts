import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'

const api = axios.create({ baseURL: BASE, timeout: 30_000 })

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
      if (!rt) throw 0
      const { data } = await axios.post(BASE + '/api/v1/auth/refresh', { refresh_token: rt })
      useAuthStore.getState().setToken(data.access_token)
      q.forEach(fn => fn(data.access_token)); q = []
      orig.headers.Authorization = 'Bearer ' + data.access_token
      return api(orig)
    } catch { useAuthStore.getState().logout(); window.location.href = '/login'; return Promise.reject(e) }
    finally { refreshing = false }
  }
  return Promise.reject(e)
})

export default api

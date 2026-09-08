import api from './client'
import axios from 'axios'
import { API_BASE as BASE } from '@/api/base'

// Public reads need no auth token — use a bare axios instance.
const pub = axios.create({ baseURL: BASE, timeout: 20_000 })

export interface UpdatePhoto {
  url: string
  key: string
  caption?: string
}

export interface UpdateVideo {
  url: string
  key?: string
  title?: string
  thumbnail?: string
  provider?: 'upload' | 'youtube' | 'vimeo' | 'external'
}

export const updatesApi = {
  // --- internal (authed) ---
  list:       () => api.get('/api/v1/project-updates'),
  get:        (id: string) => api.get('/api/v1/project-updates/' + id),
  create:     (body: any) => api.post('/api/v1/project-updates', body),
  update:     (id: string, body: any) => api.patch('/api/v1/project-updates/' + id, body),
  remove:     (id: string) => api.delete('/api/v1/project-updates/' + id),
  
  // uploads a single image, returns { url, key }
  uploadPhoto: (file: File, folder: 'updates' | 'team' = 'updates') => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/api/v1/project-updates/upload', fd, { params: { folder } })
  },

  // uploads a video file (MP4, WebM, MOV), returns { url, key }
  uploadVideo: (file: File, folder: 'updates' = 'updates') => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/api/v1/project-updates/upload', fd, { params: { folder } })
  },

  // team (internal)
  teamAll:    () => api.get('/api/v1/project-updates/team/all'),
  teamCreate: (body: any) => api.post('/api/v1/project-updates/team', body),
  teamUpdate: (id: string, body: any) => api.patch('/api/v1/project-updates/team/' + id, body),
  teamRemove: (id: string) => api.delete('/api/v1/project-updates/team/' + id),

  // --- public (no auth) ---
  publicTimeline: () => pub.get('/api/v1/public/updates').then(r => r.data),
  publicGallery:  () => pub.get('/api/v1/public/gallery').then(r => r.data),
  publicTeam:     () => pub.get('/api/v1/public/team').then(r => r.data),
}

import api from './client'

export const settingsApi = {
  getAll:    (category?: string) => api.get('/api/v1/settings', { params: { category } }),
  get:       (key: string) => api.get('/api/v1/settings/key', { params: { key } }),
  set:       (key: string, value: string, label?: string, category?: string) =>
    api.post('/api/v1/settings', { key, value, label, category }),
  setBulk:   (settings: any[]) => api.post('/api/v1/settings/bulk', settings),
  weather:   (city: string, apiKey: string) =>
    fetch('https://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + apiKey + '&units=metric')
      .then(r => r.json()),
}

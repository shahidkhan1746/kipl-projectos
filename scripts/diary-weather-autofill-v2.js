#!/usr/bin/env node
/**
 * KIPL ProjectOS — Hybrid Weather Auto-fill (v2)
 * - Today → OpenWeatherMap live
 * - 27-Sep-2025 to yesterday → Open-Meteo historical (free, no key)
 * - Before 27-Sep-2025 → warning "Before project start"
 * - Future → no auto-fill
 *
 * Open-Meteo WMO weather codes → WEATHER_OPTIONS mapping included
 * Srinagar coords: lat=34.0837, lon=74.7973
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'diary', 'DiaryPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

// ── Remove previous auto-fill if present ─────────────────────────────────────
if (src.includes('autoFillWeather_v2')) {
  console.log('ℹ️  v2 already present — skipping')
  process.exit(0)
}

// ── 1. Ensure useEffect imported ─────────────────────────────────────────────
if (!src.includes('useEffect')) {
  src = src.replace(
    `import { useState } from 'react'`,
    `import { useState, useEffect } from 'react'`
  )
}

// ── 2. Ensure settingsApi imported ────────────────────────────────────────────
if (!src.includes('settingsApi')) {
  src = src.replace(
    `import { diaryApi } from '@/api/diary.api'`,
    `import { diaryApi } from '@/api/diary.api'\nimport { settingsApi } from '@/api/settings.api'`
  )
}

// ── 3. Replace or add weather helpers ────────────────────────────────────────
const helpers = `
// autoFillWeather_v2 — marker for idempotency check
const PROJECT_START = '2025-09-27'
const SITE_LAT      = 34.0837
const SITE_LON      = 74.7973

// WMO weather code → WEATHER_OPTIONS value (Open-Meteo)
function wmoToOption(code: number): string {
  if (code === 0)                          return 'sunny'
  if (code <= 2)                           return 'cloudy'
  if (code === 3)                          return 'cloudy'
  if (code >= 45 && code <= 48)            return 'foggy'
  if (code >= 51 && code <= 67)            return 'rainy'
  if (code >= 71 && code <= 77)            return 'snowy'
  if (code >= 80 && code <= 82)            return 'rainy'
  if (code >= 85 && code <= 86)            return 'snowy'
  if (code >= 95)                          return 'stormy'
  return 'cloudy'
}

// OpenWeatherMap main condition → WEATHER_OPTIONS value
function owmToOption(main: string): string {
  const m = main?.toLowerCase() ?? ''
  if (m === 'clear')                              return 'sunny'
  if (m === 'clouds')                             return 'cloudy'
  if (m === 'rain' || m === 'drizzle')            return 'rainy'
  if (m === 'thunderstorm')                       return 'stormy'
  if (m === 'snow')                               return 'snowy'
  if (['fog','mist','haze','smoke'].includes(m))  return 'foggy'
  return 'cloudy'
}
`

// Remove old helpers if present and replace
if (src.includes('function owmToOption')) {
  src = src.replace(
    /\/\/ Map OpenWeatherMap.*?return 'cloudy'\n\}\n/s,
    helpers
  )
} else {
  src = src.replace(
    `const EQUIP_TYPES = [`,
    helpers + `\nconst EQUIP_TYPES = [`
  )
}

// ── 4. Add autoFilled + autoFillMsg state ─────────────────────────────────────
if (!src.includes('autoFilled')) {
  src = src.replace(
    `  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))`,
    `  const [autoFilled, setAutoFilled]     = useState(false)
  const [autoFillMsg, setAutoFillMsg]   = useState('')

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))`
  )
} else {
  // Already has autoFilled, just add msg state
  src = src.replace(
    `  const [autoFilled, setAutoFilled] = useState(false)`,
    `  const [autoFilled, setAutoFilled]   = useState(false)
  const [autoFillMsg, setAutoFillMsg] = useState('')`
  )
}

// ── 5. Replace or add useEffect ───────────────────────────────────────────────
const newEffect = `
  // Hybrid weather auto-fill — fires when modal opens OR date changes
  useEffect(() => {
    if (!showNew) { setAutoFilled(false); setAutoFillMsg(''); return }

    let cancelled = false

    async function fillWeather() {
      const selectedDate = form.date || new Date().toISOString().split('T')[0]
      const today        = new Date().toISOString().split('T')[0]

      // Block dates before project start
      if (selectedDate < PROJECT_START) {
        setAutoFillMsg('⚠️ Date is before project start (27 Sep 2025)')
        setAutoFilled(false)
        return
      }

      // Future dates — no auto-fill
      if (selectedDate > today) {
        setAutoFillMsg('')
        setAutoFilled(false)
        return
      }

      try {
        if (selectedDate === today) {
          // ── Live weather from OpenWeatherMap ──
          const keyRes = await settingsApi.get('weather_api_key')
          const apiKey = keyRes?.data?.value
          if (!apiKey) { setAutoFillMsg('⚙️ Add OpenWeatherMap key in Settings'); return }

          const cityRes = await settingsApi.get('weather_city')
          const city    = cityRes?.data?.value || 'Srinagar,IN'
          const url     = \`https://api.openweathermap.org/data/2.5/weather?q=\${city}&appid=\${apiKey}&units=metric\`
          const res     = await fetch(url)
          if (!res.ok || cancelled) return
          const d       = await res.json()

          const condition  = d?.weather?.[0]?.main ?? 'Clouds'
          const tempMin    = Math.round(d?.main?.temp_min ?? d?.main?.temp ?? 0)
          const tempMax    = Math.round(d?.main?.temp_max ?? d?.main?.temp ?? 0)
          const rainfall   = Math.round((d?.rain?.['1h'] ?? d?.rain?.['3h'] ?? 0) * 10) / 10
          const weatherVal = owmToOption(condition)

          if (cancelled) return
          setForm((f: any) => ({
            ...f,
            weatherMorning:      weatherVal,
            weatherAfternoon:    weatherVal,
            tempMin:             String(tempMin),
            tempMax:             String(tempMax),
            rainfallMm:          String(rainfall),
            workStoppedWeather:  weatherVal === 'rainy' || weatherVal === 'stormy',
          }))
          setAutoFilled(true)
          setAutoFillMsg(\`✓ Live weather · \${new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}\`)

        } else {
          // ── Historical weather from Open-Meteo (free, no key) ──
          const url = \`https://archive-api.open-meteo.com/v1/archive?\` +
            \`latitude=\${SITE_LAT}&longitude=\${SITE_LON}\` +
            \`&start_date=\${selectedDate}&end_date=\${selectedDate}\` +
            \`&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode\` +
            \`&timezone=Asia%2FKolkata\`

          const res = await fetch(url)
          if (!res.ok || cancelled) return
          const d   = await res.json()

          const wCode    = d?.daily?.weathercode?.[0]   ?? 1
          const tempMin  = Math.round(d?.daily?.temperature_2m_min?.[0] ?? 0)
          const tempMax  = Math.round(d?.daily?.temperature_2m_max?.[0] ?? 0)
          const rainfall = Math.round((d?.daily?.precipitation_sum?.[0] ?? 0) * 10) / 10
          const weatherVal = wmoToOption(wCode)

          if (cancelled) return
          setForm((f: any) => ({
            ...f,
            weatherMorning:      weatherVal,
            weatherAfternoon:    weatherVal,
            tempMin:             String(tempMin),
            tempMax:             String(tempMax),
            rainfallMm:          String(rainfall),
            workStoppedWeather:  weatherVal === 'rainy' || weatherVal === 'stormy',
          }))
          setAutoFilled(true)
          setAutoFillMsg(\`✓ Historical data · Open-Meteo · \${selectedDate}\`)
        }
      } catch {
        setAutoFillMsg('Unable to fetch weather — please fill manually')
      }
    }

    fillWeather()
    return () => { cancelled = true }
  }, [showNew, form.date])

`

// Remove old effect if present
if (src.includes('// Auto-fill weather when diary modal opens')) {
  src = src.replace(
    /  \/\/ Auto-fill weather when diary modal opens[\s\S]*?  \}, \[showNew\]\)\n\n/,
    newEffect
  )
} else {
  src = src.replace(
    `  function addEquip()`,
    newEffect + `  function addEquip()`
  )
}

// ── 6. Replace or add badge in weather step UI ───────────────────────────────
const newBadge = `
              {(autoFilled || autoFillMsg) && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background: autoFillMsg.startsWith('⚠️') ? '#fffbeb' : autoFillMsg.startsWith('Unable') ? '#fef2f2' : '#f0fdf4',
                  border: '1.5px solid ' + (autoFillMsg.startsWith('⚠️') ? '#fcd34d' : autoFillMsg.startsWith('Unable') ? '#fecaca' : '#bbf7d0'),
                  borderRadius:10, padding:'8px 14px', marginBottom:12,
                }}>
                  <span style={{
                    fontSize:12, fontWeight:600,
                    color: autoFillMsg.startsWith('⚠️') ? '#d97706' : autoFillMsg.startsWith('Unable') ? '#dc2626' : '#059669',
                  }}>
                    {autoFillMsg || '✓ Weather auto-filled'}
                  </span>
                  <button onClick={() => { setAutoFilled(false); setAutoFillMsg('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#94a3b8', padding:'2px 6px' }}>
                    ✕
                  </button>
                </div>
              )}
`

// Remove old badge if present
if (src.includes('{autoFilled && (')) {
  src = src.replace(
    /              \{autoFilled && \([\s\S]*?\)}\n/,
    newBadge
  )
} else {
  src = src.replace(
    `              <Input label="Date" type="date"`,
    newBadge + `              <Input label="Date" type="date"`
  )
}

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  DiaryPage.tsx — hybrid weather auto-fill (v2) applied\n')
console.log('  Behaviour:')
console.log('  📅 Today         → OpenWeatherMap live (your API key)')
console.log('  📅 27-Sep-2025   → Open-Meteo historical (free, no key)')
console.log('     to yesterday')
console.log('  📅 Before 27-Sep → Warning: before project start')
console.log('  📅 Future dates  → No auto-fill')
console.log()
console.log('  Also re-triggers when user changes the date field')
console.log('  Auto-checks "Work stopped" when rainy/stormy')

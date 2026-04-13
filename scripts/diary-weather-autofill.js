#!/usr/bin/env node
/**
 * KIPL ProjectOS — Diary Weather Auto-fill
 * When the "New Entry" modal opens, fetches live Srinagar weather
 * and pre-fills: Morning/Afternoon weather, Min/Max temp, Rainfall (mm)
 * Shows an "Auto-filled from weather" badge the user can dismiss
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'diary', 'DiaryPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

if (src.includes('autoFillWeather')) {
  console.log('ℹ️  Weather auto-fill already present — skipping')
  process.exit(0)
}

// ── 1. Add useEffect to imports ──────────────────────────────────────────────
src = src.replace(
  `import { useState } from 'react'`,
  `import { useState, useEffect } from 'react'`
)

// ── 2. Add settingsApi import ─────────────────────────────────────────────────
src = src.replace(
  `import { diaryApi } from '@/api/diary.api'`,
  `import { diaryApi } from '@/api/diary.api'\nimport { settingsApi } from '@/api/settings.api'`
)

// ── 3. Add weather mapping helper after WEATHER_OPTIONS ───────────────────────
const helperCode = `
// Map OpenWeatherMap condition → WEATHER_OPTIONS value
function owmToOption(main: string): string {
  const m = main?.toLowerCase() ?? ''
  if (m === 'clear')                          return 'sunny'
  if (m === 'clouds')                         return 'cloudy'
  if (m === 'rain' || m === 'drizzle')        return 'rainy'
  if (m === 'thunderstorm')                   return 'stormy'
  if (m === 'snow')                           return 'snowy'
  if (['fog','mist','haze','smoke'].includes(m)) return 'foggy'
  return 'cloudy'
}
`

src = src.replace(
  `const EQUIP_TYPES = [`,
  helperCode + `\nconst EQUIP_TYPES = [`
)

// ── 4. Add autoFilled state after existing useState declarations ──────────────
src = src.replace(
  `  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))`,
  `  const [autoFilled, setAutoFilled] = useState(false)

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))`
)

// ── 5. Add useEffect to auto-fill when modal opens ────────────────────────────
const autoFillEffect = `
  // Auto-fill weather when diary modal opens
  useEffect(() => {
    if (!showNew) return
    let cancelled = false

    async function fillWeather() {
      try {
        const [keyRes, cityRes] = await Promise.all([
          settingsApi.get('weather_api_key'),
          settingsApi.get('weather_city'),
        ])
        const apiKey = keyRes?.data?.value
        const city   = cityRes?.data?.value || 'Srinagar,IN'
        if (!apiKey) return

        const url = \`https://api.openweathermap.org/data/2.5/weather?q=\${city}&appid=\${apiKey}&units=metric\`
        const res  = await fetch(url)
        if (!res.ok || cancelled) return
        const d = await res.json()

        const condition  = d?.weather?.[0]?.main ?? 'Clouds'
        const tempMin    = Math.round(d?.main?.temp_min ?? d?.main?.temp ?? '')
        const tempMax    = Math.round(d?.main?.temp_max ?? d?.main?.temp ?? '')
        const rainfall   = Math.round((d?.rain?.['1h'] ?? d?.rain?.['3h'] ?? 0) * 10) / 10
        const weatherVal = owmToOption(condition)

        setForm((f: any) => ({
          ...f,
          weatherMorning:   weatherVal,
          weatherAfternoon: weatherVal,
          tempMin:  String(tempMin),
          tempMax:  String(tempMax),
          rainfallMm: String(rainfall),
          workStoppedWeather: weatherVal === 'rainy' || weatherVal === 'stormy',
        }))
        setAutoFilled(true)
      } catch { /* silent fail — user fills manually */ }
    }

    fillWeather()
    return () => { cancelled = true }
  }, [showNew])

`

// Insert after the setF / addEquip block
src = src.replace(
  `  function addEquip()`,
  autoFillEffect + `  function addEquip()`
)

// ── 6. Add "Auto-filled" badge in the weather step UI ────────────────────────
const badge = `
              {autoFilled && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10,
                  padding:'8px 14px', marginBottom:12 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#059669' }}>
                    ✓ Weather auto-filled from live Srinagar data
                  </span>
                  <button onClick={() => setAutoFilled(false)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      fontSize:12, color:'#94a3b8', padding:'2px 6px' }}>
                    Dismiss
                  </button>
                </div>
              )}
`

// Insert badge just before the Date input in the weather step
src = src.replace(
  `              <Input label="Date" type="date"`,
  badge + `              <Input label="Date" type="date"`
)

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  DiaryPage.tsx patched — weather auto-fill added')
console.log()
console.log('  When "New Entry" modal opens:')
console.log('  → Fetches live weather from OpenWeatherMap')
console.log('  → Pre-fills Morning/Afternoon weather condition')
console.log('  → Pre-fills Min/Max temperature')
console.log('  → Pre-fills Rainfall (mm)')
console.log('  → Auto-checks "Work stopped" if rainy/stormy')
console.log('  → Shows green badge user can dismiss')
console.log('  → Silent fail if no API key or network error')

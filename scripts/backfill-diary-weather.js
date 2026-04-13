/**
 * KIPL ProjectOS — Diary Weather Backfill Script (with Auth)
 */

const PROJECT_ID    = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const PROJECT_START = '2025-09-27'
const API_BASE      = 'http://localhost:3000'
const SITE_LAT      = 34.0837
const SITE_LON      = 74.7973
const SUBMITTED_BY  = 'KIPL Admin'
const LOGIN_EMAIL   = 'admin@kipl.in'
const LOGIN_PASS    = 'password'

function wmoToCondition(code) {
  if (code === 0)                return 'sunny'
  if (code <= 2)                 return 'cloudy'
  if (code === 3)                return 'cloudy'
  if (code >= 45 && code <= 48) return 'foggy'
  if (code >= 51 && code <= 67) return 'rainy'
  if (code >= 71 && code <= 77) return 'snowy'
  if (code >= 80 && code <= 82) return 'rainy'
  if (code >= 85 && code <= 86) return 'snowy'
  if (code >= 95)               return 'stormy'
  return 'cloudy'
}

function dateRange(start, end) {
  const dates = []
  const cur   = new Date(start)
  const last  = new Date(end)
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

async function main() {
  // ── Step 0: Login ─────────────────────────────────────────────────────────
  console.log('\n🔐 Logging in...')
  const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASS }),
  })
  if (!loginRes.ok) {
    const txt = await loginRes.text()
    throw new Error(`Login failed (${loginRes.status}): ${txt}`)
  }
  const loginData = await loginRes.json()
  const token = loginData.accessToken ?? loginData.access_token ?? loginData.token
  if (!token) throw new Error('No token found in: ' + JSON.stringify(loginData))
  console.log('   ✓ Logged in\n')

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  }

  const today    = new Date().toISOString().split('T')[0]
  const allDates = dateRange(PROJECT_START, today)
  console.log(`📅 Date range: ${PROJECT_START} → ${today} (${allDates.length} days)\n`)

  // ── Step 1: Fetch existing entries to skip duplicates ─────────────────────
  console.log('🔍 Checking existing entries...')
  const existing = await fetch(
    `${API_BASE}/api/v1/diary?projectId=${PROJECT_ID}&limit=1000`,
    { headers }
  ).then(r => r.json())

  const existingDates = new Set(
    (Array.isArray(existing) ? existing : existing.data ?? [])
      .map(e => (e.date ?? '').split('T')[0])
  )
  console.log(`   Found ${existingDates.size} existing — will skip these\n`)

  const toCreate = allDates.filter(d => !existingDates.has(d))
  console.log(`📝 Creating ${toCreate.length} new entries\n`)
  if (toCreate.length === 0) { console.log('✅ Nothing to do!'); return }

  // ── Step 2: Fetch weather from Open-Meteo (one request) ───────────────────
  const minDate = toCreate[0]
  const maxDate = toCreate[toCreate.length - 1]
  console.log(`🌦  Fetching Open-Meteo: ${minDate} → ${maxDate}...`)

  const wxUrl =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${SITE_LAT}&longitude=${SITE_LON}` +
    `&start_date=${minDate}&end_date=${maxDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
    `&timezone=Asia%2FKolkata`

  const wx = await fetch(wxUrl).then(r => r.json())
  const wxMap = {}
  ;(wx.daily?.time ?? []).forEach((d, i) => {
    wxMap[d] = {
      code:     wx.daily.weathercode?.[i]          ?? 1,
      tempMin:  Math.round(wx.daily.temperature_2m_min?.[i] ?? 10),
      tempMax:  Math.round(wx.daily.temperature_2m_max?.[i] ?? 20),
      rainfall: Math.round((wx.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
    }
  })
  console.log(`   ✓ Got weather for ${Object.keys(wxMap).length} days\n`)

  // ── Step 3: Create entries ─────────────────────────────────────────────────
  let created = 0, skipped = 0, failed = 0
  const icons = { sunny:'☀️ ', cloudy:'⛅ ', rainy:'🌧️ ', snowy:'❄️ ', foggy:'🌫️ ', stormy:'⛈️ ' }

  for (const date of toCreate) {
    const w = wxMap[date]
    if (!w) { console.log(`   ⚠️  ${date} — no weather data, skipping`); skipped++; continue }

    const condition   = wmoToCondition(w.code)
    const workStopped = ['rainy','stormy','snowy'].includes(condition)

    const payload = {
      projectId:          PROJECT_ID,
      date,
      submittedBy:        SUBMITTED_BY,
      weatherMorning:     condition,
      weatherAfternoon:   condition,
      tempMin:            w.tempMin,
      tempMax:            w.tempMax,
      rainfallMm:         w.rainfall,
      workStoppedWeather: workStopped,
      hoursLost:          workStopped ? 8 : 0,
      labourSkilled:      0,
      labourUnskilled:    0,
      labourSupervisory:  0,
      equipment:          [],
      workDone:           [],
      materialsReceived:  [],
      visitors:           [],
      issuesFaced:        '',
      instructionsGiven:  '',
      nextDayPlan:        '',
      eotClaim:           workStopped,
      eotReason:          workStopped ? `Work stopped due to ${condition} weather` : '',
      status:             'draft',
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/diary`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      })

      if (res.status === 409) { console.log(`   ⏭  ${date} already exists`); skipped++; continue }
      if (!res.ok) {
        const err = await res.text()
        console.log(`   ❌ ${date} — ${res.status}: ${err.slice(0,100)}`)
        failed++; continue
      }

      console.log(`   ✓ ${date}  ${icons[condition]??'⛅ '} ${condition.padEnd(7)} ${w.tempMin}°–${w.tempMax}°C  rain:${w.rainfall}mm${workStopped?' ⚠ EOT':''}`)
      created++

    } catch(e) {
      console.log(`   ❌ ${date} — ${e.message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 60))
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅  Created  : ${created}`)
  console.log(`⏭   Skipped  : ${skipped}`)
  if (failed > 0) console.log(`❌  Failed   : ${failed}`)
  console.log('─'.repeat(60))
  console.log('🎉  Refresh Site Diary page!\n')
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1) })

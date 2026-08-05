import { toast } from '@/lib/notify'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Sun, Cloud, CloudRain, CloudFog, Snowflake, CloudLightning, Warning, CheckCircle, BookOpen } from '@phosphor-icons/react'
import { diaryApi } from '@/api/diary.api'
import { hrApi } from '@/api/hr.api'
import { accountingApi } from '@/api/accounting.api'
import { settingsApi } from '@/api/settings.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const WEATHER_OPTIONS = [
  { value:'sunny',   label:'Sunny'   },
  { value:'cloudy',  label:'Cloudy'  },
  { value:'rainy',   label:'Rainy'   },
  { value:'foggy',   label:'Foggy'   },
  { value:'snowy',   label:'Snowy'   },
  { value:'stormy',  label:'Stormy'  },
]

const WX_ICON: Record<string, any> = { sunny:Sun, cloudy:Cloud, rainy:CloudRain, foggy:CloudFog, snowy:Snowflake, stormy:CloudLightning }
function Wx({ v, size = 15 }: { v: string; size?: number }) {
  const I = WX_ICON[v] ?? Cloud
  return <I size={size} color={C.text2} style={{ verticalAlign:'middle' }} />
}



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

const EQUIP_TYPES = [
  'Excavator','Tipper/Dumper','Concrete Mixer','Vibrator',
  'Water Tanker','Compactor','Crane','Generator','Pump',
  'JCB / Backhoe','Transit Mixer','Pipe Laying Machine','Other',
]

const ZONES = [
  'IPS-1 (Node 102)','IPS-2 (Node 702)','IPS-3 (Node 1053)',
  'IPS-4 (Node 1266)','IPS-5 (Node 1532)','IPS-6 (Node 1763)',
  'IPS-7 (Node 2670)','IPS-8 (Node 3561)','IPS-9 (Node 4011)',
  'MPS (Habak)','STP Site','Rising Main','General Site',
]

// Visitor organisations — stakeholders (datalist: pick one or type another)
const STAKEHOLDERS = ['UEED','LCMA','NIT Srinagar','AMRUT','Forest Department','SMC','DC Office','PWD','Traffic Police','Keller Ground Engineering','Consultant','J&K Bank','KIPL']
// Common materials received on site
const MATERIALS = [
  'OPC Cement 43 Grade','OPC Cement 53 Grade','PPC Cement','TMT Steel','Fine Sand','Coarse Sand','Khak Bajri',
  '10mm Aggregate','20mm Aggregate','40mm Aggregate','63mm Aggregate','70mm Aggregate','80mm Oversized Aggregate','GSB','WMM','Boulders','Bricks','Concrete Blocks',
  'RCC NP3 Pipe 200mm','RCC NP3 Pipe 300mm','RCC NP3 Pipe 450mm','RCC NP3 Pipe 600mm','HDPE Pipe','DI Pipe',
  'Bitumen','Admixture','Curing Compound','HSD / Diesel','Water',
]
const UNITS = ['Cum','Brass','MT','Bags','Nos','Sqm','Rmt','Kg','Litre','Trip']

const SS: Record<string,any> = {
  draft:     { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  submitted: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  approved:  { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
}

const BLANK = {
  date: new Date().toISOString().split('T')[0],
  weatherMorning: 'sunny', weatherAfternoon: 'sunny',
  tempMin: '', tempMax: '', rainfallMm: '0',
  workStoppedWeather: false, hoursLost: '0',
  labourSkilled: '0', labourUnskilled: '0', labourSupervisory: '0',
  equipment: [] as any[],
  workDone: [{ zone:'General Site', activity:'', quantity:'', unit:'', remarks:'' }] as any[],
  materialsReceived: [] as any[],
  visitors: [] as any[],
  photos: [] as any[],
  issuesFaced: '', instructionsGiven: '', nextDayPlan: '',
  eotClaim: false, eotReason: '',
}

type Tab = 'list' | 'eot'

export default function DiaryPage() {
  const { activeProjectId, user } = useAuthStore()
  // Approved diaries are signed records — only senior roles may amend them.
  const canEditApproved = ['super_admin', 'admin', 'project_manager'].includes(user?.role ?? '')
  const qc = useQueryClient()
  const [tab, setTab]         = useState<Tab>('list')
  const [showNew, setShowNew] = useState(false)
  const [viewEntry, setView]  = useState<any>(null)
  const [form, setForm]       = useState<any>(BLANK)
  const [step, setStep]       = useState<'weather'|'labour'|'work'|'notes'>('weather')
  const [editId, setEditId]   = useState<string | null>(null)
  const [saveErr, setSaveErr] = useState('')

  const errMsg = (e: any) => {
    const m = e?.response?.data?.message ?? e?.message ?? 'Request failed'
    return Array.isArray(m) ? m.join(', ') : String(m)
  }

  const { data: dash } = useQuery({
    queryKey: ['diary-dash', activeProjectId],
    queryFn:  () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['diary', activeProjectId, tab],
    queryFn:  () => diaryApi.list({ projectId: activeProjectId, eotOnly: tab === 'eot' ? 'true' : undefined }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  // Timesheet manpower for the listed dates → reconciliation badges
  const diaryDates = (entries ?? []).map((e: any) => String(e.date).split('T')[0]).sort()
  const { data: manpower } = useQuery({
    queryKey: ['diary-manpower', activeProjectId, diaryDates[0], diaryDates[diaryDates.length - 1]],
    queryFn:  () => hrApi.manpowerRange(activeProjectId!, diaryDates[0], diaryDates[diaryDates.length - 1]).then(r => r.data),
    enabled:  !!activeProjectId && diaryDates.length > 0,
  })

  // Timesheet manpower for the day being entered (wizard Labour step)
  const { data: dayMp } = useQuery({
    queryKey: ['diary-day-mp', activeProjectId, form.date],
    queryFn:  () => hrApi.manpower(activeProjectId!, form.date).then(r => r.data),
    enabled:  !!activeProjectId && showNew && step === 'labour' && !!form.date,
  })

  // Vendors → supplier suggestions
  const { data: vendors } = useQuery({
    queryKey: ['vendors-for-diary'],
    queryFn:  () => accountingApi.vendors().then(r => r.data).catch(() => []),
  })
  const vendorNames: string[] = (vendors ?? []).map((v: any) => v.name ?? v.vendorName ?? v.title).filter(Boolean)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return
    setUploadingPhoto(true)
    try {
      for (const file of Array.from(files)) {
        const { data } = await diaryApi.uploadPhoto(file)
        setForm((f: any) => ({ ...f, photos: [...(f.photos ?? []), { url: data.url, key: data.key, caption: '' }] }))
      }
    } catch (e: any) {
      toast.error('Photo upload failed: ' + (e?.response?.data?.message ?? e?.message))
    } finally { setUploadingPhoto(false) }
  }

  const [pulling, setPulling] = useState(false)
  async function pullFromTimesheets() {
    if (!activeProjectId || !form.date) return
    setPulling(true)
    try {
      const { data } = await hrApi.manpower(activeProjectId, form.date)
      setForm((f: any) => ({ ...f,
        labourSkilled: String(data.skilled || 0),
        labourUnskilled: String(data.unskilled || 0),
        labourSupervisory: String(data.supervisory || 0),
      }))
      if ((data.uncategorised ?? 0) > 0) {
        toast.error(`${data.uncategorised} present staff have no labour category set, so they weren't bucketed. Set 'Labour category' on their employee record to include them.`)
      }
    } catch (e: any) {
      toast.error('Could not pull from timesheets: ' + errMsg(e))
    } finally {
      setPulling(false)
    }
  }

  // Normalise the wizard form (string inputs) into the typed payload.
  const buildPayload = () => ({
    ...form, projectId: activeProjectId,
    rainfallMm: parseFloat(form.rainfallMm)||0, hoursLost: parseFloat(form.hoursLost)||0,
    labourSkilled: parseInt(form.labourSkilled)||0,
    labourUnskilled: parseInt(form.labourUnskilled)||0,
    labourSupervisory: parseInt(form.labourSupervisory)||0,
    tempMin: form.tempMin !== '' && form.tempMin != null ? parseFloat(form.tempMin) : null,
    tempMax: form.tempMax !== '' && form.tempMax != null ? parseFloat(form.tempMax) : null,
  })

  const afterSave = () => {
    qc.invalidateQueries({ queryKey: ['diary'] })
    qc.invalidateQueries({ queryKey: ['diary-dash'] })
    closeModal()
  }

  const createM = useMutation({
    mutationFn: () => diaryApi.create(buildPayload()),
    onSuccess: afterSave,
    onError: (e: any) => setSaveErr(errMsg(e)),
  })

  const updateM = useMutation({
    mutationFn: () => diaryApi.update(editId!, buildPayload()),
    onSuccess: afterSave,
    onError: (e: any) => setSaveErr(errMsg(e)),
  })

  const approveM = useMutation({
    mutationFn: (id: string) => diaryApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary'] }),
    onError: (e: any) => toast.error('Approve failed: ' + errMsg(e)),
  })

  const submitM = useMutation({
    mutationFn: (id: string) => diaryApi.submit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary'] }),
    onError: (e: any) => toast.error('Submit failed: ' + errMsg(e)),
  })

  const [autoFilled, setAutoFilled]   = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [btnPulse, setBtnPulse]         = useState(false)
  const newEntryBtnRef                  = useRef<HTMLButtonElement>(null)

  // Deep link: /diary?action=new
  // Scrolls to + pulses the New Entry button instead of opening modal
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setSearchParams({})
      setTimeout(() => {
        newEntryBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setBtnPulse(true)
        setTimeout(() => setBtnPulse(false), 2500)
      }, 400)
    }
  }, [searchParams])
  const [autoFillMsg, setAutoFillMsg] = useState('')

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  function openNew() {
    setEditId(null); setSaveErr(''); setForm(BLANK); setStep('weather'); setShowNew(true)
  }
  function openEdit(e: any) {
    setEditId(e.id); setSaveErr('')
    setForm({
      date: e.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      weatherMorning: e.weatherMorning ?? 'sunny', weatherAfternoon: e.weatherAfternoon ?? 'sunny',
      tempMin: e.tempMin != null ? String(e.tempMin) : '', tempMax: e.tempMax != null ? String(e.tempMax) : '',
      rainfallMm: String(e.rainfallMm ?? '0'),
      workStoppedWeather: !!e.workStoppedWeather, hoursLost: String(e.hoursLost ?? '0'),
      labourSkilled: String(e.labourSkilled ?? '0'), labourUnskilled: String(e.labourUnskilled ?? '0'),
      labourSupervisory: String(e.labourSupervisory ?? '0'),
      equipment: e.equipment ?? [], workDone: e.workDone?.length ? e.workDone : [{ zone:'General Site', activity:'', quantity:'', unit:'', remarks:'' }],
      materialsReceived: e.materialsReceived ?? [], visitors: e.visitors ?? [], photos: e.photos ?? [],
      issuesFaced: e.issuesFaced ?? '', instructionsGiven: e.instructionsGiven ?? '', nextDayPlan: e.nextDayPlan ?? '',
      eotClaim: !!e.eotClaim, eotReason: e.eotReason ?? '',
    })
    setStep('weather'); setShowNew(true)
  }
  function closeModal() {
    setShowNew(false); setStep('weather'); setEditId(null); setSaveErr(''); setForm(BLANK)
  }

  // Hybrid weather auto-fill — fires when modal opens OR date changes.
  // Skipped when editing an existing entry (don't clobber saved weather).
  useEffect(() => {
    if (!showNew || editId) { setAutoFilled(false); setAutoFillMsg(''); return }

    let cancelled = false

    async function fillWeather() {
      const selectedDate = form.date || new Date().toISOString().split('T')[0]
      const today        = new Date().toISOString().split('T')[0]

      // Block dates before project start
      if (selectedDate < PROJECT_START) {
        setAutoFillMsg('Date is before project start (27 Sep 2025)')
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
          if (!apiKey) { setAutoFillMsg('Add OpenWeatherMap key in Settings'); return }

          const cityRes = await settingsApi.get('weather_city')
          const city    = cityRes?.data?.value || 'Srinagar,IN'
          const url     = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
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
          setAutoFillMsg(`Live weather · ${new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}`)

        } else {
          // ── Historical weather from Open-Meteo (free, no key) ──
          const url = `https://archive-api.open-meteo.com/v1/archive?` +
            `latitude=${SITE_LAT}&longitude=${SITE_LON}` +
            `&start_date=${selectedDate}&end_date=${selectedDate}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
            `&timezone=Asia%2FKolkata`

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
          setAutoFillMsg(`Historical data · Open-Meteo · ${selectedDate}`)
        }
      } catch {
        setAutoFillMsg('Unable to fetch weather — please fill manually')
      }
    }

    fillWeather()
    return () => { cancelled = true }
  }, [showNew, form.date, editId])

  const pulseStyle = btnPulse
    ? { outline: '3px solid #2563eb', outlineOffset: '3px', transform: 'scale(1.03)', transition: 'all 0.3s' }
    : { transition: 'all 0.3s' }

  function addEquip()  { setF('equipment', [...form.equipment, { type:'Excavator', count:1, hours:8, remarks:'' }]) }
  function addWork()   { setF('workDone', [...form.workDone, { zone:'General Site', activity:'', quantity:'', unit:'', remarks:'' }]) }
  function addMat()    { setF('materialsReceived', [...form.materialsReceived, { material:'', quantity:'', unit:'', trips:'', supplier:'' }]) }
  function addVisitor(){ setF('visitors', [...form.visitors, { name:'', organisation:'', purpose:'' }]) }

  function setEquip(i: number, k: string, v: any) {
    setF('equipment', form.equipment.map((e: any, idx: number) => idx===i ? { ...e, [k]:v } : e))
  }
  function setWork(i: number, k: string, v: any) {
    setF('workDone', form.workDone.map((e: any, idx: number) => idx===i ? { ...e, [k]:v } : e))
  }
  function setMat(i: number, k: string, v: any) {
    setF('materialsReceived', form.materialsReceived.map((e: any, idx: number) => idx===i ? { ...e, [k]:v } : e))
  }

  // Month/year filter for browsing past entries
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const [fltMonth, setFltMonth] = useState<string>('')   // '' = all months
  const [fltYear, setFltYear]   = useState<string>('')    // '' = all years
  const allEntries = entries ?? []
  const list = allEntries.filter((e: any) => {
    const d = new Date(e.date)
    if (fltYear && d.getFullYear() !== parseInt(fltYear)) return false
    if (fltMonth !== '' && d.getMonth() !== parseInt(fltMonth)) return false
    return true
  })
  const years = Array.from(new Set(allEntries.map((e: any) => new Date(e.date).getFullYear()))).sort((a: any, b: any) => b - a)

  const steps = ['weather','labour','work','notes'] as const
  const stepLabels = ['Weather','Labour & Equipment','Work Done','Notes & Issues']

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>Site Daily Diary</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Daily site records · Weather · Labour · Work done · EOT claims</p>
        </div>
        <span ref={newEntryBtnRef as any} style={pulseStyle as any}>
          <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={openNew}>
            New Entry — Today
          </Button>
        </span>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Entries',    value: dash?.totalEntries ?? 0,          color: C.blue },
          { label:'This Month',       value: dash?.thisMonthEntries ?? 0,       color: C.navy },
          { label:'Avg Labour / Day', value: dash?.avgLabourThisMonth ?? 0,     color: C.green },
          { label:'EOT Claim Days',   value: dash?.eotClaimDays ?? 0,           color: (dash?.eotClaimDays ?? 0) > 0 ? C.red : C.text3 },
        ].map(k => (
          <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Weather / EOT summary */}
      {(dash?.rainyDays ?? 0) > 0 && (
        <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'14px 20px', display:'flex', gap:24, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <CloudRain size={18} color={C.blue} />
            <span style={{ fontSize:13, color:'#1d4ed8', fontWeight:600 }}>Rainy Days: {dash?.rainyDays}</span>
          </div>
          <div style={{ fontSize:13, color:'#1d4ed8' }}>Hours Lost to Weather: <strong>{dash?.hoursLostWeather}</strong></div>
          <div style={{ fontSize:13, color:'#1d4ed8' }}>EOT Claim Days: <strong>{dash?.eotClaimDays}</strong></div>
          <div style={{ marginLeft:'auto', fontSize:12, color:'#3b82f6' }}>Evidence for Extension of Time claim against UEED</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border }}>
        {([['list','All Entries'],['eot','EOT Claims']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1,
          }}>{l}</button>
        ))}
      </div>

      {/* Month / year filter */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, fontWeight:600, color:C.text3 }}>Browse:</span>
        <select value={fltMonth} onChange={e => setFltMonth(e.target.value)}
          style={{ padding:'7px 11px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, background:'#fff', fontFamily:'inherit', cursor:'pointer' }}>
          <option value="">All months</option>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={fltYear} onChange={e => setFltYear(e.target.value)}
          style={{ padding:'7px 11px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, background:'#fff', fontFamily:'inherit', cursor:'pointer' }}>
          <option value="">All years</option>
          {years.map((y: any) => <option key={y} value={y}>{y}</option>)}
        </select>
        {(fltMonth !== '' || fltYear !== '') && (
          <button onClick={() => { setFltMonth(''); setFltYear('') }} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Clear</button>
        )}
        <span style={{ fontSize:12, color:C.text3, marginLeft:'auto' }}>{list.length} of {allEntries.length} entries</span>
      </div>

      {/* Entries list */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
        : list.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:10 }}>
            <BookOpen size={32} color={C.border} />
            <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>
              {tab === 'eot' ? 'No EOT claim entries' : allEntries.length > 0 ? 'No entries for this period' : 'No diary entries yet'}
            </p>
            {tab === 'list' && allEntries.length === 0 && <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={openNew}>Record today's diary</Button>}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                {['Date','Weather','Labour','Work Items','Materials In','EOT','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((e: any, i: number) => {
                const ss = SS[e.status] ?? SS.draft
                const isRainy = e.weatherMorning === 'rainy' || e.weatherAfternoon === 'rainy'
                return (
                  <tr key={e.id} style={{ borderBottom: i < list.length-1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:C.text1, whiteSpace:'nowrap' }}>
                      {new Date(e.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, color:C.text2 }}>
                        <Wx v={e.weatherMorning}/> <span style={{ color:C.text3 }}>/</span> <Wx v={e.weatherAfternoon}/>
                      </div>
                      {isRainy && Number(e.hoursLost) > 0 && <p style={{ fontSize:10, color:C.red, margin:'2px 0 0' }}>{e.hoursLost}h lost</p>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{e.labourTotal}</div>
                      <div style={{ fontSize:10, color:C.text3 }}>S:{e.labourSkilled} U:{e.labourUnskilled} Sup:{e.labourSupervisory}</div>
                      {(() => {
                        const mp = manpower?.[String(e.date).split('T')[0]]
                        if (!mp) return null
                        const match = Number(e.labourTotal) === Number(mp.present)
                        return (
                          <div title="Diary headcount vs timesheets marked present"
                            style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:4, fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:999,
                              background: match ? '#ecfdf5' : '#fffbeb', color: match ? '#047857' : '#b45309', border:'1px solid '+(match?'#a7f3d0':'#fde68a') }}>
                            {match ? '✓' : '≠'} HR {mp.present}
                          </div>
                        )
                      })()}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{e.workDone?.length ?? 0} items</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:C.text2 }}>{e.materialsReceived?.length ?? 0} items</td>
                    <td style={{ padding:'12px 16px' }}>
                      {e.eotClaim
                        ? <span style={{ fontSize:11, fontWeight:700, color:C.red, background:'#fef2f2', padding:'2px 8px', borderRadius:999 }}>EOT</span>
                        : <span style={{ fontSize:11, color:C.text3 }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{e.status}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setView(e)}
                          style={{ padding:'4px 8px', fontSize:10, color:C.text2, background:'none', border:'1.5px solid '+C.border, borderRadius:5, cursor:'pointer' }}>View</button>
                        <button onClick={async () => { const { generateDiaryPdf } = await import('./diaryPdf'); generateDiaryPdf(e) }}
                          style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'#b45309', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:5, cursor:'pointer' }}>PDF</button>
                        {(e.status !== 'approved' || canEditApproved) && (
                          <button onClick={() => openEdit(e)}
                            style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.text2, background:'#f8fafc', border:'1.5px solid '+C.border, borderRadius:5, cursor:'pointer' }}>Edit</button>
                        )}
                        {e.status === 'draft' && (
                          <button onClick={() => submitM.mutate(e.id)}
                            style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>Submit</button>
                        )}
                        {e.status === 'submitted' && (
                          <button onClick={() => approveM.mutate(e.id)}
                            style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'#047857', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:5, cursor:'pointer' }}>Approve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New/Edit Entry Modal — step wizard */}
      <Modal open={showNew} onClose={closeModal} title={editId ? 'Edit Site Diary Entry' : 'Site Daily Diary Entry'} width={740}
        footer={<>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <div style={{ display:'flex', gap:8 }}>
            {step !== 'weather' && (
              <Button variant="secondary" onClick={() => setStep(steps[steps.indexOf(step) - 1])}>← Back</Button>
            )}
            {step !== 'notes' ? (
              <Button variant="primary" onClick={() => setStep(steps[steps.indexOf(step) + 1])}>Next →</Button>
            ) : (
              <Button variant="primary" loading={createM.isPending || updateM.isPending}
                onClick={() => { setSaveErr(''); editId ? updateM.mutate() : createM.mutate() }}>
                {editId ? 'Save Changes' : 'Save Diary Entry'}
              </Button>
            )}
          </div>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {saveErr && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, padding:'10px 14px' }}>
              <Warning size={16} color={C.red} weight="fill" />
              <span style={{ fontSize:12, color:'#b91c1c', fontWeight:600 }}>{saveErr}</span>
            </div>
          )}

          {/* Datalists: dropdown suggestions that also accept any typed value */}
          <datalist id="dm-orgs">{STAKEHOLDERS.map(o => <option key={o} value={o} />)}</datalist>
          <datalist id="dm-materials">{MATERIALS.map(o => <option key={o} value={o} />)}</datalist>
          <datalist id="dm-units">{UNITS.map(o => <option key={o} value={o} />)}</datalist>
          <datalist id="dm-vendors">{vendorNames.map(o => <option key={o} value={o} />)}</datalist>

          {/* Step indicator */}
          <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid '+C.border, marginBottom:4 }}>
            {steps.map((s, i) => (
              <button key={s} onClick={() => setStep(s)} style={{
                padding:'8px 16px', fontSize:12, fontWeight:600, border:'none', background:'none', cursor:'pointer',
                borderBottom: step===s ? '2px solid '+C.blue : '2px solid transparent',
                color: step===s ? C.blue : C.text3, marginBottom:-1,
              }}>{i+1}. {stepLabels[i]}</button>
            ))}
          </div>

          {/* Step 1: Weather */}
          {step === 'weather' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>


              {(autoFilled || autoFillMsg) && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background: autoFillMsg.includes('before project start') ? '#fffbeb' : autoFillMsg.startsWith('Unable') ? '#fef2f2' : '#f0fdf4',
                  border: '1.5px solid ' + (autoFillMsg.includes('before project start') ? '#fcd34d' : autoFillMsg.startsWith('Unable') ? '#fecaca' : '#bbf7d0'),
                  borderRadius:10, padding:'8px 14px', marginBottom:12,
                }}>
                  <span style={{
                    fontSize:12, fontWeight:600,
                    color: autoFillMsg.includes('before project start') ? '#d97706' : autoFillMsg.startsWith('Unable') ? '#dc2626' : '#059669',
                  }}>
                    {autoFillMsg || 'Weather auto-filled'}
                  </span>
                  <button onClick={() => { setAutoFilled(false); setAutoFillMsg('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#94a3b8', padding:'2px 6px' }}>
                    ×
                  </button>
                </div>
              )}

              <Input label="Date" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Morning Weather</label>
                  <select value={form.weatherMorning} onChange={e => setF('weatherMorning', e.target.value)}
                    style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                    {WEATHER_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Afternoon Weather</label>
                  <select value={form.weatherAfternoon} onChange={e => setF('weatherAfternoon', e.target.value)}
                    style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                    {WEATHER_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <Input label="Min Temp (°C)" type="number" value={form.tempMin} onChange={e => setF('tempMin', e.target.value)} placeholder="5" />
                <Input label="Max Temp (°C)" type="number" value={form.tempMax} onChange={e => setF('tempMax', e.target.value)} placeholder="18" />
                <Input label="Rainfall (mm)" type="number" value={form.rainfallMm} onChange={e => setF('rainfallMm', e.target.value)} placeholder="0" />
              </div>
              <div style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 16px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8 }}>
                <input type="checkbox" id="wstop" checked={form.workStoppedWeather} onChange={e => setF('workStoppedWeather', e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }} />
                <label htmlFor="wstop" style={{ fontSize:13, color:'#b91c1c', fontWeight:600, cursor:'pointer' }}>Work stopped due to weather (EOT evidence)</label>
                {form.workStoppedWeather && (
                  <Input label="" value={form.hoursLost} onChange={e => setF('hoursLost', e.target.value)} placeholder="Hours lost" style={{ width:100 }} />
                )}
              </div>
              {form.workStoppedWeather && (
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <input type="checkbox" id="eot" checked={form.eotClaim} onChange={e => setF('eotClaim', e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }} />
                  <label htmlFor="eot" style={{ fontSize:13, color:C.red, fontWeight:600, cursor:'pointer' }}>Mark as EOT Claim day</label>
                </div>
              )}
              {form.eotClaim && (
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>EOT Reason</label>
                  <textarea value={form.eotReason} onChange={e => setF('eotReason', e.target.value)} rows={2}
                    placeholder="Describe the delay cause for EOT claim..."
                    style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Labour & Equipment */}
          {step === 'labour' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'0 0 12px' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Labour on Site</h3>
                  <button type="button" onClick={pullFromTimesheets} disabled={pulling}
                    style={{ fontSize:12, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:6, padding:'6px 12px', cursor: pulling?'default':'pointer' }}>
                    {pulling ? 'Pulling…' : 'Pull from timesheets'}
                  </button>
                </div>
                {dayMp && (
                  <p style={{ fontSize:12, color: (dayMp.uncategorised>0)?C.amber:C.text3, margin:'0 0 10px' }}>
                    {dayMp.present} present in timesheets for this date
                    {dayMp.present>0 && <> · S:{dayMp.skilled} U:{dayMp.unskilled} Sup:{dayMp.supervisory}{dayMp.uncategorised>0 && ` · ${dayMp.uncategorised} uncategorised`}</>}
                  </p>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  <Input label="Skilled Workers" type="number" value={form.labourSkilled} onChange={e => setF('labourSkilled', e.target.value)} />
                  <Input label="Unskilled Workers" type="number" value={form.labourUnskilled} onChange={e => setF('labourUnskilled', e.target.value)} />
                  <Input label="Supervisory" type="number" value={form.labourSupervisory} onChange={e => setF('labourSupervisory', e.target.value)} />
                </div>
                <div style={{ marginTop:8, padding:'8px 14px', background:'#f8f9fc', borderRadius:8, fontSize:13, color:C.blue, fontWeight:700 }}>
                  Total: {(parseInt(form.labourSkilled)||0) + (parseInt(form.labourUnskilled)||0) + (parseInt(form.labourSupervisory)||0)} persons on site
                </div>
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Equipment Deployed</h3>
                  <button onClick={addEquip} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add equipment</button>
                </div>
                {form.equipment.length === 0 ? (
                  <p style={{ fontSize:12, color:C.text3, textAlign:'center', padding:'16px 0' }}>No equipment added</p>
                ) : (
                  <div style={{ border:'1.5px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
                    {form.equipment.map((eq: any, i: number) => (
                      <div key={i} style={{ display:'grid', gridTemplateColumns:'160px 60px 70px 1fr 28px', gap:8, padding:'10px 12px', borderBottom: i < form.equipment.length-1 ? '1px solid #f1f5f9' : 'none', alignItems:'center' }}>
                        <select value={eq.type} onChange={e => setEquip(i, 'type', e.target.value)}
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                          {EQUIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input type="number" value={eq.count} onChange={e => setEquip(i, 'count', e.target.value)} placeholder="Nos"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                        <input type="number" value={eq.hours} onChange={e => setEquip(i, 'hours', e.target.value)} placeholder="Hrs"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                        <input value={eq.remarks} onChange={e => setEquip(i, 'remarks', e.target.value)} placeholder="Remarks"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                        <button onClick={() => setF('equipment', form.equipment.filter((_: any, idx: number) => idx !== i))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Work Done */}
          {step === 'work' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Work Done Today</h3>
                  <button onClick={addWork} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add item</button>
                </div>
                <div style={{ border:'1.5px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
                  {form.workDone.map((w: any, i: number) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 1fr 80px 60px 28px', gap:8, padding:'10px 12px', borderBottom: i < form.workDone.length-1 ? '1px solid #f1f5f9' : 'none', alignItems:'center', background: i%2===0?'#fff':'#fafafa' }}>
                      <select value={w.zone} onChange={e => setWork(i, 'zone', e.target.value)}
                        style={{ padding:'6px 6px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:11, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                        {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <input value={w.activity} onChange={e => setWork(i, 'activity', e.target.value)} placeholder="Activity description"
                        style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                      <input value={w.quantity} onChange={e => setWork(i, 'quantity', e.target.value)} placeholder="Qty"
                        style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                      <input list="dm-units" value={w.unit} onChange={e => setWork(i, 'unit', e.target.value)} placeholder="Unit"
                        style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%' }} />
                      <button onClick={() => setF('workDone', form.workDone.filter((_: any, idx: number) => idx !== i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Materials Received</h3>
                  <button onClick={addMat} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add</button>
                </div>
                {form.materialsReceived.length === 0 ? (
                  <p style={{ fontSize:12, color:C.text3, textAlign:'center' }}>No materials received today</p>
                ) : (
                  <div style={{ border:'1.5px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1.5fr 56px 78px 60px 1.4fr 28px', gap:8, padding:'7px 12px', background:'#f8fafc', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>
                      <span>Material</span><span>Qty</span><span>Unit</span><span>Trips</span><span>Supplier</span><span/>
                    </div>
                    {form.materialsReceived.map((m: any, i: number) => (
                      <div key={i} style={{ display:'grid', gridTemplateColumns:'1.5fr 56px 78px 60px 1.4fr 28px', gap:8, padding:'8px 12px', borderTop:'1px solid #f1f5f9', alignItems:'center' }}>
                        <input list="dm-materials" value={m.material} onChange={e => setMat(i, 'material', e.target.value)} placeholder="Material"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
                        <input value={m.quantity} onChange={e => setMat(i, 'quantity', e.target.value)} placeholder="Qty"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
                        <input list="dm-units" value={m.unit} onChange={e => setMat(i, 'unit', e.target.value)} placeholder="Cum"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
                        <input type="number" value={m.trips ?? ''} onChange={e => setMat(i, 'trips', e.target.value)} placeholder="No." title="Trucks / dumpers received"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
                        <input list="dm-vendors" value={m.supplier} onChange={e => setMat(i, 'supplier', e.target.value)} placeholder="Supplier"
                          style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
                        <button onClick={() => setF('materialsReceived', form.materialsReceived.filter((_: any, idx: number) => idx !== i))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Notes */}
          {step === 'notes' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Issues / Problems Faced</label>
                <textarea value={form.issuesFaced} onChange={e => setF('issuesFaced', e.target.value)} rows={3}
                  placeholder="Any problems, delays, or obstacles faced today..."
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Instructions Given / Received</label>
                <textarea value={form.instructionsGiven} onChange={e => setF('instructionsGiven', e.target.value)} rows={3}
                  placeholder="Any instructions from EIC, AEE, or site engineer..."
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Plan for Tomorrow</label>
                <textarea value={form.nextDayPlan} onChange={e => setF('nextDayPlan', e.target.value)} rows={2}
                  placeholder="What is planned for tomorrow..."
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, color:'#111827', outline:'none', fontFamily:'inherit', resize:'none' }} />
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Visitors to Site</h3>
                  <button onClick={addVisitor} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>+ Add visitor</button>
                </div>
                {form.visitors.map((v: any, i: number) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 28px', gap:8, marginBottom:6, alignItems:'center' }}>
                    <input value={v.name} onChange={e => setF('visitors', form.visitors.map((vv: any, ii: number) => ii===i?{...vv,name:e.target.value}:vv))} placeholder="Name"
                      style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit' }} />
                    <input list="dm-orgs" value={v.organisation} onChange={e => setF('visitors', form.visitors.map((vv: any, ii: number) => ii===i?{...vv,organisation:e.target.value}:vv))} placeholder="Organisation"
                      style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit' }} />
                    <input value={v.purpose} onChange={e => setF('visitors', form.visitors.map((vv: any, ii: number) => ii===i?{...vv,purpose:e.target.value}:vv))} placeholder="Purpose"
                      style={{ padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, outline:'none', fontFamily:'inherit' }} />
                    <button onClick={() => setF('visitors', form.visitors.filter((_: any, idx: number) => idx !== i))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>×</button>
                  </div>
                ))}
              </div>

              {/* Site Photos */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Site Photos <span style={{ fontSize:11, fontWeight:400, color:C.text3 }}>(Clause 17.5 / 23.3)</span></h3>
                  <label style={{ fontSize:12, color:C.blue, cursor:'pointer', fontWeight:600 }}>
                    {uploadingPhoto ? 'Uploading…' : '+ Add photos'}
                    <input type="file" accept="image/*" multiple style={{ display:'none' }} disabled={uploadingPhoto}
                      onChange={e => { uploadPhotos(e.target.files); e.currentTarget.value = '' }} />
                  </label>
                </div>
                {(form.photos ?? []).length === 0
                  ? <p style={{ fontSize:12, color:C.text3, margin:0 }}>No photos attached. Add dated site photographs for the record.</p>
                  : (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {form.photos.map((p: any, i: number) => (
                        <div key={i} style={{ position:'relative', width:88, height:88, borderRadius:8, overflow:'hidden', border:'1px solid '+C.border }}>
                          <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          <button onClick={() => setF('photos', form.photos.filter((_: any, idx: number) => idx !== i))}
                            style={{ position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', border:'none', background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:11, cursor:'pointer', lineHeight:1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* View Entry Modal */}
      {viewEntry && (
        <Modal open={!!viewEntry} onClose={() => setView(null)}
          title={'Site Diary — ' + new Date(viewEntry.date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          width={660}
          footer={<Button variant="ghost" onClick={() => setView(null)}>Close</Button>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ padding:'12px 16px', background:'#f8f9fc', borderRadius:10, border:'1.5px solid '+C.border }}>
                <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 8px' }}>Weather</p>
                <p style={{ fontSize:15, margin:'0 0 4px' }}>
                  Morning: {WEATHER_OPTIONS.find(w => w.value === viewEntry.weatherMorning)?.label}
                </p>
                <p style={{ fontSize:15, margin:'0 0 4px' }}>
                  Afternoon: {WEATHER_OPTIONS.find(w => w.value === viewEntry.weatherAfternoon)?.label}
                </p>
                {viewEntry.tempMin && <p style={{ fontSize:12, color:C.text3, margin:'4px 0 0' }}>Temp: {viewEntry.tempMin}°C — {viewEntry.tempMax}°C | Rain: {viewEntry.rainfallMm}mm</p>}
                {viewEntry.workStoppedWeather && <p style={{ fontSize:12, color:C.red, fontWeight:600, margin:'4px 0 0' }}>Work stopped — {viewEntry.hoursLost}h lost</p>}
              </div>
              <div style={{ padding:'12px 16px', background:'#f8f9fc', borderRadius:10, border:'1.5px solid '+C.border }}>
                <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 8px' }}>Labour</p>
                <p style={{ fontSize:22, fontWeight:800, color:C.text1, margin:'0 0 6px' }}>{viewEntry.labourTotal} <span style={{ fontSize:13, fontWeight:400, color:C.text3 }}>persons</span></p>
                <p style={{ fontSize:12, color:C.text3, margin:0 }}>Skilled: {viewEntry.labourSkilled} | Unskilled: {viewEntry.labourUnskilled} | Supervisory: {viewEntry.labourSupervisory}</p>
              </div>
            </div>
            {(viewEntry.workDone ?? []).length > 0 && (
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Work Done</p>
                <table style={{ width:'100%', borderCollapse:'collapse', border:'1.5px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
                  <thead>
                    <tr style={{ background:'#f8f9fc' }}>
                      {['Zone','Activity','Qty','Unit'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(viewEntry.workDone ?? []).map((w: any, i: number) => (
                      <tr key={i} style={{ borderTop:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'8px 12px', fontSize:11, color:C.text3 }}>{w.zone}</td>
                        <td style={{ padding:'8px 12px', fontSize:13, color:C.text1 }}>{w.activity}</td>
                        <td style={{ padding:'8px 12px', fontSize:12, color:C.text2 }}>{w.quantity}</td>
                        <td style={{ padding:'8px 12px', fontSize:12, color:C.text2 }}>{w.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {viewEntry.issuesFaced && (
              <div style={{ padding:'12px 14px', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:8 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#92400e', margin:'0 0 4px', textTransform:'uppercase' }}>Issues Faced</p>
                <p style={{ fontSize:13, color:'#78350f', margin:0 }}>{viewEntry.issuesFaced}</p>
              </div>
            )}
            {viewEntry.eotClaim && (
              <div style={{ padding:'12px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8 }}>
                <p style={{ fontSize:11, fontWeight:700, color:C.red, margin:'0 0 4px', textTransform:'uppercase' }}>EOT Claim</p>
                <p style={{ fontSize:13, color:'#7f1d1d', margin:0 }}>{viewEntry.eotReason}</p>
              </div>
            )}
            {(viewEntry.photos ?? []).length > 0 && (
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.text1, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Site Photos</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {viewEntry.photos.map((p: any, i: number) => (
                    <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{ display:'block', width:96, height:96, borderRadius:8, overflow:'hidden', border:'1px solid '+C.border }}>
                      <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

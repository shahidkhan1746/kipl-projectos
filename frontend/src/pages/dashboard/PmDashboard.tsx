import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { diaryApi } from '@/api/diary.api'
import { qaApi } from '@/api/qa.api'
import { wbsApi } from '@/api/wbs.api'
import { hrApi } from '@/api/hr.api'
import { accountingApi } from '@/api/accounting.api'
import { meetingsApi } from '@/api/meetings.api'
import { settingsApi } from '@/api/settings.api'
import { useState, useEffect } from 'react'
import {
  MapPin, CalendarBlank, CheckCircle, HardHat, CurrencyInr, Warning, Gear,
  Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, CloudSun,
} from '@phosphor-icons/react'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const PM_CSS = `.pm-grid{display:grid;gap:12px;grid-template-columns:repeat(4,1fr)}
@media(max-width:820px){.pm-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.kipl-weather{flex-direction:column;align-items:flex-start!important;gap:16px}}`

const WEATHER_ICON: Record<string, any> = {
  Clear: Sun, Clouds: Cloud, Rain: CloudRain, Drizzle: CloudRain,
  Thunderstorm: CloudLightning, Snow: Snowflake, Fog: CloudFog, Mist: CloudFog, Haze: CloudFog,
}
const SectionHead = ({ Icon, children }: { Icon: any; children: any }) => (
  <h2 style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>
    <Icon size={14} weight="bold" /> {children}
  </h2>
)

function KpiCard({ label, value, sub, color, onClick }: any) {
  return (
    <div onClick={onClick} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', cursor:onClick?'pointer':'default', transition:'all 0.15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color ?? C.blue)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = C.border)}>
      <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:color ?? C.text1, fontVariantNumeric:'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function WeatherWidget({ apiKey, city }: { apiKey: string; city: string }) {
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!apiKey) { setLoading(false); return }
    fetch('https://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + apiKey + '&units=metric')
      .then(r => r.json())
      .then(d => { setWeather(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [apiKey, city])

  if (!apiKey) return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', color:'#fff' }}>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 4px' }}>SITE WEATHER — SRINAGAR, J&K</p>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0, display:'flex', alignItems:'center', gap:6 }}><Gear size={13}/> Add OpenWeatherMap API key in Super Admin → System Settings</p>
    </div>
  )

  if (loading) return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', color:'#fff' }}>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Loading weather...</p>
    </div>
  )

  if (!weather || weather.cod !== 200) return (
    <div style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', color:'#fff' }}>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 4px' }}>SITE WEATHER — SRINAGAR, J&K</p>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Unable to fetch weather. Check API key.</p>
    </div>
  )

  const WIcon = WEATHER_ICON[weather.weather?.[0]?.main] ?? CloudSun
  const desc = weather.weather?.[0]?.description ?? ''
  const temp = Math.round(weather.main?.temp)
  const feels = Math.round(weather.main?.feels_like)
  const humidity = weather.main?.humidity
  const wind = Math.round(weather.wind?.speed * 3.6)

  return (
    <div className="kipl-weather" style={{ background:'linear-gradient(135deg, #1a2540, #2563eb)', borderRadius:16, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Site Weather — Srinagar, J&K</p>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <WIcon size={44} color="#fff" weight="fill" />
          <div>
            <p style={{ fontSize:36, fontWeight:900, color:'#fff', margin:0, lineHeight:1 }}>{temp}°C</p>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.65)', margin:'4px 0 0', textTransform:'capitalize' }}>{desc}</p>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:20 }}>
        {[
          ['Feels like', feels + '°C'],
          ['Humidity', humidity + '%'],
          ['Wind', wind + ' km/h'],
        ].map(([l, v]) => (
          <div key={l} style={{ textAlign:'center' }}>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</p>
            <p style={{ fontSize:16, fontWeight:700, color:'#fff', margin:0 }}>{v}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', margin:0, alignSelf:'flex-end' }}>
        {new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
      </p>
    </div>
  )
}

export default function PmDashboard() {
  const { activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: weatherKey } = useQuery({
    queryKey: ['setting-weather'],
    queryFn:  () => settingsApi.get('weather_api_key').then(r => r.data?.value ?? ''),
  })

  const { data: taskDash } = useQuery({
    queryKey: ['task-dash', activeProjectId],
    queryFn:  () => tasksApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: diaryDash } = useQuery({
    queryKey: ['diary-dash', activeProjectId],
    queryFn:  () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: qaDash } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn:  () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: wbsDash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn:  () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn:  () => hrApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
  })

  const { data: accDash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn:  () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: meetDash } = useQuery({
    queryKey: ['meet-dash', activeProjectId],
    queryFn:  () => meetingsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const fmtL = (n: number) => n ? '₹' + (n/100000).toFixed(1) + 'L' : '₹0'
  const fmtCr = (n: number) => n ? '₹' + (n/10000000).toFixed(2) + ' Cr' : '₹0'

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <style>{PM_CSS}</style>

      {/* Weather */}
      <WeatherWidget apiKey={weatherKey ?? ''} city="Srinagar,IN" />

      {/* Contract progress */}
      {wbsDash && (
        <div style={{ background:C.navy, borderRadius:16, padding:'18px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Dal Lake EPC — Contract Progress</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.55)', margin:0 }}>Allotment: CE/UEED/PS/01 OF 2025-26 · 27 Sep 2025 → 27 Mar 2028</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:28, fontWeight:900, color:'#93c5fd', margin:0 }}>{wbsDash.contractPct}%</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:0 }}>time elapsed · {wbsDash.daysRemaining}d remaining</p>
            </div>
          </div>
          <div style={{ height:6, background:'rgba(255,255,255,0.1)', borderRadius:999 }}>
            <div style={{ height:'100%', width:wbsDash.contractPct+'%', background:'linear-gradient(90deg,#3b82f6,#06b6d4)', borderRadius:999 }} />
          </div>
        </div>
      )}

      {/* Site Activity Today */}
      <div>
        <SectionHead Icon={MapPin}>Site Activity — Today</SectionHead>
        <div className="pm-grid">
          <KpiCard label="Labour on Site" value={diaryDash?.avgLabourThisMonth ?? 0} sub="Avg this month" color={C.blue} onClick={() => nav("/hr/attendance")} />
          <KpiCard label="Diary Entries" value={diaryDash?.thisMonthEntries ?? 0} sub="This month" color={C.navy} onClick={() => nav('/diary')} />
          <KpiCard label="EOT Claim Days" value={diaryDash?.eotClaimDays ?? 0} sub="Weather delays" color={(diaryDash?.eotClaimDays ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/diary')} />
          <KpiCard label="Hours Lost" value={diaryDash?.hoursLostWeather ?? 0} sub="To weather" color={(diaryDash?.hoursLostWeather ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/diary')} />
        </div>
      </div>

      {/* Schedule */}
      <div>
        <SectionHead Icon={CalendarBlank}>Schedule</SectionHead>
        <div className="pm-grid">
          <KpiCard label="Overall Progress" value={(wbsDash?.overallProgress ?? 0)+'%'} color={C.blue} onClick={() => nav('/wbs')} />
          <KpiCard label="Completed Tasks" value={(wbsDash?.completed ?? 0)+'/'+(wbsDash?.totalTasks ?? 0)} color={C.green} onClick={() => nav('/wbs')} />
          <KpiCard label="Delayed Tasks" value={wbsDash?.delayed ?? 0} color={(wbsDash?.delayed ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/wbs')} />
          <KpiCard label="Milestones Hit" value={(wbsDash?.milestonesHit ?? 0)+'/'+(wbsDash?.milestones ?? 0)} color={C.amber} onClick={() => nav('/wbs')} />
        </div>
      </div>

      {/* Quality */}
      <div>
        <SectionHead Icon={CheckCircle}>Quality &amp; Compliance</SectionHead>
        <div className="pm-grid">
          <KpiCard label="QA Pass Rate" value={(qaDash?.passRate ?? '0')+'%'} color={C.green} onClick={() => nav('/qa')} />
          <KpiCard label="Inspections" value={qaDash?.totalInspections ?? 0} color={C.blue} onClick={() => nav('/qa')} />
          <KpiCard label="Open NCRs" value={qaDash?.openNcrs ?? 0} color={(qaDash?.openNcrs ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/qa')} />
          <KpiCard label="Overdue Actions" value={meetDash?.overdueActions ?? 0} color={(meetDash?.overdueActions ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/meetings')} />
        </div>
      </div>

      {/* HR */}
      <div>
        <SectionHead Icon={HardHat}>Human Resources</SectionHead>
        <div className="pm-grid">
          <KpiCard label="Total Employees" value={hrDash?.totalEmployees ?? 0} color={C.blue} onClick={() => nav('/hr/employees')} />
          <KpiCard label="Present Today" value={hrDash?.presentToday ?? 0} color={C.green} onClick={() => nav('/hr/attendance')} />
          <KpiCard label="Absent Today" value={hrDash?.absentToday ?? 0} color={(hrDash?.absentToday ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/hr/attendance')} />
          <KpiCard label="Pending Salary" value={hrDash?.pendingSalary ?? 0} color={(hrDash?.pendingSalary ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/hr/salary')} />
        </div>
      </div>

      {/* Financial */}
      <div>
        <SectionHead Icon={CurrencyInr}>Financial</SectionHead>
        <div className="pm-grid">
          <KpiCard label="Total Expenses" value={fmtL(accDash?.totalExpenses ?? 0)} color={C.text1} onClick={() => nav('/accounting')} />
          <KpiCard label="Pending Payment" value={fmtL(accDash?.totalPending ?? 0)} color={(accDash?.totalPending ?? 0) > 0 ? C.amber : C.green} onClick={() => nav('/accounting')} />
          <KpiCard label="TDS Liability" value={fmtL(accDash?.tdsLiability ?? 0)} color={(accDash?.tdsLiability ?? 0) > 0 ? C.red : C.green} onClick={() => nav('/accounting')} />
          <KpiCard label="Open Tasks" value={taskDash?.inProgress ?? 0} sub="In progress" color={C.blue} onClick={() => nav('/tasks')} />
        </div>
      </div>

      {/* Tasks overdue */}
      {(taskDash?.overdue ?? 0) > 0 && (
        <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'#b91c1c', margin:'0 0 2px', display:'flex', alignItems:'center', gap:6 }}><Warning size={15} weight="fill"/> {taskDash?.overdue} Overdue Tasks</p>
            <p style={{ fontSize:12, color:'#dc2626', margin:0 }}>Tasks past due date — requires immediate attention</p>
          </div>
          <button onClick={() => nav('/tasks')}
            style={{ padding:'8px 16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            View Tasks →
          </button>
        </div>
      )}
    </div>
  )
}

const fs   = require('fs')
const path = require('path')

const jhaPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'jha', 'JHAPage.tsx'
)

const content = `import { useState, useEffect, useRef } from 'react'
import { Chart, ArcElement, DoughnutController, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'
import { settingsApi } from '@/api/settings.api'
import { CheckCircle, Star, Trophy, ArrowRight, FileText, Warning } from '@phosphor-icons/react'

Chart.register(ArcElement, DoughnutController, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

const PARAMS = [
  { id:'I',    key:'jha.param_1', label:'Utilization of UWTP',              max:50,   mandatory:'4-star', color:'#378ADD', group:'4star',
    description:'Actual inflow vs design capacity for assessment year',
    subItems:[
      { id:'1a', label:'Inflow >75% of design capacity', marks:50 },
      { id:'1b', label:'Inflow 50–75% of design capacity', marks:30 },
      { id:'1c', label:'Inflow <50% of design capacity', marks:20 },
    ],
    docs:['Logbooks/flow records (6 months)','DPR with design capacity','Flow meter calibration'],
    note:'Construction phase — not yet applicable. Relevant from O&M year 1.',
  },
  { id:'II',   key:'jha.param_2', label:'UWTP Unit Operations',              max:85,   mandatory:'3-star', color:'#1D9E75', group:'3star',
    description:'Operational status of all treatment modules',
    subItems:[
      { id:'2a', label:'All primary treatment modules working (screens, grit, clarifier)', marks:15 },
      { id:'2b', label:'SBR C-Tech biological treatment fully operational', marks:20 },
      { id:'2c', label:'Tertiary treatment (PSF + ACF) operational', marks:10 },
      { id:'2d', label:'Disinfection (chlorination) present and working', marks:15 },
      { id:'2e', label:'All electromechanical equipment working', marks:17.5 },
      { id:'2f', label:'Standby E/M equipment available', marks:7.5 },
    ],
    docs:['3–4 min video of all unit ops','Process flow diagram','P&ID','Equipment list','O&M manual','Calibration certs'],
    note:'Design complete. BEP R3 submitted 16-Mar-2026. Awaiting UEED approval.',
  },
  { id:'III',  key:'jha.param_3', label:'Monitoring Mechanism (SCADA/OCEMS)', max:50,   mandatory:'4-star', color:'#378ADD', group:'4star',
    description:'Online monitoring via SCADA and OCEMS',
    subItems:[
      { id:'3a', label:'SCADA system with Read & Write capability', marks:10 },
      { id:'3b', label:'SCADA controls all treatment stages', marks:12.5 },
      { id:'3c', label:'OCEMS integrated and operational', marks:10 },
      { id:'3d', label:'OCEMS monitors COD, TSS, TN, DO, pH', marks:12.5 },
      { id:'3e', label:'OCEMS data transmitted to CPCB/PCB server', marks:5 },
    ],
    docs:['SCADA reports (3 months)','Dashboard screenshot','OCEMS reports (6 months)'],
    note:'SCADA included in BEP. OCEMS to be integrated during commissioning.',
  },
  { id:'IV',   key:'jha.param_4', label:'Compliance with Discharge Standards', max:90,  mandatory:'3-star', color:'#1D9E75', group:'3star',
    description:'Treated effluent meets BOD, COD, TSS, TN, TP, FC norms',
    subItems:[
      { id:'4a', label:'BOD meets discharge norms', marks:10 },
      { id:'4b', label:'COD meets discharge norms', marks:10 },
      { id:'4c', label:'TSS meets discharge norms', marks:7.5 },
      { id:'4d', label:'Total Nitrogen (TN) meets norms', marks:7.5 },
      { id:'4e', label:'Total Phosphorus (TP) meets norms', marks:7.5 },
      { id:'4f', label:'Faecal Coliform (FC) meets norms', marks:7.5 },
      { id:'4g', label:'Functional in-house laboratory with qualified staff', marks:20 },
      { id:'4h', label:'Third-party NABL/ISO testing — monthly', marks:20 },
    ],
    docs:['Lab video','Logbooks','3 months NABL test reports','Standards followed'],
    note:'Lab design in BEP. To be established at commissioning.',
  },
  { id:'V',    key:'jha.param_5', label:'Safety & Cleanliness',               max:67.5, mandatory:'3-star', color:'#1D9E75', group:'3star',
    description:'PPE, safety drills, gas detection, medical insurance, cleanliness',
    subItems:[
      { id:'5a', label:'Firefighting equipment, fire exits & assembly points', marks:7.5 },
      { id:'5b', label:'Unit labelling, floor markings, ATEX area marking', marks:10 },
      { id:'5c', label:'Quality PPE used by all personnel', marks:10 },
      { id:'5d', label:'Safety drills conducted regularly', marks:5 },
      { id:'5e', label:'Functional gas detection systems', marks:10 },
      { id:'5f', label:'Periodic medical check-ups for all staff', marks:5 },
      { id:'5g', label:'Medical and life insurance for all staff', marks:5 },
      { id:'5h', label:'Functional washrooms for male and female workers', marks:5 },
      { id:'5i', label:'Flood management measures deployed', marks:5 },
      { id:'5j', label:'General cleanliness of UWTP', marks:5 },
    ],
    docs:['Safety deployment report','HFL marking photo','ATEX photos','PPE records','Training photos','Medical camp report','Insurance certs'],
    note:'STP site at Ishber Nishat — confirm above HFL. Safety plan to be part of O&M manual.',
  },
  { id:'VI',   key:'jha.param_6', label:'Human Resources',                    max:50,   mandatory:'3-star', color:'#1D9E75', group:'3star',
    description:'Qualified plant manager, operators, lab analyst, training',
    subItems:[
      { id:'6a', label:'Plant Manager deployed as per O&M contract/DPR', marks:20 },
      { id:'6b', label:'Plant Manager & Operator qualifications meet DPR', marks:15 },
      { id:'6c', label:'Qualified Lab Analyst appointed', marks:5 },
      { id:'6d', label:'Training conducted at least quarterly', marks:10 },
    ],
    docs:['Staff list with qualifications','Attendance register (1 month)','Training calendar','Training photos'],
    note:'Gowhar Shah (PM) authorized. O&M staffing plan to be finalized with UEED.',
  },
  { id:'VII',  key:'jha.param_7', label:'Reuse of Treated Water & Biosolids',  max:62.5, mandatory:'5-star', color:'#D85A30', group:'5star',
    description:'Treated water reuse percentage and revenue from water/biosolid sales',
    subItems:[
      { id:'7a', label:'Treated water being reused (construction/agriculture/industrial)', marks:20 },
      { id:'7b', label:'Quantity of treated water reused (% of actual flow)', marks:15 },
      { id:'7c', label:'Biosolids conditioned before disposal', marks:5 },
      { id:'7d', label:'Frequency of biosolid testing as per FCO 2014', marks:10 },
      { id:'7e', label:'Monthly revenue from sale of treated water/biosolids', marks:12.5 },
    ],
    docs:['Logbooks + MOU for treated water','Test reports of reused water','Biosolid analysis','Revenue receipts'],
    note:'Dal Lake context — treated water for horticulture along Dal Lake boulevard. MoU with LCMA needed.',
  },
  { id:'VIII', key:'jha.param_8', label:'Alternate Power & Renewable Energy',  max:30,   mandatory:'5-star', color:'#D85A30', group:'5star',
    description:'DG set backup and solar/biogas renewable energy',
    subItems:[
      { id:'8a', label:'Supplementary power source (DG set) present', marks:20 },
      { id:'8b', label:'Renewable energy (solar/biogas) offsetting UWTP energy', marks:15 },
    ],
    docs:['Photos of DG/renewable equipment','Electricity bills (3 months)','Energy offset bills'],
    note:'DG backup included in EPC contract. Solar panels to be planned during O&M.',
  },
  { id:'IX',   key:'jha.param_9', label:'Co-Treatment of Faecal Sludge',        max:5,    mandatory:'5-star', color:'#D85A30', group:'5star',
    description:'Faecal sludge co-treatment facility within UWTP premises',
    subItems:[
      { id:'9a', label:'Faecal sludge co-treatment facility operational', marks:5 },
    ],
    docs:['Logbook of FS received at co-treatment facility'],
    note:'Not in current scope. Can be added as enhancement during O&M phase.',
  },
  { id:'X',    key:'jha.param_10', label:'Innovative Systems',                  max:10,   mandatory:'5-star', color:'#D85A30', group:'5star',
    description:'Remote automation, predictive maintenance, BIS 9100 certification',
    subItems:[
      { id:'10a', label:'Remote automation / predictive maintenance using sensors/AI', marks:5 },
      { id:'10b', label:'Quality management system BIS 9100 certified', marks:5 },
    ],
    docs:['Automation system photos','Reports from automation','BIS certificate'],
    note:'SCADA with remote monitoring planned. BIS certification to target during O&M.',
  },
]

const TOTAL_MAX = 500

function calcStars(scores: Record<string, Record<string, boolean>>) {
  const met = (id: string) => {
    const p = PARAMS.find(x => x.id === id)
    if (!p) return false
    const s = scores[p.key] ?? {}
    return p.subItems.some(item => s[item.id])
  }
  const three = met('II') && met('IV') && met('V') && met('VI')
  const four  = three && met('I') && met('III')
  const five  = four && met('VII') && met('VIII') && met('IX') && met('X')
  return five ? 5 : four ? 4 : three ? 3 : 0
}

function paramScore(p: typeof PARAMS[0], scores: Record<string, Record<string, boolean>>) {
  const s = scores[p.key] ?? {}
  return p.subItems.reduce((sum, item) => sum + (s[item.id] ? item.marks : 0), 0)
}

function totalScore(scores: Record<string, Record<string, boolean>>) {
  return PARAMS.reduce((sum, p) => sum + paramScore(p, scores), 0)
}

const STAR_COLORS: Record<number, string> = { 0:'#9ca3af', 3:'#f59e0b', 4:'#3b82f6', 5:'#10b981' }
const STAR_LABELS: Record<number, string> = {
  0:'Not yet eligible', 3:'3-star — eligible for incentives',
  4:'4-star — enhanced incentive', 5:'5-star — maximum + bonus incentive',
}

export default function JHAPage() {
  const [scores, setScores]     = useState<Record<string, Record<string, boolean>>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)

  const gaugeRef  = useRef<HTMLCanvasElement>(null)
  const radarRef  = useRef<HTMLCanvasElement>(null)
  const gaugeInst = useRef<Chart | null>(null)
  const radarInst = useRef<Chart | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const loaded: Record<string, Record<string, boolean>> = {}
      for (const p of PARAMS) {
        try {
          const res = await settingsApi.get(p.key)
          if (res?.data?.value) loaded[p.key] = JSON.parse(res.data.value)
        } catch {}
      }
      setScores(loaded)
      setLoading(false)
    }
    load()
  }, [])

  // Build charts once
  useEffect(() => {
    if (loading) return
    if (gaugeRef.current && !gaugeInst.current) {
      gaugeInst.current = new Chart(gaugeRef.current, {
        type: 'doughnut',
        data: { datasets: [{ data:[0,TOTAL_MAX], backgroundColor:['#9ca3af','rgba(0,0,0,0.06)'], borderWidth:0, borderRadius:4 }] },
        options: { responsive:true, maintainAspectRatio:true, rotation:-130, circumference:260, cutout:'72%',
          plugins:{ legend:{ display:false }, tooltip:{ enabled:false } } },
      })
    }
    if (radarRef.current && !radarInst.current) {
      radarInst.current = new Chart(radarRef.current, {
        type: 'radar',
        data: {
          labels: PARAMS.map(p => p.id),
          datasets:[{
            label:'Score', data: PARAMS.map(() => 0),
            backgroundColor:'rgba(156,163,175,0.15)', borderColor:'#9ca3af',
            pointBackgroundColor:'#9ca3af', pointRadius:3, borderWidth:2,
          }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false }, tooltip:{ enabled:false } },
          scales:{ r:{ min:0, max:90,
            ticks:{ display:false }, grid:{ color:'rgba(0,0,0,0.08)' },
            pointLabels:{ font:{ size:11 }, color:'#94a3b8' }
          }}
        },
      })
    }
  }, [loading])

  // Update charts on score change
  useEffect(() => {
    if (!gaugeInst.current || !radarInst.current) return
    const score = totalScore(scores)
    const stars = calcStars(scores)
    const col   = STAR_COLORS[stars] || '#9ca3af'
    gaugeInst.current.data.datasets[0].data = [score, TOTAL_MAX - score]
    ;(gaugeInst.current.data.datasets[0] as any).backgroundColor = [col,'rgba(0,0,0,0.06)']
    gaugeInst.current.update()
    radarInst.current.data.datasets[0].data = PARAMS.map(p => paramScore(p, scores))
    ;(radarInst.current.data.datasets[0] as any).backgroundColor = col + '22'
    ;(radarInst.current.data.datasets[0] as any).borderColor = col
    ;(radarInst.current.data.datasets[0] as any).pointBackgroundColor = col
    radarInst.current.update()
  }, [scores])

  function toggle(paramKey: string, itemId: string) {
    setScores(prev => ({
      ...prev,
      [paramKey]: { ...(prev[paramKey] ?? {}), [itemId]: !prev[paramKey]?.[itemId] },
    }))
  }

  async function save() {
    setSaving(true)
    try {
      for (const p of PARAMS) await settingsApi.set(p.key, JSON.stringify(scores[p.key] ?? {}))
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const stars  = calcStars(scores)
  const score  = totalScore(scores)
  const pct    = Math.round((score / TOTAL_MAX) * 100)
  const col    = STAR_COLORS[stars] || '#9ca3af'

  const mandColors: Record<string,{bg:string,text:string}> = {
    '3-star':{ bg:'#fef3c7', text:'#92400e' },
    '4-star':{ bg:'#dbeafe', text:'#1e40af' },
    '5-star':{ bg:'#dcfce7', text:'#166534' },
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:32, height:32, border:'3px solid #2563eb', borderTopColor:'transparent',
        borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Jal Hi AMRIT (JHA) Compliance
          </h1>
          <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>
            AMRUT 2.0 · Clean Water Credits · Star Rating Self-Assessment · 38.5 MLD STP Ishber Nishat
          </p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding:'10px 24px', background: saved ? '#059669' : '#2563eb',
            color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'background 0.2s' }}>
          {saved ? <><CheckCircle size={15}/> Saved!</> : saving ? 'Saving...' : <><Trophy size={15}/> Save Assessment</>}
        </button>
      </div>

      {/* Top metrics row */}
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16 }}>

        {/* Gauge + stars */}
        <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:16,
          padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
            letterSpacing:'0.08em', margin:0 }}>
            Clean Water Credits Rating
          </p>
          <div style={{ position:'relative', width:200 }}>
            <canvas ref={gaugeRef} role='img' aria-label={'JHA score ' + score + ' out of 500'} />
            <div style={{ position:'absolute', top:'55%', left:'50%', transform:'translate(-50%,-50%)',
              textAlign:'center' }}>
              <p style={{ fontSize:32, fontWeight:800, color:col, margin:0, lineHeight:1 }}>
                {Math.round(score)}
              </p>
              <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>/ {TOTAL_MAX}</p>
            </div>
          </div>
          <div style={{ fontSize:28, letterSpacing:4 }}>
            {'★'.repeat(stars).split('').map((s,i) => (
              <span key={i} style={{ color:col }}>{s}</span>
            ))}
            {'☆'.repeat(5 - stars).split('').map((s,i) => (
              <span key={i} style={{ color:'#e2e8f0' }}>{s}</span>
            ))}
          </div>
          <p style={{ fontSize:12, fontWeight:700, color:col, margin:0, textAlign:'center' }}>
            {STAR_LABELS[stars]}
          </p>
          <div style={{ width:'100%', height:6, background:'#e2e8f0', borderRadius:99 }}>
            <div style={{ height:'100%', borderRadius:99, background:col,
              width:pct+'%', transition:'width 0.6s' }} />
          </div>
          <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{pct}% of maximum score</p>
        </div>

        {/* Right: radar + tier cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Radar */}
          <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:16,
            padding:'16px 20px', flex:1 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
              letterSpacing:'0.06em', margin:'0 0 12px' }}>
              Parameter Radar
            </p>
            <div style={{ position:'relative', height:160 }}>
              <canvas ref={radarRef} role='img' aria-label='Radar chart of JHA parameter scores' />
            </div>
          </div>

          {/* Tier cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { s:3, params:'II, IV, V, VI', col:'#f59e0b', bg:'#fffbeb', border:'#fde68a', label:'3-star incentive' },
              { s:4, params:'I, II, III, IV, V, VI', col:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', label:'4-star enhanced' },
              { s:5, params:'All I–X', col:'#10b981', bg:'#f0fdf4', border:'#bbf7d0', label:'5-star max + bonus' },
            ].map(t => {
              const achieved = stars >= t.s
              return (
                <div key={t.s} style={{ padding:'12px 14px', borderRadius:12,
                  background: achieved ? t.bg : '#f8fafc',
                  border: \`1.5px solid \${achieved ? t.border : '#e2e8f0'}\` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ color: achieved ? t.col : '#d1d5db', fontSize:14 }}>
                      {'★'.repeat(t.s)}
                    </span>
                    {achieved && <CheckCircle size={13} color={t.col} weight='fill' />}
                  </div>
                  <p style={{ fontSize:11, fontWeight:700, color: achieved ? t.col : '#94a3b8', margin:'0 0 2px' }}>
                    {t.label}
                  </p>
                  <p style={{ fontSize:10, color:'#94a3b8', margin:0 }}>{t.params}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Parameter rows */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
          letterSpacing:'0.06em', margin:0 }}>
          10 Parameters — click to expand and mark items
        </p>

        {PARAMS.map(param => {
          const pScore   = paramScore(param, scores)
          const pPct     = Math.round((pScore / param.maxMarks) * 100)
          const isMet    = pPct >= 60
          const isOpen   = expanded === param.id
          const mc       = mandColors[param.mandatory] || mandColors['5-star']
          const s        = scores[param.key] ?? {}

          return (
            <div key={param.id} style={{ background:'#fff',
              border: \`1.5px solid \${isMet ? '#bbf7d0' : '#e2e8f0'}\`,
              borderRadius:14, overflow:'hidden' }}>

              {/* Row header */}
              <div onClick={() => setExpanded(isOpen ? null : param.id)}
                style={{ padding:'14px 18px', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:12,
                  background: isOpen ? '#f8fafc' : '#fff' }}>

                {/* Status dot */}
                <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0,
                  background: isMet ? '#10b981' : pPct > 0 ? '#f59e0b' : '#e2e8f0' }} />

                {/* Code badge */}
                <span style={{ fontSize:10, fontWeight:800, color:'#fff', padding:'2px 8px',
                  borderRadius:99, background:'#1a2540', flexShrink:0 }}>
                  P-{param.id}
                </span>

                {/* Title */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as any }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{param.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                      background:mc.bg, color:mc.text }}>
                      {param.mandatory} mandatory
                    </span>
                  </div>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0' }}>{param.description}</p>
                </div>

                {/* Progress bar + score */}
                <div style={{ flexShrink:0, textAlign:'right' as any, minWidth:120 }}>
                  <p style={{ fontSize:14, fontWeight:800, margin:'0 0 4px',
                    color: isMet ? '#10b981' : pPct > 0 ? '#f59e0b' : '#94a3b8' }}>
                    {Math.round(pScore)}
                    <span style={{ fontSize:11, color:'#94a3b8', fontWeight:400 }}>/{param.maxMarks}</span>
                  </p>
                  <div style={{ width:100, height:4, background:'#f1f5f9', borderRadius:99, marginLeft:'auto' }}>
                    <div style={{ height:'100%', borderRadius:99, transition:'width 0.4s',
                      width: pPct + '%',
                      background: isMet ? '#10b981' : pPct > 0 ? '#f59e0b' : '#e2e8f0' }} />
                  </div>
                </div>

                <span style={{ color:'#94a3b8', fontSize:18, flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ borderTop:'1px solid #f1f5f9', padding:'16px 18px 20px' }}>

                  {/* Status note */}
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8,
                    padding:'8px 12px', marginBottom:14, display:'flex', gap:8 }}>
                    <Warning size={13} color='#d97706' weight='fill' style={{ flexShrink:0, marginTop:1 }} />
                    <p style={{ fontSize:12, color:'#92400e', margin:0 }}>{param.note}</p>
                  </div>

                  {/* Sub-items */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                    {param.subItems.map(item => {
                      const checked = !!s[item.id]
                      return (
                        <div key={item.id} onClick={() => toggle(param.key, item.id)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                            borderRadius:8, cursor:'pointer', transition:'all 0.15s',
                            background: checked ? '#f0fdf4' : '#f8fafc',
                            border: \`1px solid \${checked ? '#bbf7d0' : '#e2e8f0'}\` }}>
                          <div style={{ width:18, height:18, borderRadius:4, flexShrink:0,
                            background: checked ? '#10b981' : '#fff',
                            border: \`2px solid \${checked ? '#10b981' : '#d1d5db'}\`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontSize:11, fontWeight:800 }}>
                            {checked && '✓'}
                          </div>
                          <span style={{ flex:1, fontSize:12, color: checked ? '#166534' : '#475569',
                            fontWeight: checked ? 600 : 400 }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize:11, fontWeight:700, flexShrink:0,
                            color: checked ? '#10b981' : '#94a3b8' }}>
                            +{item.marks}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Docs */}
                  <div>
                    <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                      letterSpacing:'0.06em', margin:'0 0 6px' }}>Documents Required</p>
                    <div style={{ display:'flex', flexWrap:'wrap' as any, gap:6 }}>
                      {param.docs.map((doc, i) => (
                        <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:99,
                          background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0',
                          display:'flex', alignItems:'center', gap:4 }}>
                          <FileText size={10} />
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* JHA info */}
      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'14px 18px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#1d4ed8', margin:'0 0 4px' }}>
          About Jal Hi AMRIT (JHA) — AMRUT 2.0 · MoHUA
        </p>
        <p style={{ fontSize:12, color:'#3b82f6', margin:0, lineHeight:1.7 }}>
          ₹1,300 crore earmarked (₹600 cr for 2024–25, ₹700 cr for 2025–26) · First-come-first-serve basis ·
          3+ stars eligible · Incentive: 70% upfront + 30% after 6 months ·
          5-star maintained for 1 year = additional incentive ·
          Contact: jha@asci.org.in · Portal: amrut.mohua.gov.in
        </p>
      </div>

    </div>
  )
}
`

fs.writeFileSync(jhaPath, content)
console.log('✅ JHAPage.tsx — complete redesign with Chart.js gauge + radar')
console.log('')
console.log('Features:')
console.log('  ✓ Doughnut gauge showing score out of 500 with color-coded needle')
console.log('  ✓ Radar chart showing all 10 parameter scores')
console.log('  ✓ 3-star / 4-star / 5-star tier cards with achieved state')
console.log('  ✓ Parameter rows with progress bars — click to expand')
console.log('  ✓ Sub-item checkboxes with marks (+5, +10, +20 etc)')
console.log('  ✓ Documents required tags')
console.log('  ✓ Construction phase status notes')
console.log('  ✓ Charts update live as you tick items')
console.log('  ✓ Save button persists to settings API')

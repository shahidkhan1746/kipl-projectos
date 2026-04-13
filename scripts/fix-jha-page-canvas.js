const fs   = require('fs')
const path = require('path')

const jhaPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'jha', 'JHAPage.tsx'
)

// Check what charting libs are actually installed
const pkgPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'package.json'
)
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const deps = { ...pkg.dependencies, ...pkg.devDependencies }
console.log('Installed chart-related packages:')
Object.keys(deps).filter(k => k.includes('chart') || k.includes('recharts') || k.includes('d3') || k.includes('apexchart') || k.includes('echarts')).forEach(k => console.log(' ', k, deps[k]))

const content = `import { useState, useEffect, useRef } from 'react'
import { settingsApi } from '@/api/settings.api'
import { CheckCircle, FileText, Warning, Trophy } from '@phosphor-icons/react'

const PARAMS = [
  { id:'I',    key:'jha.param_1', label:'Utilization of UWTP',               max:50,   mandatory:'4-star', color:'#378ADD',
    description:'Actual inflow vs design capacity for assessment year',
    subItems:[
      { id:'1a', label:'Inflow >75% of design capacity for assessment year', marks:50 },
      { id:'1b', label:'Inflow 50–75% of design capacity', marks:30 },
      { id:'1c', label:'Inflow <50% of design capacity', marks:20 },
    ],
    docs:['Logbooks/flow records (6 months)','DPR with design capacity','Flow meter calibration'],
    note:'Construction phase — not yet applicable. Relevant from O&M year 1.',
  },
  { id:'II',   key:'jha.param_2', label:'UWTP Unit Operations',               max:85,   mandatory:'3-star', color:'#1D9E75',
    description:'Operational status of all treatment modules',
    subItems:[
      { id:'2a', label:'All primary treatment modules working (screens, grit, clarifier)', marks:15 },
      { id:'2b', label:'SBR C-Tech biological treatment fully operational', marks:20 },
      { id:'2c', label:'Tertiary treatment (PSF + ACF) operational', marks:10 },
      { id:'2d', label:'Disinfection (chlorination) present and working', marks:15 },
      { id:'2e', label:'All electromechanical equipment working', marks:17.5 },
      { id:'2f', label:'Standby E/M equipment available', marks:7.5 },
    ],
    docs:['3–4 min video of all unit ops','Process flow diagram','P&ID','Equipment list','O&M manual'],
    note:'Design complete. BEP R3 submitted 16-Mar-2026. Awaiting UEED approval.',
  },
  { id:'III',  key:'jha.param_3', label:'Monitoring Mechanism (SCADA/OCEMS)', max:50,   mandatory:'4-star', color:'#378ADD',
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
  { id:'IV',   key:'jha.param_4', label:'Compliance with Discharge Standards', max:90,  mandatory:'3-star', color:'#1D9E75',
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
    docs:['Lab video','Logbooks','3 months NABL test reports'],
    note:'Lab design in BEP. To be established at commissioning.',
  },
  { id:'V',    key:'jha.param_5', label:'Safety & Cleanliness',                max:67.5, mandatory:'3-star', color:'#1D9E75',
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
    docs:['Safety deployment report','HFL marking photo','ATEX photos','PPE records','Training photos'],
    note:'STP site at Ishber Nishat — confirm above HFL. Safety plan to be part of O&M manual.',
  },
  { id:'VI',   key:'jha.param_6', label:'Human Resources',                    max:50,   mandatory:'3-star', color:'#1D9E75',
    description:'Qualified plant manager, operators, lab analyst, training',
    subItems:[
      { id:'6a', label:'Plant Manager deployed as per O&M contract/DPR', marks:20 },
      { id:'6b', label:'Plant Manager & Operator qualifications meet DPR', marks:15 },
      { id:'6c', label:'Qualified Lab Analyst appointed', marks:5 },
      { id:'6d', label:'Training conducted at least quarterly', marks:10 },
    ],
    docs:['Staff list with qualifications','Attendance register (1 month)','Training calendar'],
    note:'Gowhar Shah (PM) authorized. O&M staffing plan to be finalized with UEED.',
  },
  { id:'VII',  key:'jha.param_7', label:'Reuse of Treated Water & Biosolids',  max:62.5, mandatory:'5-star', color:'#D85A30',
    description:'Treated water reuse percentage and revenue from water/biosolid sales',
    subItems:[
      { id:'7a', label:'Treated water being reused (construction/agriculture/industrial)', marks:20 },
      { id:'7b', label:'Quantity of treated water reused (% of actual flow)', marks:15 },
      { id:'7c', label:'Biosolids conditioned before disposal', marks:5 },
      { id:'7d', label:'Frequency of biosolid testing as per FCO 2014', marks:10 },
      { id:'7e', label:'Monthly revenue from sale of treated water/biosolids', marks:12.5 },
    ],
    docs:['Logbooks + MOU for treated water','Test reports of reused water','Biosolid analysis'],
    note:'Dal Lake context — treated water for horticulture along Dal Lake boulevard.',
  },
  { id:'VIII', key:'jha.param_8', label:'Alternate Power & Renewable Energy',  max:30,   mandatory:'5-star', color:'#D85A30',
    description:'DG set backup and solar/biogas renewable energy',
    subItems:[
      { id:'8a', label:'Supplementary power source (DG set) present', marks:20 },
      { id:'8b', label:'Renewable energy (solar/biogas) offsetting UWTP energy', marks:15 },
    ],
    docs:['Photos of DG/renewable equipment','Electricity bills (3 months)'],
    note:'DG backup included in EPC contract. Solar panels to be planned during O&M.',
  },
  { id:'IX',   key:'jha.param_9', label:'Co-Treatment of Faecal Sludge',        max:5,    mandatory:'5-star', color:'#D85A30',
    description:'Faecal sludge co-treatment facility within UWTP premises',
    subItems:[{ id:'9a', label:'Faecal sludge co-treatment facility operational', marks:5 }],
    docs:['Logbook of FS received at co-treatment facility'],
    note:'Not in current scope. Can be added as enhancement during O&M phase.',
  },
  { id:'X',    key:'jha.param_10', label:'Innovative Systems',                  max:10,   mandatory:'5-star', color:'#D85A30',
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

// ── Draw doughnut gauge using plain canvas API ────────────────────────────────
function drawGauge(canvas: HTMLCanvasElement, score: number, max: number, color: string) {
  const ctx  = canvas.getContext('2d')
  if (!ctx) return
  const dpr  = window.devicePixelRatio || 1
  const W    = canvas.offsetWidth  || 200
  const H    = canvas.offsetHeight || 140
  canvas.width  = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const cx    = W / 2
  const cy    = H * 0.72
  const r     = Math.min(W, H * 1.3) * 0.42
  const start = Math.PI * 1.15
  const end   = Math.PI * 1.85
  const pct   = score / max
  const sweep = end - start

  // Track bg
  ctx.beginPath()
  ctx.arc(cx, cy, r, start, end)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth   = 14
  ctx.lineCap     = 'round'
  ctx.stroke()

  // Track fill
  if (pct > 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, start, start + sweep * pct)
    ctx.strokeStyle = color
    ctx.lineWidth   = 14
    ctx.lineCap     = 'round'
    ctx.stroke()
  }

  // Inner tick marks (subtle)
  for (let i = 0; i <= 10; i++) {
    const angle = start + sweep * (i / 10)
    const x1 = cx + (r - 18) * Math.cos(angle)
    const y1 = cy + (r - 18) * Math.sin(angle)
    const x2 = cx + (r - 22) * Math.cos(angle)
    const y2 = cy + (r - 22) * Math.sin(angle)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth   = 1
    ctx.stroke()
  }

  // Score text
  ctx.fillStyle   = color
  ctx.font        = \`bold \${Math.round(r * 0.52)}px -apple-system, sans-serif\`
  ctx.textAlign   = 'center'
  ctx.textBaseline= 'middle'
  ctx.fillText(String(Math.round(score)), cx, cy - 4)

  // "/" max
  ctx.fillStyle   = '#94a3b8'
  ctx.font        = \`\${Math.round(r * 0.26)}px -apple-system, sans-serif\`
  ctx.fillText('/ ' + max, cx, cy + r * 0.34)
}

// ── Draw radar chart using plain canvas API ───────────────────────────────────
function drawRadar(canvas: HTMLCanvasElement, scores: Record<string, Record<string, boolean>>, color: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const W   = canvas.offsetWidth  || 220
  const H   = canvas.offsetHeight || 220
  canvas.width  = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const cx  = W / 2
  const cy  = H / 2
  const r   = Math.min(W, H) * 0.38
  const n   = PARAMS.length
  const angles = PARAMS.map((_, i) => (Math.PI * 2 * i / n) - Math.PI / 2)

  // Grid rings
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath()
    angles.forEach((a, i) => {
      const x = cx + (r * ring / 4) * Math.cos(a)
      const y = cy + (r * ring / 4) * Math.sin(a)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth   = 0.5
    ctx.stroke()
  }

  // Spokes
  angles.forEach(a => {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth   = 0.5
    ctx.stroke()
  })

  // Data polygon
  const vals = PARAMS.map(p => {
    const ps = paramScore(p, scores)
    return ps / p.max
  })

  ctx.beginPath()
  vals.forEach((v, i) => {
    const x = cx + r * v * Math.cos(angles[i])
    const y = cy + r * v * Math.sin(angles[i])
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle   = color + '33'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth   = 2
  ctx.stroke()

  // Dots
  vals.forEach((v, i) => {
    const x = cx + r * v * Math.cos(angles[i])
    const y = cy + r * v * Math.sin(angles[i])
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  })

  // Labels
  ctx.fillStyle    = '#94a3b8'
  ctx.font         = \`bold \${Math.round(r * 0.18)}px -apple-system, sans-serif\`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  PARAMS.forEach((p, i) => {
    const labelR = r + 14
    const x = cx + labelR * Math.cos(angles[i])
    const y = cy + labelR * Math.sin(angles[i])
    ctx.fillText(p.id, x, y)
  })
}

const STAR_COLORS: Record<number, string> = { 0:'#94a3b8', 3:'#f59e0b', 4:'#3b82f6', 5:'#10b981' }
const STAR_LABELS: Record<number, string> = {
  0:'Not yet eligible',
  3:'3-star — eligible for Clean Water Credits incentive',
  4:'4-star — enhanced incentive',
  5:'5-star — maximum + bonus incentive',
}

export default function JHAPage() {
  const [scores, setScores]     = useState<Record<string, Record<string, boolean>>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)
  const gaugeRef = useRef<HTMLCanvasElement>(null)
  const radarRef = useRef<HTMLCanvasElement>(null)

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

  useEffect(() => {
    if (loading) return
    const score = totalScore(scores)
    const col   = STAR_COLORS[calcStars(scores)] || '#94a3b8'
    if (gaugeRef.current) drawGauge(gaugeRef.current, score, TOTAL_MAX, col)
    if (radarRef.current) drawRadar(radarRef.current, scores, col)
  }, [scores, loading])

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

  const stars = calcStars(scores)
  const score = totalScore(scores)
  const pct   = Math.round((score / TOTAL_MAX) * 100)
  const col   = STAR_COLORS[stars] || '#94a3b8'

  const mandColors: Record<string, { bg: string; text: string }> = {
    '3-star': { bg:'#fef3c7', text:'#92400e' },
    '4-star': { bg:'#dbeafe', text:'#1e40af' },
    '5-star': { bg:'#dcfce7', text:'#166534' },
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:32, height:32, border:'3px solid #2563eb',
        borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
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
            AMRUT 2.0 · Clean Water Credits · Star Rating · 38.5 MLD STP Ishber Nishat, Srinagar
          </p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding:'10px 24px', background: saved ? '#059669' : '#2563eb',
            color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
          {saved ? <><CheckCircle size={15}/> Saved!</> : saving ? 'Saving...' : <><Trophy size={15}/> Save Assessment</>}
        </button>
      </div>

      {/* Top row: Gauge + Radar + Tiers */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 220px 1fr', gap:16 }}>

        {/* Gauge */}
        <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:16,
          padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
            letterSpacing:'0.08em', margin:0 }}>Score Meter</p>
          <canvas ref={gaugeRef} style={{ width:'100%', height:130 }}
            role='img' aria-label={'JHA score ' + Math.round(score) + ' out of 500'} />
          <div style={{ fontSize:22, letterSpacing:3 }}>
            {Array.from({ length:5 }).map((_, i) => (
              <span key={i} style={{ color: i < stars ? col : '#e2e8f0' }}>★</span>
            ))}
          </div>
          <p style={{ fontSize:11, fontWeight:700, color:col, margin:0, textAlign:'center' as any,
            lineHeight:1.4 }}>
            {STAR_LABELS[stars]}
          </p>
          <div style={{ width:'100%', height:5, background:'#e2e8f0', borderRadius:99 }}>
            <div style={{ height:'100%', borderRadius:99, background:col,
              width:pct + '%', transition:'width 0.6s' }} />
          </div>
          <p style={{ fontSize:10, color:'#94a3b8', margin:0 }}>{pct}% of 500 marks</p>
        </div>

        {/* Radar */}
        <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:16,
          padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
            letterSpacing:'0.08em', margin:0 }}>Parameter Radar</p>
          <canvas ref={radarRef} style={{ width:188, height:188 }}
            role='img' aria-label='Radar of JHA parameter scores' />
        </div>

        {/* Tier cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { s:3, params:'II, IV, V, VI mandatory', col:'#f59e0b', bg:'#fffbeb', border:'#fde68a', label:'3-star — eligible for incentives' },
            { s:4, params:'I, II, III, IV, V, VI mandatory', col:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', label:'4-star — enhanced incentive' },
            { s:5, params:'All I–X mandatory', col:'#10b981', bg:'#f0fdf4', border:'#bbf7d0', label:'5-star — maximum + bonus' },
          ].map(t => {
            const achieved = stars >= t.s
            return (
              <div key={t.s} style={{ flex:1, padding:'12px 16px', borderRadius:12,
                background: achieved ? t.bg : '#f8fafc',
                border: \`1.5px solid \${achieved ? t.border : '#e2e8f0'}\`,
                display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:18, color: achieved ? t.col : '#e2e8f0', flexShrink:0 }}>
                  {'★'.repeat(t.s)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12, fontWeight:700, color: achieved ? t.col : '#94a3b8', margin:'0 0 2px' }}>
                    {t.label}
                  </p>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{t.params}</p>
                </div>
                {achieved && <CheckCircle size={16} color={t.col} weight='fill' />}
              </div>
            )
          })}
          <div style={{ padding:'10px 16px', borderRadius:12, background:'#eff6ff',
            border:'1.5px solid #bfdbfe' }}>
            <p style={{ fontSize:11, color:'#3b82f6', margin:0, lineHeight:1.5 }}>
              ₹1,300 cr earmarked · 70% upfront + 30% after 6 months ·
              Contact: jha@asci.org.in
            </p>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
          letterSpacing:'0.06em', margin:0 }}>
          10 Parameters — click to expand and mark items
        </p>

        {PARAMS.map(param => {
          const pScore = paramScore(param, scores)
          const pPct   = Math.round((pScore / param.maxMarks) * 100)
          const isMet  = pPct >= 60
          const isOpen = expanded === param.id
          const mc     = mandColors[param.mandatory] || mandColors['5-star']
          const s      = scores[param.key] ?? {}

          return (
            <div key={param.id} style={{ background:'#fff',
              border: \`1.5px solid \${isMet ? '#bbf7d0' : '#e2e8f0'}\`,
              borderRadius:12, overflow:'hidden' }}>

              <div onClick={() => setExpanded(isOpen ? null : param.id)}
                style={{ padding:'13px 16px', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:10,
                  background: isOpen ? '#f8fafc' : '#fff' }}>

                <div style={{ width:9, height:9, borderRadius:'50%', flexShrink:0,
                  background: isMet ? '#10b981' : pPct > 0 ? '#f59e0b' : '#e2e8f0' }} />

                <span style={{ fontSize:10, fontWeight:800, color:'#fff', padding:'2px 7px',
                  borderRadius:99, background:'#1a2540', flexShrink:0 }}>
                  P-{param.id}
                </span>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' as any }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{param.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99,
                      background:mc.bg, color:mc.text }}>
                      {param.mandatory}
                    </span>
                  </div>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'1px 0 0' }}>{param.description}</p>
                </div>

                <div style={{ flexShrink:0, textAlign:'right' as any }}>
                  <p style={{ fontSize:13, fontWeight:800, margin:'0 0 3px',
                    color: isMet ? '#10b981' : pPct > 0 ? '#f59e0b' : '#94a3b8' }}>
                    {Math.round(pScore)}
                    <span style={{ fontSize:10, color:'#94a3b8', fontWeight:400 }}>/{param.maxMarks}</span>
                  </p>
                  <div style={{ width:90, height:3, background:'#f1f5f9', borderRadius:99 }}>
                    <div style={{ height:'100%', borderRadius:99, transition:'width 0.4s',
                      width:pPct+'%',
                      background: isMet ? '#10b981' : pPct > 0 ? '#f59e0b' : '#e2e8f0' }} />
                  </div>
                </div>

                <span style={{ color:'#94a3b8', fontSize:12, flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ borderTop:'1px solid #f1f5f9', padding:'14px 16px 18px' }}>
                  <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8,
                    padding:'7px 11px', marginBottom:12, display:'flex', gap:7 }}>
                    <Warning size={12} color='#d97706' weight='fill' style={{ flexShrink:0, marginTop:1 }} />
                    <p style={{ fontSize:11, color:'#92400e', margin:0 }}>{param.note}</p>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                    {param.subItems.map(item => {
                      const checked = !!s[item.id]
                      return (
                        <div key={item.id} onClick={() => toggle(param.key, item.id)}
                          style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px',
                            borderRadius:8, cursor:'pointer', transition:'all 0.12s',
                            background: checked ? '#f0fdf4' : '#f8fafc',
                            border: \`1px solid \${checked ? '#bbf7d0' : '#e2e8f0'}\` }}>
                          <div style={{ width:16, height:16, borderRadius:3, flexShrink:0,
                            background: checked ? '#10b981' : '#fff',
                            border: \`2px solid \${checked ? '#10b981' : '#d1d5db'}\`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontSize:10, fontWeight:800 }}>
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

                  <div>
                    <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8',
                      textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 5px' }}>
                      Documents Required
                    </p>
                    <div style={{ display:'flex', flexWrap:'wrap' as any, gap:5 }}>
                      {param.docs.map((doc, i) => (
                        <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:99,
                          background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0',
                          display:'flex', alignItems:'center', gap:3 }}>
                          <FileText size={9} />{doc}
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
    </div>
  )
}
`

fs.writeFileSync(jhaPath, content)
console.log('✅ JHAPage.tsx — rewritten using pure canvas API (no chart.js import)')
console.log('   ✓ Doughnut gauge drawn with canvas arc')
console.log('   ✓ Radar chart drawn with canvas polygon')
console.log('   ✓ No external chart library needed')
console.log('   ✓ Both update live as you tick checkboxes')

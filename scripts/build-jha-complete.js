const fs   = require('fs')
const path = require('path')

const SRC     = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src')
const SCRIPTS = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'scripts')

// ── 1. JHA Page ───────────────────────────────────────────────────────────────
const JHA_PAGE_DIR = path.join(SRC, 'pages', 'jha')
if (!fs.existsSync(JHA_PAGE_DIR)) fs.mkdirSync(JHA_PAGE_DIR, { recursive: true })

fs.writeFileSync(path.join(JHA_PAGE_DIR, 'JHAPage.tsx'), `import { useState, useEffect } from 'react'
import { Star, CheckCircle, Circle, Warning, Trophy, FileText, ArrowRight } from '@phosphor-icons/react'
import { settingsApi } from '@/api/settings.api'
import { useAuthStore } from '@/store/auth.store'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
  gold:'#f59e0b',
}

// ── JHA Parameter definitions (from JHA Toolkit, MoHUA) ──────────────────────
export const JHA_PARAMS = [
  {
    id: 'I', key: 'jha.param_1', code: 'P-I',
    title: 'Utilization of UWTP',
    maxMarks: 50, mandatory: '4-star',
    description: 'Percentage of actual inflow vs design capacity for assessment year',
    subItems: [
      { id:'1a', label:'Inflow >75% of design capacity for assessment year', marks:50 },
      { id:'1b', label:'Inflow between 50–75% of design capacity', marks:30 },
      { id:'1c', label:'Inflow <50% of design capacity', marks:20 },
    ],
    docs: ['Logbooks/flow records (past 6 months)', 'DPR with design capacity', 'Flow meter calibration records'],
    currentStatus: 'Construction phase — not yet applicable',
    applicablePhase: 'O&M',
  },
  {
    id: 'II', key: 'jha.param_2', code: 'P-II',
    title: 'UWTP Unit Operations',
    maxMarks: 85, mandatory: '3-star',
    description: 'Operational status of all treatment modules',
    subItems: [
      { id:'2a', label:'All primary treatment modules working (coarse screen, fine screen, grit chamber, primary clarifier)', marks:15 },
      { id:'2b', label:'All biological/secondary treatment (SBR C-Tech) in working condition', marks:20 },
      { id:'2c', label:'All tertiary treatment (PSF+ACF) in working condition', marks:10 },
      { id:'2d', label:'Disinfection modules (chlorination) present and working', marks:15 },
      { id:'2e', label:'All electromechanical equipment working', marks:17.5 },
      { id:'2f', label:'Standby E/M equipment available', marks:7.5 },
    ],
    docs: ['3–4 min video of all unit operations', 'Process flow diagram', 'P&ID diagram', 'Equipment list', 'O&M manual', 'Calibration certificates'],
    currentStatus: 'Construction phase — design complete, awaiting BEP approval',
    applicablePhase: 'O&M',
  },
  {
    id: 'III', key: 'jha.param_3', code: 'P-III',
    title: 'Monitoring Mechanism (SCADA/OCEMS)',
    maxMarks: 50, mandatory: '4-star',
    description: 'Online monitoring via SCADA and OCEMS',
    subItems: [
      { id:'3a', label:'SCADA system with Read and Write capability', marks:10 },
      { id:'3b', label:'SCADA controls preliminary, primary, biological, disinfection, sludge units', marks:12.5 },
      { id:'3c', label:'OCEMS integrated into UWTP operations', marks:10 },
      { id:'3d', label:'OCEMS monitors COD, TSS, TN, DO, pH', marks:12.5 },
      { id:'3e', label:'OCEMS data transmitted to central location (CPCB/PCB)', marks:5 },
    ],
    docs: ['SCADA reports (last 3 months)', 'Dashboard screenshot', 'Operations report (last month)', 'OCEMS reports (last 6 months)'],
    currentStatus: 'SCADA included in BEP — design stage. OCEMS to be integrated.',
    applicablePhase: 'O&M',
  },
  {
    id: 'IV', key: 'jha.param_4', code: 'P-IV',
    title: 'Compliance with Discharge Standards',
    maxMarks: 90, mandatory: '3-star',
    description: 'Treated effluent meets BOD, COD, TSS, TN, TP, FC norms',
    subItems: [
      { id:'4a', label:'BOD of effluent meets discharge norms', marks:10 },
      { id:'4b', label:'COD of effluent meets discharge norms', marks:10 },
      { id:'4c', label:'TSS in effluent meets discharge norms', marks:7.5 },
      { id:'4d', label:'Total Nitrogen (TN) meets discharge norms', marks:7.5 },
      { id:'4e', label:'Total Phosphorus (TP) meets discharge norms', marks:7.5 },
      { id:'4f', label:'Faecal Coliform (FC) meets discharge norms', marks:7.5 },
      { id:'4g', label:'Functional in-house laboratory with qualified staff', marks:20 },
      { id:'4h', label:'Third-party NABL/ISO testing — once every month', marks:20 },
    ],
    docs: ['Lab video', 'Scanned logbooks', 'Standards followed', 'Last 3 months NABL test reports'],
    currentStatus: 'To be established during commissioning. Lab design in BEP.',
    applicablePhase: 'O&M',
  },
  {
    id: 'V', key: 'jha.param_5', code: 'P-V',
    title: 'Safety & Cleanliness in UWTP',
    maxMarks: 67.5, mandatory: '3-star',
    description: 'PPE, safety drills, gas detection, medical insurance, cleanliness',
    subItems: [
      { id:'5a', label:'Functional firefighting equipment with fire exits and assembly points', marks:7.5 },
      { id:'5b', label:'Unit labelling, floor markings, ATEX area marking', marks:10 },
      { id:'5c', label:'PPE usage by all UWTP personnel', marks:10 },
      { id:'5d', label:'Safety drills and training conducted', marks:5 },
      { id:'5e', label:'Functional gas detection systems', marks:10 },
      { id:'5f', label:'Periodic medical check-up for all personnel', marks:5 },
      { id:'5g', label:'Medical and life insurance for all personnel', marks:5 },
      { id:'5h', label:'Functional washrooms including female workers', marks:5 },
      { id:'5i', label:'Flood management measures deployed', marks:5 },
      { id:'5j', label:'General cleanliness of UWTP', marks:5 },
    ],
    docs: ['Safety equipment deployment report', 'HFL marking photo', 'ATEX area photos', 'PPE distribution records', 'Training photos', 'Medical camp report', 'Insurance certificates'],
    currentStatus: 'To be implemented during O&M phase. STP site above HFL.',
    applicablePhase: 'O&M',
  },
  {
    id: 'VI', key: 'jha.param_6', code: 'P-VI',
    title: 'Human Resources',
    maxMarks: 50, mandatory: '3-star',
    description: 'Qualified plant manager, operators, lab analyst, training',
    subItems: [
      { id:'6a', label:'Plant Manager and operations staff deployed as per O&M contract', marks:20 },
      { id:'6b', label:'Plant Manager and Operator qualification as per DPR', marks:15 },
      { id:'6c', label:'Qualified Lab Analyst appointed', marks:5 },
      { id:'6d', label:'Periodic training (at least quarterly) conducted', marks:10 },
    ],
    docs: ['Staff list with qualifications', 'Attendance register (last month)', 'Training calendar', 'Training photos'],
    currentStatus: 'Gowhar Shah (PM) authorized. O&M staffing plan to be finalized.',
    applicablePhase: 'O&M',
  },
  {
    id: 'VII', key: 'jha.param_7', code: 'P-VII',
    title: 'Reuse of Treated Water & Biosolids',
    maxMarks: 62.5, mandatory: '5-star',
    description: 'Treated water reuse percentage and revenue from water/biosolid sales',
    subItems: [
      { id:'7a', label:'Treated water being reused (construction, agriculture, industrial)', marks:20 },
      { id:'7b', label:'Quantity of treated water reused (% of actual flow)', marks:15 },
      { id:'7c', label:'Biosolids conditioned (dewatered/dried) before disposal', marks:5 },
      { id:'7d', label:'Frequency of biosolid testing as per FCO 2014', marks:10 },
      { id:'7e', label:'Monthly revenue from sale of treated water/biosolids', marks:12.5 },
    ],
    docs: ['Logbooks + MOU for treated water use', 'Test reports of reused water', 'Biosolid analysis reports', 'Revenue receipts'],
    currentStatus: 'Reuse strategy to be included in O&M plan. Dal Lake context — water can be used for horticulture.',
    applicablePhase: 'O&M',
  },
  {
    id: 'VIII', key: 'jha.param_8', code: 'P-VIII',
    title: 'Alternate Power & Renewable Energy',
    maxMarks: 30, mandatory: '5-star',
    description: 'DG set backup and solar/biogas renewable energy',
    subItems: [
      { id:'8a', label:'Supplementary power source (DG set) present at plant', marks:20 },
      { id:'8b', label:'Renewable energy (solar/biogas) offsetting UWTP energy requirements', marks:15 },
    ],
    docs: ['Photos of DG set/renewable energy equipment', 'Electricity bills (last 3 months)', 'Energy offset bills'],
    currentStatus: 'DG backup included in BEP. Solar panels to be planned.',
    applicablePhase: 'O&M',
  },
  {
    id: 'IX', key: 'jha.param_9', code: 'P-IX',
    title: 'Co-Treatment of Faecal Sludge',
    maxMarks: 5, mandatory: '5-star',
    description: 'Faecal sludge co-treatment facility within UWTP premises',
    subItems: [
      { id:'9a', label:'Faecal sludge co-treatment facility operational at UWTP', marks:5 },
    ],
    docs: ['Logbook of FS received at co-treatment facility'],
    currentStatus: 'Not in current scope. Can be added as enhancement during O&M.',
    applicablePhase: 'O&M',
  },
  {
    id: 'X', key: 'jha.param_10', code: 'P-X',
    title: 'Innovative Systems',
    maxMarks: 10, mandatory: '5-star',
    description: 'Remote automation, predictive maintenance, BIS 9100 certification',
    subItems: [
      { id:'10a', label:'Remote automation of plant / predictive maintenance using sensors/AI', marks:5 },
      { id:'10b', label:'Quality management system BIS 9100 certified', marks:5 },
    ],
    docs: ['Photos of automation system', 'Reports from automation', 'BIS certificate'],
    currentStatus: 'SCADA with remote monitoring planned. BIS certification to target during O&M.',
    applicablePhase: 'O&M',
  },
]

// ── Star rating rules ─────────────────────────────────────────────────────────
function calcStarRating(scores: Record<string, Record<string, boolean>>) {
  const met = (paramId: string) => {
    const p = JHA_PARAMS.find(p => p.id === paramId)
    if (!p) return false
    const s = scores[p.key] ?? {}
    const scored = p.subItems.reduce((sum, item) => sum + (s[item.id] ? item.marks : 0), 0)
    return scored >= p.maxMarks * 0.6 // 60% threshold per parameter
  }

  // 3-star: II + IV + V + VI
  const threeStar = met('II') && met('IV') && met('V') && met('VI')
  // 4-star: I + II + III + IV + V + VI
  const fourStar  = threeStar && met('I') && met('III')
  // 5-star: all parameters
  const fiveStar  = fourStar && met('VII') && met('VIII') && met('IX') && met('X')

  if (fiveStar)  return 5
  if (fourStar)  return 4
  if (threeStar) return 3
  return 0
}

function totalScore(scores: Record<string, Record<string, boolean>>) {
  return JHA_PARAMS.reduce((total, p) => {
    const s = scores[p.key] ?? {}
    return total + p.subItems.reduce((sum, item) => sum + (s[item.id] ? item.marks : 0), 0)
  }, 0)
}

const TOTAL_MAX = JHA_PARAMS.reduce((s, p) => s + p.maxMarks, 0) // 500 marks

function StarDisplay({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={22}
          weight={i < count ? 'fill' : 'regular'}
          color={i < count ? C.gold : C.border} />
      ))}
    </div>
  )
}

export default function JHAPage() {
  const { activeProjectId } = useAuthStore()
  const [scores, setScores]       = useState<Record<string, Record<string, boolean>>>({})
  const [expanded, setExpanded]   = useState<string | null>('I')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [loading, setLoading]     = useState(true)

  // Load saved scores
  useEffect(() => {
    async function load() {
      setLoading(true)
      const loaded: Record<string, Record<string, boolean>> = {}
      for (const p of JHA_PARAMS) {
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

  async function saveScores() {
    setSaving(true)
    try {
      for (const p of JHA_PARAMS) {
        await settingsApi.set(p.key, JSON.stringify(scores[p.key] ?? {}))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  function toggle(paramKey: string, itemId: string) {
    setScores(prev => ({
      ...prev,
      [paramKey]: { ...(prev[paramKey] ?? {}), [itemId]: !prev[paramKey]?.[itemId] },
    }))
  }

  const starRating  = calcStarRating(scores)
  const total       = totalScore(scores)
  const pct         = Math.round((total / TOTAL_MAX) * 100)

  const starColors: Record<number, string> = {
    0: C.text3, 1: '#94a3b8', 2: '#64748b', 3: C.amber, 4: C.blue, 5: C.green
  }
  const starLabels: Record<number, string> = {
    0: 'Not Yet Eligible', 1: '★ 1 Star', 2: '★★ 2 Stars',
    3: '★★★ 3 Stars — Eligible for Incentives',
    4: '★★★★ 4 Stars', 5: '★★★★★ 5 Stars — Maximum Incentive',
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:32, height:32, border:'3px solid #2563eb',
        borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Jal Hi AMRIT (JHA) Compliance
          </h1>
          <p style={{ fontSize:14, color:C.text3, margin:0 }}>
            AMRUT 2.0 · Clean Water Credits · Star Rating Self-Assessment
          </p>
        </div>
        <button onClick={saveScores} disabled={saving}
          style={{ padding:'10px 24px', background: saved ? C.green : C.blue,
            color:'#fff', border:'none', borderRadius:10, fontSize:13,
            fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
          {saved ? <><CheckCircle size={15}/> Saved!</> : saving ? 'Saving...' : 'Save Assessment'}
        </button>
      </div>

      {/* Star Rating Summary Card */}
      <div style={{ background:C.navy, borderRadius:16, padding:'28px 32px',
        display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24 }}>

        <div>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)',
            textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
            Current Star Rating
          </p>
          <StarDisplay count={starRating} />
          <p style={{ fontSize:13, fontWeight:700, margin:'10px 0 0',
            color: starColors[starRating] }}>
            {starLabels[starRating]}
          </p>
        </div>

        <div>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)',
            textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
            Total Score
          </p>
          <p style={{ fontSize:36, fontWeight:800, color:'#fff', margin:0, lineHeight:1 }}>
            {Math.round(total)}
            <span style={{ fontSize:16, color:'rgba(255,255,255,0.4)', fontWeight:400 }}>
              /{TOTAL_MAX}
            </span>
          </p>
          <div style={{ marginTop:12, height:6, background:'rgba(255,255,255,0.1)', borderRadius:99 }}>
            <div style={{ height:'100%', borderRadius:99, width: pct + '%',
              background: pct >= 80 ? '#34d399' : pct >= 60 ? C.gold : '#f87171',
              transition:'width 0.5s' }} />
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'6px 0 0' }}>
            {pct}% of maximum score
          </p>
        </div>

        <div>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)',
            textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
            Incentive Eligibility
          </p>
          {starRating >= 3 ? (
            <div style={{ background:'rgba(5,150,105,0.2)', borderRadius:10, padding:'12px 14px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#34d399', margin:'0 0 4px' }}>
                ✓ Eligible for Clean Water Credits
              </p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', margin:0 }}>
                70% incentive on achieving {starRating}-star rating
              </p>
            </div>
          ) : (
            <div style={{ background:'rgba(220,38,38,0.15)', borderRadius:10, padding:'12px 14px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#f87171', margin:'0 0 4px' }}>
                ✗ Not Yet Eligible
              </p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', margin:0 }}>
                Minimum 3-star required. Meet parameters II, IV, V, VI.
              </p>
            </div>
          )}

          {/* Path to next star */}
          {starRating < 5 && (
            <div style={{ marginTop:10 }}>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 6px' }}>
                To reach {starRating + 1}-star:
              </p>
              {[
                starRating < 3 ? 'Meet params II, IV, V, VI (3-star mandatory)' : null,
                starRating < 4 ? 'Also meet params I, III (4-star mandatory)' : null,
                starRating < 5 ? 'Also meet params VII–X (5-star)' : null,
              ].filter(Boolean).slice(0,1).map((txt, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <ArrowRight size={11} color='rgba(255,255,255,0.4)' />
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', margin:0 }}>{txt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Star path legend */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { stars:3, params:'II, IV, V, VI', color:'#f59e0b', desc:'Eligible for incentives' },
          { stars:4, params:'I, II, III, IV, V, VI', color:'#3b82f6', desc:'Enhanced incentive' },
          { stars:5, params:'All I–X', color:'#10b981', desc:'Maximum incentive + bonus' },
        ].map(s => (
          <div key={s.stars} style={{ background:C.card, border:\`1.5px solid \${C.border}\`,
            borderRadius:12, padding:'14px 16px', borderLeft:\`4px solid \${s.color}\` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <StarDisplay count={s.stars} max={5} />
              <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{s.desc}</span>
            </div>
            <p style={{ fontSize:11, color:C.text3, margin:0 }}>
              Mandatory: Parameters {s.params}
            </p>
          </div>
        ))}
      </div>

      {/* Parameter checklist */}
      {JHA_PARAMS.map(param => {
        const paramScores = scores[param.key] ?? {}
        const scored      = param.subItems.reduce((s, item) => s + (paramScores[item.id] ? item.marks : 0), 0)
        const paramPct    = Math.round((scored / param.maxMarks) * 100)
        const isExpanded  = expanded === param.id
        const isMet       = paramPct >= 60
        const mandatoryColor = param.mandatory === '3-star' ? C.amber :
                               param.mandatory === '4-star' ? C.blue : C.green

        return (
          <div key={param.id} style={{ background:C.card, border:\`1.5px solid \${isMet ? '#bbf7d0' : C.border}\`,
            borderRadius:14, overflow:'hidden',
            boxShadow: isMet ? '0 0 0 1px #86efac20' : 'none' }}>

            {/* Parameter header */}
            <div onClick={() => setExpanded(isExpanded ? null : param.id)}
              style={{ padding:'16px 20px', cursor:'pointer', display:'flex',
                alignItems:'center', gap:14,
                background: isExpanded ? '#f8fafc' : '#fff' }}>

              {/* Status icon */}
              <div style={{ flexShrink:0 }}>
                {isMet
                  ? <CheckCircle size={22} color={C.green} weight='fill' />
                  : <Circle size={22} color={C.text3} />}
              </div>

              {/* Title */}
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#fff', padding:'2px 8px',
                    borderRadius:99, background:C.navy }}>
                    {param.code}
                  </span>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>
                    {param.title}
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px',
                    borderRadius:99, background: mandatoryColor + '18', color: mandatoryColor }}>
                    {param.mandatory} mandatory
                  </span>
                </div>
                <p style={{ fontSize:12, color:C.text3, margin:0 }}>{param.description}</p>
              </div>

              {/* Score */}
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ fontSize:18, fontWeight:800, margin:0,
                  color: paramPct >= 60 ? C.green : paramPct >= 30 ? C.amber : C.text3 }}>
                  {Math.round(scored)}<span style={{ fontSize:12, color:C.text3 }}>/{param.maxMarks}</span>
                </p>
                <div style={{ width:80, height:4, background:'#f1f5f9', borderRadius:99, marginTop:4 }}>
                  <div style={{ height:'100%', borderRadius:99, width: paramPct + '%',
                    background: paramPct >= 60 ? C.green : paramPct >= 30 ? C.amber : C.red,
                    transition:'width 0.3s' }} />
                </div>
                <p style={{ fontSize:10, color:C.text3, margin:'2px 0 0' }}>{paramPct}%</p>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ borderTop:\`1px solid \${C.border}\`, padding:'16px 20px 20px' }}>

                {/* Current status */}
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8,
                  padding:'8px 12px', marginBottom:16, display:'flex', gap:8, alignItems:'flex-start' }}>
                  <Warning size={13} color={C.amber} weight='fill' style={{ marginTop:1, flexShrink:0 }} />
                  <p style={{ fontSize:12, color:'#92400e', margin:0 }}>
                    <strong>Current status:</strong> {param.currentStatus}
                  </p>
                </div>

                {/* Sub-items checklist */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {param.subItems.map(item => {
                    const checked = !!paramScores[item.id]
                    return (
                      <div key={item.id}
                        onClick={() => toggle(param.key, item.id)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                          borderRadius:8, cursor:'pointer',
                          background: checked ? '#f0fdf4' : '#f8fafc',
                          border: \`1px solid \${checked ? '#bbf7d0' : C.border}\`,
                          transition:'all 0.15s' }}>
                        <div style={{ width:20, height:20, borderRadius:4, flexShrink:0,
                          background: checked ? C.green : '#fff',
                          border: \`2px solid \${checked ? C.green : C.border}\`,
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {checked && <span style={{ color:'#fff', fontSize:12, fontWeight:800 }}>✓</span>}
                        </div>
                        <span style={{ flex:1, fontSize:13, color: checked ? '#166534' : C.text2,
                          fontWeight: checked ? 600 : 400 }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize:12, fontWeight:700,
                          color: checked ? C.green : C.text3, flexShrink:0 }}>
                          +{item.marks}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Documents required */}
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:C.text3,
                    textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>
                    Documents Required
                  </p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {param.docs.map((doc, i) => (
                      <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:99,
                        background:'#f1f5f9', color:C.text2, border:\`1px solid \${C.border}\` }}>
                        <FileText size={10} style={{ marginRight:4, verticalAlign:'middle' }} />
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

      {/* JHA info footer */}
      <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12,
        padding:'16px 20px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#1d4ed8', margin:'0 0 6px' }}>
          About Jal Hi AMRIT (JHA) — AMRUT 2.0
        </p>
        <p style={{ fontSize:12, color:'#3b82f6', margin:0, lineHeight:1.6 }}>
          MoHUA has earmarked ₹1,300 crore for JHA (₹600 cr for 2024-25, ₹700 cr for 2025-26).
          UWTPs achieving 3+ stars receive incentives on a first-come-first-serve basis.
          Incentive release: 70% upfront + 30% on maintaining rating for 6 months.
          Contact: jha@asci.org.in | Portal: amrut.mohua.gov.in
        </p>
      </div>
    </div>
  )
}
`)
console.log('✅ JHAPage.tsx created')

// ── 2. Add JHA to Sidebar ─────────────────────────────────────────────────────
const sidebarPath = path.join(SRC, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')

if (!sidebar.includes('jha')) {
  // Add Trophy icon import
  sidebar = sidebar.replace(
    `import {`,
    `import { Trophy } from '@phosphor-icons/react'\nimport {`
  )
  // Consolidate imports - add Trophy to existing import
  sidebar = sidebar.replace(
    `import { Trophy } from '@phosphor-icons/react'\nimport {\n  SquaresFour`,
    `import {\n  Trophy, SquaresFour`
  )

  // Add JHA link under Quality (QA)
  sidebar = sidebar.replace(
    `  { section:'SITE',      label:'Quality (QA)',  path:'/qa',                 icon:CheckSquare,  roles:['super_admin','project_manager','engineer','qa_engineer'] },`,
    `  { section:'SITE',      label:'Quality (QA)',  path:'/qa',                 icon:CheckSquare,  roles:['super_admin','project_manager','engineer','qa_engineer'] },
  { section:'SITE',      label:'JHA Compliance', path:'/jha',               icon:Trophy,       roles:['super_admin','project_manager','engineer','qa_engineer'] },`
  )
  fs.writeFileSync(sidebarPath, sidebar)
  console.log('✅ Sidebar.tsx — JHA Compliance link added under SITE section')
} else {
  console.log('⏭  Sidebar — JHA already present')
}

// ── 3. Add JHA route to App.tsx ───────────────────────────────────────────────
const appPath = path.join(SRC, 'App.tsx')
let app = fs.readFileSync(appPath, 'utf8')

if (!app.includes('JHAPage')) {
  app = `import JHAPage from '@/pages/jha/JHAPage'\n` + app
  app = app.replace(
    `<Route path="/qa"`,
    `<Route path="/jha" element={<JHAPage />} />\n          <Route path="/qa"`
  )
  fs.writeFileSync(appPath, app)
  console.log('✅ App.tsx — /jha route added')
} else {
  console.log('⏭  App.tsx — JHA route already present')
}

// ── 4. Add header page title for /jha ─────────────────────────────────────────
const headerPath = path.join(SRC, 'components', 'layout', 'AppHeader.tsx')
let header = fs.readFileSync(headerPath, 'utf8')

if (!header.includes('/jha')) {
  header = header.replace(
    `  '/settings/system':    { title:'System Settings',    sub:'Application configuration' },`,
    `  '/jha':                { title:'JHA Compliance',     sub:'Jal Hi AMRIT · AMRUT 2.0 · Clean Water Credits' },
  '/settings/system':    { title:'System Settings',    sub:'Application configuration' },`
  )
  fs.writeFileSync(headerPath, header)
  console.log('✅ AppHeader.tsx — /jha page title added')
}

// ── 5. Create JHA checklist + WBS seed script ─────────────────────────────────
fs.writeFileSync(path.join(SCRIPTS, 'seed-jha-data.js'), `/**
 * Seeds JHA QA checklists and WBS O&M tasks into the database
 */
const API_BASE    = 'http://localhost:3000'
const PROJECT_ID  = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const LOGIN_EMAIL = 'admin@kipl.in'
const LOGIN_PASS  = 'password'

async function login() {
  const res  = await fetch(API_BASE + '/api/v1/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email:LOGIN_EMAIL, password:LOGIN_PASS }),
  })
  const data = await res.json()
  return data.accessToken ?? data.access_token ?? data.token
}

const JHA_CHECKLISTS = [
  {
    title: 'JHA P-I: UWTP Utilization Capacity',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha1a', question:'Actual inflow >75% of design capacity for assessment year (50 marks)', required:true, referenceSpec:'JHA Toolkit Para I' },
      { id:'jha1b', question:'Flow meters calibrated and records maintained', required:true },
      { id:'jha1c', question:'Logbooks with daily flow records for past 6 months available', required:true },
      { id:'jha1d', question:'DPR with design capacity uploaded to JHA portal', required:true },
    ],
  },
  {
    title: 'JHA P-II: UWTP Unit Operations (3-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha2a', question:'Coarse screen operational', required:true, referenceSpec:'JHA P-II: 2.5 marks' },
      { id:'jha2b', question:'Fine screen operational', required:true, referenceSpec:'JHA P-II: 2.5 marks' },
      { id:'jha2c', question:'Grit chamber operational', required:true, referenceSpec:'JHA P-II: 5 marks' },
      { id:'jha2d', question:'Primary clarifier operational', required:true, referenceSpec:'JHA P-II: 5 marks' },
      { id:'jha2e', question:'SBR (C-Tech) biological treatment fully operational', required:true, referenceSpec:'JHA P-II: 20 marks' },
      { id:'jha2f', question:'Tertiary treatment (PSF+ACF) operational', required:true, referenceSpec:'JHA P-II: 10 marks' },
      { id:'jha2g', question:'Disinfection (chlorination) operational', required:true, referenceSpec:'JHA P-II: 15 marks' },
      { id:'jha2h', question:'All electromechanical equipment working', required:true, referenceSpec:'JHA P-II: 17.5 marks' },
      { id:'jha2i', question:'3-4 min video of all unit operations recorded and uploaded', required:true },
    ],
  },
  {
    title: 'JHA P-III: Monitoring Mechanism — SCADA/OCEMS (4-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha3a', question:'SCADA system with Read and Write capability installed', required:true, referenceSpec:'JHA P-III: 10 marks' },
      { id:'jha3b', question:'SCADA controls all treatment stages', required:true, referenceSpec:'JHA P-III: 12.5 marks' },
      { id:'jha3c', question:'OCEMS integrated and operational', required:true, referenceSpec:'JHA P-III: 10 marks' },
      { id:'jha3d', question:'OCEMS monitors COD, TSS, TN, DO, pH', required:true, referenceSpec:'JHA P-III: 12.5 marks' },
      { id:'jha3e', question:'OCEMS data transmitted to CPCB/PCB central server', required:true, referenceSpec:'JHA P-III: 5 marks' },
      { id:'jha3f', question:'SCADA reports for last 3 months available', required:true },
    ],
  },
  {
    title: 'JHA P-IV: Discharge Standards Compliance (3-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha4a', question:'BOD of treated effluent meets PCB discharge norms', required:true, referenceSpec:'JHA P-IV: 10 marks' },
      { id:'jha4b', question:'COD of treated effluent meets discharge norms', required:true, referenceSpec:'JHA P-IV: 10 marks' },
      { id:'jha4c', question:'TSS meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4d', question:'Total Nitrogen (TN) meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4e', question:'Total Phosphorus (TP) meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4f', question:'Faecal Coliform (FC) meets discharge norms', required:true, referenceSpec:'JHA P-IV: 7.5 marks' },
      { id:'jha4g', question:'Functional in-house laboratory with qualified staff', required:true, referenceSpec:'JHA P-IV: 20 marks' },
      { id:'jha4h', question:'Third-party NABL/ISO testing done monthly', required:true, referenceSpec:'JHA P-IV: 20 marks' },
    ],
  },
  {
    title: 'JHA P-V: Safety & Cleanliness (3-star Mandatory)',
    category: 'safety', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha5a', question:'Firefighting equipment, fire exits and assembly points functional', required:true, referenceSpec:'JHA P-V: 7.5 marks' },
      { id:'jha5b', question:'Unit labelling, floor markings and ATEX area marked', required:true, referenceSpec:'JHA P-V: 10 marks' },
      { id:'jha5c', question:'All personnel using quality PPE', required:true, referenceSpec:'JHA P-V: 10 marks' },
      { id:'jha5d', question:'Safety drills conducted and records maintained', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5e', question:'Gas detection systems functional', required:true, referenceSpec:'JHA P-V: 10 marks' },
      { id:'jha5f', question:'Periodic medical check-ups for all staff', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5g', question:'Medical and life insurance for all staff', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5h', question:'Functional washrooms for male and female workers', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5i', question:'Flood management measures deployed (HFL above all components)', required:true, referenceSpec:'JHA P-V: 5 marks' },
      { id:'jha5j', question:'General cleanliness of UWTP maintained', required:true, referenceSpec:'JHA P-V: 5 marks' },
    ],
  },
  {
    title: 'JHA P-VI: Human Resources (3-star Mandatory)',
    category: 'stp', workItem: 'JHA Self-Assessment', isTemplate: true,
    items: [
      { id:'jha6a', question:'Plant Manager deployed as per O&M contract / DPR', required:true, referenceSpec:'JHA P-VI: 20 marks' },
      { id:'jha6b', question:'Plant Manager and Operator qualifications meet DPR requirements', required:true, referenceSpec:'JHA P-VI: 15 marks' },
      { id:'jha6c', question:'Qualified Lab Analyst appointed', required:true, referenceSpec:'JHA P-VI: 5 marks' },
      { id:'jha6d', question:'Training conducted at least once every 3 months', required:true, referenceSpec:'JHA P-VI: 10 marks' },
    ],
  },
]

// WBS O&M tasks based on JHA requirements
const JHA_WBS_TASKS = [
  {
    wbsCode:'OM-01', title:'O&M Phase — JHA Compliance Planning', level:1, sortOrder:60,
    plannedStart:'2027-10-01', plannedEnd:'2028-09-27', plannedDuration:365,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'JHA self-assessment to be submitted within 3 months of commissioning',
  },
  {
    wbsCode:'OM-02', title:'JHA Portal Registration & UWTP Nomination',
    level:2, parentCode:'OM-01', sortOrder:61,
    plannedStart:'2027-10-01', plannedEnd:'2027-10-31', plannedDuration:30,
    progressPct:0, status:'not_started', responsible:'UEED / KIPL',
    remarks:'Register on AMRUT 2.0 portal. Nominate 38.5 MLD Ishber Nishat STP.',
  },
  {
    wbsCode:'OM-03', title:'Establish In-House Laboratory (JHA P-IV)',
    level:2, parentCode:'OM-01', sortOrder:62,
    plannedStart:'2027-08-01', plannedEnd:'2027-09-30', plannedDuration:61,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'NABL-compliant lab for BOD, COD, TSS, TN, TP, FC testing. Required for 3-star.',
  },
  {
    wbsCode:'OM-04', title:'SCADA + OCEMS Integration & Commissioning (JHA P-III)',
    level:2, parentCode:'OM-01', sortOrder:63,
    plannedStart:'2027-07-01', plannedEnd:'2027-09-30', plannedDuration:92,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'SCADA R&W + OCEMS for COD/TSS/TN/DO/pH. Data transmission to CPCB/PCB server.',
  },
  {
    wbsCode:'OM-05', title:'Safety Systems — PPE, Gas Detection, Fire Safety (JHA P-V)',
    level:2, parentCode:'OM-01', sortOrder:64,
    plannedStart:'2027-08-01', plannedEnd:'2027-10-31', plannedDuration:92,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'Fire exits, ATEX marking, gas detectors, PPE for all staff, insurance.',
  },
  {
    wbsCode:'OM-06', title:'HR Deployment — Plant Manager + Operators + Lab (JHA P-VI)',
    level:2, parentCode:'OM-01', sortOrder:65,
    plannedStart:'2027-09-01', plannedEnd:'2027-10-01', plannedDuration:30,
    progressPct:0, status:'not_started', responsible:'UEED / KIPL',
    remarks:'Qualified PM, operators, lab analyst as per O&M contract + quarterly training.',
  },
  {
    wbsCode:'OM-07', title:'Treated Water Reuse Plan — Horticulture/Construction (JHA P-VII)',
    level:2, parentCode:'OM-01', sortOrder:66,
    plannedStart:'2027-10-01', plannedEnd:'2028-03-27', plannedDuration:178,
    progressPct:0, status:'not_started', responsible:'UEED / LCMA',
    remarks:'Dal Lake context — treated water for horticulture along Dal Lake boulevard. MoU required.',
  },
  {
    wbsCode:'OM-08', title:'Solar Energy Installation (JHA P-VIII)',
    level:2, parentCode:'OM-01', sortOrder:67,
    plannedStart:'2027-07-01', plannedEnd:'2027-12-31', plannedDuration:184,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'Solar panels to offset UWTP energy. DG backup included in contract.',
  },
  {
    wbsCode:'OM-09', title:'JHA Self-Assessment Submission',
    level:2, parentCode:'OM-01', sortOrder:68,
    plannedStart:'2028-01-01', plannedEnd:'2028-03-27', plannedDuration:86,
    progressPct:0, status:'not_started', responsible:'Gohar Shah',
    remarks:'Target: 4-star rating. Incentive claim via AMRUT 2.0 portal.',
  },
]

async function main() {
  console.log('\\n🔐 Logging in...')
  const token   = await login()
  const headers = { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }
  console.log('   ✓ Done\\n')

  // ── Seed JHA QA Checklists ────────────────────────────────────────────────
  console.log('📋 Seeding JHA QA checklists...')
  let created = 0, failed = 0
  for (const cl of JHA_CHECKLISTS) {
    const res = await fetch(API_BASE + '/api/v1/qa/checklists', {
      method:'POST', headers, body: JSON.stringify({ ...cl, projectId: PROJECT_ID }),
    })
    if (res.ok) { console.log('   ✓ ' + cl.title.slice(0,60)); created++ }
    else        { console.log('   ❌ ' + cl.title.slice(0,60) + ' — ' + res.status); failed++ }
    await new Promise(r => setTimeout(r, 80))
  }

  // ── Seed JHA WBS O&M Tasks ────────────────────────────────────────────────
  console.log('\\n🏗  Seeding JHA O&M WBS tasks...')
  const existingWbs = await fetch(API_BASE + '/api/v1/wbs?projectId=' + PROJECT_ID, { headers }).then(r => r.json())
  const existingMap = {}
  ;(Array.isArray(existingWbs) ? existingWbs : existingWbs.data ?? []).forEach(t => { existingMap[t.wbsCode] = t.id })
  const createdIds = { ...existingMap }

  for (const task of JHA_WBS_TASKS) {
    const { parentCode, ...taskData } = task
    const parentId = parentCode ? createdIds[parentCode] ?? null : null
    const payload  = { ...taskData, projectId:PROJECT_ID, parentId, eotApplied:false }
    const existing = existingMap[task.wbsCode]
    const url      = existing ? API_BASE + '/api/v1/wbs/' + existing : API_BASE + '/api/v1/wbs'
    const method   = existing ? 'PATCH' : 'POST'
    const res      = await fetch(url, { method, headers, body: JSON.stringify(payload) })
    if (res.ok) {
      const t = await res.json()
      createdIds[task.wbsCode] = t.id ?? existing
      console.log('   ✓ ' + task.wbsCode + ' — ' + task.title)
    } else { console.log('   ❌ ' + task.wbsCode + ' — ' + res.status); failed++ }
    await new Promise(r => setTimeout(r, 80))
  }

  console.log('\\n' + '─'.repeat(60))
  console.log('✅  JHA data seeded: ' + created + ' QA checklists + ' + JHA_WBS_TASKS.length + ' WBS O&M tasks')
  if (failed > 0) console.log('❌  Failed: ' + failed)
  console.log('\\nNavigate to /jha to see the star rating page')
  console.log('Navigate to /qa to see JHA checklists')
  console.log('Navigate to /wbs to see JHA O&M tasks (OM-01 through OM-09)')
}

main().catch(e => { console.error('\\n❌ Fatal:', e.message); process.exit(1) })
`)
console.log('✅ scripts/seed-jha-data.js created')

console.log(`
🎉 JHA Build Complete!

Files created:
  ✓ src/pages/jha/JHAPage.tsx        — Interactive star rating page
  ✓ scripts/seed-jha-data.js          — Seeds QA checklists + WBS O&M tasks

Files updated:
  ✓ Sidebar.tsx — "JHA Compliance" link under SITE section (Trophy icon)
  ✓ App.tsx     — /jha route registered
  ✓ AppHeader.tsx — Page title for /jha

Next step — run the seed script:
  node scripts/seed-jha-data.js

Then navigate to /jha in the browser.
`)

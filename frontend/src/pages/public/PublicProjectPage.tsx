import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  Buildings, MapPin, Calendar, CurrencyInr, CheckCircle,
  Clock, WarningCircle, FileText, Gauge, Envelope,
} from '@phosphor-icons/react'

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'

const C = {
  navy:'#1a2540', blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626',
  text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  border:'#e2e8f0', card:'#fff', bg:'#f0f2f5',
  blueBg:'#eff6ff', greenBg:'#f0fdf4',
}

function ProgressBar({ value, color='#2563eb' }: { value:number; color?:string }) {
  return (
    <div style={{ width:'100%', height:10, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
      <div style={{ width:`${Math.min(100,Math.max(0,value))}%`, height:'100%',
        borderRadius:99, background:color, transition:'width 0.6s ease' }} />
    </div>
  )
}

function StatBox({ label, value, sub, color='#0f172a' }: any) {
  return (
    <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14,
      padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
      <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase',
        letterSpacing:'0.07em', margin:'0 0 8px' }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:800, color, margin:'0 0 4px' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:C.text3, margin:0 }}>{sub}</p>}
    </div>
  )
}

function MilestoneRow({ label, date, done }: { label:string; date:string; done:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0',
      borderBottom:'1px solid #f1f5f9' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
        background: done ? C.greenBg : '#f1f5f9',
        border: '2px solid '+(done ? C.green : C.border),
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        {done
          ? <CheckCircle size={14} color={C.green} weight="fill" />
          : <Clock size={14} color={C.text3} />}
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:13, fontWeight:600, color: done ? C.text2 : C.text1, margin:'0 0 2px',
          textDecoration: done ? 'none' : 'none' }}>{label}</p>
        {date && <p style={{ fontSize:11, color:C.text3, margin:0 }}>{date}</p>}
      </div>
      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
        color: done ? C.green : C.amber,
        background: done ? C.greenBg : '#fffbeb' }}>
        {done ? 'Completed' : 'Pending'}
      </span>
    </div>
  )
}

export default function PublicProjectPage() {
  const { code } = useParams<{ code:string }>()
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string|null>(null)

  useEffect(() => {
    if (!code) { setError('Invalid project link'); setLoading(false); return }
    axios.get(`${BASE}/api/v1/public/project/${code}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(e => {
        setError(e.response?.status === 404 ? 'Project not found or link has expired.' : 'Unable to load project data.')
        setLoading(false)
      })
  }, [code])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:44, height:44, border:'3px solid '+C.blue, borderTopColor:'transparent',
        borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ fontSize:14, color:C.text3 }}>Loading project status…</p>
      <style>{'@keyframes spin { to { transform:rotate(360deg) } }'}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center' }}>
      <div style={{ background:C.card, borderRadius:20, padding:'48px 40px', textAlign:'center',
        maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <WarningCircle size={48} color={C.amber} style={{ marginBottom:16 }} />
        <h2 style={{ fontSize:20, fontWeight:800, color:C.text1, margin:'0 0 8px' }}>Project Not Found</h2>
        <p style={{ fontSize:14, color:C.text3, margin:0 }}>{error}</p>
      </div>
    </div>
  )

  const p        = data?.project ?? {}
  const progress = data?.progress ?? {}
  const letters  = data?.recentLetters ?? []
  const milestones = data?.milestones ?? []
  const finance  = data?.finance ?? {}

  const fmtCr = (n:number) => n ? '₹'+(n/10000000).toFixed(2)+' Cr' : '—'
  const fmtD  = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>

      {/* Top banner */}
      <div style={{ background:C.navy, padding:'0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 32px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#2563eb',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Buildings size={22} color="#fff" weight="bold" />
            </div>
            <div>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0,
                textTransform:'uppercase', letterSpacing:'0.1em' }}>Khilari Infrastructure Pvt Ltd</p>
              <p style={{ fontSize:18, fontWeight:800, color:'#fff', margin:0 }}>ProjectOS — Public Status</p>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'0 0 2px' }}>Last updated</p>
            <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', margin:0 }}>
              {new Date().toLocaleDateString('en-IN',{ day:'2-digit', month:'long', year:'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 32px 64px' }}>

        {/* Project Info Card */}
        <div style={{ background:C.card, borderRadius:20, padding:'28px 32px',
          border:'1.5px solid '+C.border, marginBottom:24, boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px',
                background:C.blueBg, borderRadius:20, marginBottom:12 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:C.blue }} />
                <span style={{ fontSize:11, fontWeight:700, color:C.blue }}>ACTIVE PROJECT</span>
              </div>
              <h1 style={{ fontSize:22, fontWeight:800, color:C.text1, margin:'0 0 8px', letterSpacing:'-0.02em' }}>
                {p.name ?? 'Dal Lake Sewerage Scheme'}
              </h1>
              <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                {[
                  { icon:MapPin, text: p.location ?? 'Nishat, Srinagar, J&K' },
                  { icon:FileText, text: p.allotmentNo ?? 'CE/UEED/PS/01 OF 2025-26' },
                  { icon:Calendar, text: 'Start: '+fmtD(p.startDate) },
                  { icon:Calendar, text: 'Target: '+fmtD(p.endDate) },
                ].map(({ icon:Icon, text }) => (
                  <div key={text} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Icon size={13} color={C.text3} />
                    <span style={{ fontSize:13, color:C.text2 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              {[
                { label:'Executing Agency', value: p.executingAgency ?? 'UEED' },
                { label:'Authority', value: p.authority ?? 'LCMA' },
              ].map(b => (
                <div key={b.label} style={{ background:'#f8fafc', borderRadius:12, padding:'12px 18px',
                  border:'1.5px solid '+C.border, textAlign:'center' }}>
                  <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 4px' }}>{b.label}</p>
                  <p style={{ fontSize:15, fontWeight:800, color:C.text1, margin:0 }}>{b.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress + Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:16, marginBottom:24 }}>
          {/* Progress card */}
          <div style={{ background:C.card, borderRadius:16, padding:'24px 26px',
            border:'1.5px solid '+C.border, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Gauge size={18} color={C.blue} weight="bold" />
              <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Overall Progress</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:44, fontWeight:900, color:C.blue, lineHeight:1 }}>
                {Math.round(progress.overall ?? 0)}
              </span>
              <span style={{ fontSize:20, fontWeight:700, color:C.text3, marginBottom:4 }}>%</span>
            </div>
            <ProgressBar value={progress.overall ?? 0} color={C.blue} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, gap:10 }}>
              {[
                { label:'Civil Work', value:progress.civil??0, color:C.blue },
                { label:'Mech/Elec', value:progress.mechanical??0, color:C.green },
                { label:'Testing', value:progress.testing??0, color:C.amber },
              ].map(b => (
                <div key={b.label} style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:10, color:C.text3, fontWeight:600 }}>{b.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:b.color }}>{b.value}%</span>
                  </div>
                  <ProgressBar value={b.value} color={b.color} />
                </div>
              ))}
            </div>
          </div>

          <StatBox label="Contract Value"   value={fmtCr(finance.contractValue??0)}  sub="Total awarded"        color={C.text1} />
          <StatBox label="Expenditure"      value={fmtCr(finance.expenditure??0)}    sub="Amount utilized"      color={C.blue}  />
          <StatBox label="Bills Submitted"  value={data?.billsSubmitted??0}          sub="RA bills raised"      color={C.green} />
        </div>

        {/* Milestones + Letters */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Milestones */}
          <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border,
            overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1.5px solid '+C.border,
              display:'flex', alignItems:'center', gap:8 }}>
              <CheckCircle size={16} color={C.green} weight="bold" />
              <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Milestones</h2>
            </div>
            <div style={{ padding:'4px 22px' }}>
              {milestones.length === 0 ? (
                <p style={{ color:C.text3, fontSize:13, padding:'20px 0' }}>No milestones recorded yet.</p>
              ) : milestones.map((m:any, i:number) => (
                <MilestoneRow key={i} label={m.label} date={fmtD(m.date)} done={m.done} />
              ))}
            </div>
          </div>

          {/* Recent correspondence */}
          <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border,
            overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1.5px solid '+C.border,
              display:'flex', alignItems:'center', gap:8 }}>
              <Envelope size={16} color={C.blue} weight="bold" />
              <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>Recent Correspondence</h2>
            </div>
            <div style={{ padding:'8px 0' }}>
              {letters.length === 0 ? (
                <p style={{ color:C.text3, fontSize:13, padding:'20px 22px' }}>No letters on record.</p>
              ) : letters.slice(0, 6).map((l:any, i:number) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'11px 22px',
                  borderBottom: i < letters.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:C.blue,
                    marginTop:5, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{l.subject}</p>
                    <p style={{ fontSize:11, color:C.text3, margin:0 }}>
                      {l.refNo ? l.refNo+' · ' : ''}{fmtD(l.date)}
                    </p>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
                    color:l.direction==='incoming'?C.green:C.blue,
                    background:l.direction==='incoming'?C.greenBg:C.blueBg, flexShrink:0, alignSelf:'flex-start' }}>
                    {l.direction==='incoming'?'↓ IN':'↑ OUT'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:40, padding:'20px 0',
          borderTop:'1.5px solid '+C.border }}>
          <p style={{ fontSize:12, color:C.text3, margin:'0 0 4px' }}>
            This is an official project status page maintained by Khilari Infrastructure Pvt Ltd
          </p>
          <p style={{ fontSize:11, color:'#cbd5e1', margin:0 }}>
            Allotment No: CE/UEED/PS/01 OF 2025-26 · Project Authority: LCMA · Executing Agency: UEED
          </p>
        </div>
      </div>
    </div>
  )
}

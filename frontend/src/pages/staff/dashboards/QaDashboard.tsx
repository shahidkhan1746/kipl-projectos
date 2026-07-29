import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Warning, ClipboardText } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { qaApi } from '@/api/qa.api'
import { tasksApi } from '@/api/tasks.api'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4","redBg":"#fef2f2"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function QaDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const { data: dash } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn: () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: recentInspections } = useQuery({
    queryKey: ['qa-inspections', activeProjectId],
    queryFn: () => qaApi.inspections({ projectId: activeProjectId!, limit: 5 }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const openTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')

  const RESULT_STYLE: Record<string,{color:string;bg:string;label:string}> = {
    pass:    { color:C.green, bg:C.greenBg, label:'PASS' },
    fail:    { color:C.red,   bg:C.redBg,   label:'FAIL' },
    pending: { color:C.amber, bg:'#fffbeb',  label:'PENDING' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>QA Engineer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Quality Assurance · {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        {[
          { label:'Total Inspections', value:dash?.totalInspections??0,  color:C.blue,  path:'/qa' },
          { label:'Pass Rate',         value:(dash?.passRate??'0')+'%',  color:C.green, path:'/qa' },
          { label:'Failed',            value:dash?.failed??0,            color:(dash?.failed??0)>0?C.red:C.green, path:'/qa' },
          { label:'Open NCRs',         value:dash?.openNcrs??0,          color:(dash?.openNcrs??0)>0?C.red:C.green, path:'/qa' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor=C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor=C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
        {[
          { label:'New Inspection', desc:'Record a QA inspection result', path:'/qa',           Icon:CheckCircle },
          { label:'Raise NCR',      desc:'Log non-conformance report',     path:'/qa',           Icon:Warning },
          { label:'My Timesheet',   desc:'Submit daily activity log',      path:'/hr/timesheets', Icon:ClipboardText },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ marginBottom:10 }}><a.Icon size={26} color={C.blue} weight="duotone" /></div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent inspections + open tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Inspections</h2>
            <button onClick={() => nav('/qa')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentInspections??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No inspections recorded yet.</p>
          ) : (recentInspections??[]).slice(0,5).map((ins:any, i:number) => {
            const rs = RESULT_STYLE[ins.result??'pending'] ?? RESULT_STYLE.pending
            return (
              <div key={ins.id??i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'11px 18px', borderBottom:'1px solid #f1f5f9' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{ins.checkItem??ins.description??'Inspection'}</p>
                  <p style={{ fontSize:11, color:C.text3, margin:0 }}>{ins.location??''} · {fmtD(ins.date??ins.createdAt)}</p>
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, color:rs.color, background:rs.bg }}>{rs.label}</span>
              </div>
            )
          })}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>My Open Tasks ({openTasks.length})</h2>
            <button onClick={() => nav('/tasks')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>All tasks complete</p>
          ) : openTasks.slice(0,5).map((t:any, i:number) => (
            <div key={t.id??i} onClick={() => nav('/tasks')}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:500, color:C.text1, margin:0 }}>{t.title}</p>
              <span style={{ fontSize:10, color:C.text3, flexShrink:0 }}>{fmtD(t.dueDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

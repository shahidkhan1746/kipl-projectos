import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { meetingsApi } from '@/api/meetings.api'
import { liaisonApi } from '@/api/liaison.api'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function LiaisonDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: meetings } = useQuery({
    queryKey: ['meetings', activeProjectId],
    queryFn: () => meetingsApi.list({ projectId: activeProjectId }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: recentLetters } = useQuery({
    queryKey: ['letters', activeProjectId],
    queryFn: () => liaisonApi.listLetters({ projectId: activeProjectId!, limit:5 }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: files } = useQuery({
    queryKey: ['liaison-files', activeProjectId],
    queryFn: () => liaisonApi.list({ projectId: activeProjectId! }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const allActions      = (meetings??[]).flatMap((m:any) => (m.actionItems??[]).map((a:any)=>({...a,meetingId:m.id})))
  const openActions     = allActions.filter((a:any) => a.status !== 'closed')
  const overdueActions  = openActions.filter((a:any) => a.dueDate && a.dueDate < today)
  const pendingTasks    = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const pendingFiles    = (files??[]).filter((f:any) => f.status === 'pending')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Liaison Officer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Government Liaison · {fmtD(today)}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Pending Files',     value:pendingFiles.length,    color:pendingFiles.length>0?C.amber:C.green, path:'/liaison' },
          { label:'Open Actions',      value:openActions.length,     color:openActions.length>0?C.amber:C.green,  path:'/meetings' },
          { label:'Overdue Actions',   value:overdueActions.length,  color:overdueActions.length>0?C.red:C.green, path:'/meetings' },
          { label:'My Open Tasks',     value:pendingTasks.length,    color:C.blue, path:'/tasks' },
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Liaison Files',    desc:'Track government files & approvals', path:'/liaison',         emoji:'📁' },
          { label:'Draft Letter',     desc:'Create official correspondence',     path:'/liaison/letters', emoji:'✉️' },
          { label:'Meeting Minutes',  desc:'Record coordination meetings',       path:'/meetings',        emoji:'📝' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent letters + overdue actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Letters</h2>
            <button onClick={() => nav('/liaison/letters')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentLetters??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No letters yet.</p>
          ) : (recentLetters??[]).slice(0,5).map((l:any, i:number) => (
            <div key={l.id??i} style={{ display:'flex', gap:10, padding:'11px 18px', borderBottom:'1px solid #f1f5f9', alignItems:'flex-start' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:10, flexShrink:0, marginTop:1,
                color:l.direction==='incoming'?C.green:C.blue,
                background:l.direction==='incoming'?C.greenBg:C.blueBg }}>
                {l.direction==='incoming'?'↓ IN':'↑ OUT'}
              </span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{l.subject}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{l.refNo??''} · {fmtD(l.date??l.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>
              Overdue Actions {overdueActions.length > 0 && <span style={{ color:C.red }}>({overdueActions.length})</span>}
            </h2>
            <button onClick={() => nav('/meetings')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>Meetings →</button>
          </div>
          {overdueActions.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>✅ No overdue actions</p>
          ) : overdueActions.slice(0,5).map((a:any, i:number) => (
            <div key={i} onClick={() => nav('/meetings')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', alignItems:'flex-start' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#fff5f5')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:600, color:C.red, margin:0, flex:1 }}>{a.action??a.description}</p>
              <span style={{ fontSize:10, color:C.red, flexShrink:0, marginLeft:8, fontWeight:700 }}>Due {fmtD(a.dueDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

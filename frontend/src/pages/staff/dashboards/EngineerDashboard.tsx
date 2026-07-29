import { useQuery } from '@tanstack/react-query'
import { ClipboardText, BookOpen, CheckCircle } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { diaryApi } from '@/api/diary.api'
import { qaApi } from '@/api/qa.api'
import { wbsApi } from '@/api/wbs.api'
import { Spinner } from '@/components/ui/Spinner'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540"}

export default function EngineerDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: tasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: dash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn: () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const { data: qaData } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn: () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const myTasks   = tasks ?? []
  const overdue   = myTasks.filter((t: any) => t.dueDate && t.dueDate < today && t.status !== 'done')
  const pending   = myTasks.filter((t: any) => t.status !== 'done')
  const critical  = myTasks.filter((t: any) => t.priority === 'critical' && t.status !== 'done')

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Welcome */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Good Morning</p>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Site Engineer · Dal Lake Sewerage Scheme · {today}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:32, fontWeight:900, color:'#93c5fd' }}>{dash?.contractPct ?? '—'}%</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Contract time elapsed</div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        {[
          { label:'My Open Tasks',   value: pending.length,    color: C.blue,  onClick: () => nav('/tasks') },
          { label:'Overdue',         value: overdue.length,    color: overdue.length>0?C.red:C.green, onClick: () => nav('/tasks') },
          { label:'Critical Tasks',  value: critical.length,   color: critical.length>0?C.red:C.green, onClick: () => nav('/tasks') },
          { label:'Open NCRs',       value: qaData?.openNcrs??0, color: (qaData?.openNcrs??0)>0?C.amber:C.green, onClick: () => nav('/qa') },
        ].map(k => (
          <div key={k.label} onClick={k.onClick} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', cursor:'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
        {[
          { label:'Submit Today\'s Timesheet', desc:'Record your daily activities', path:'/hr/timesheets', color:C.blue },
          { label:'Fill Site Diary',            desc:'Weather, labour, work done',    path:'/diary',         color:C.green },
          { label:'Record QA Inspection',       desc:'Checklist-based inspection',    path:'/qa',            color:C.amber },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background=a.color+'08' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ width:36, height:36, borderRadius:10, background:a.color+'18', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              {a.path.includes('timesheet') ? <ClipboardText size={18} color={a.color}/> : a.path.includes('diary') ? <BookOpen size={18} color={a.color}/> : <CheckCircle size={18} color={a.color}/>}
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* My assigned tasks */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>My Tasks</h2>
          <button onClick={() => nav('/tasks')} style={{ fontSize:12, color:C.blue, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View all →</button>
        </div>
        {myTasks.length === 0 ? (
          <div style={{ padding:'32px 24px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:C.text3, margin:0 }}>No tasks assigned to you yet</p>
          </div>
        ) : (
          <div>
            {myTasks.slice(0,5).map((t: any) => {
              const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done'
              const PCOLORS: Record<string,string> = { critical:'#dc2626', high:'#d97706', medium:'#2563eb', low:'#059669' }
              return (
                <div key={t.id} onClick={() => nav('/tasks')} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:PCOLORS[t.priority]??C.blue, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:0 }}>{t.title}</p>
                    <p style={{ fontSize:11, color:C.text3, margin:'2px 0 0' }}>{t.category}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:isOverdue?'#fef2f2':'#f1f5f9', color:isOverdue?C.red:C.text3 }}>
                      {t.status.replace(/_/g,' ')}{isOverdue?' · overdue':''}
                    </span>
                    {t.dueDate && <p style={{ fontSize:10, color:isOverdue?C.red:C.text3, margin:'3px 0 0' }}>Due: {t.dueDate}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { diaryApi } from '@/api/diary.api'
import { tasksApi } from '@/api/tasks.api'
import { MapPin, BookOpen, ClipboardText, CheckCircle } from '@phosphor-icons/react'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''

export default function SupervisorDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn: () => hrApi.dashboard(activeProjectId??undefined).then(r => r.data),
  })
  const { data: diaryDash } = useQuery({
    queryKey: ['diary-dash', activeProjectId],
    queryFn: () => diaryApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: recentDiary } = useQuery({
    queryKey: ['diary-recent', activeProjectId],
    queryFn: () => diaryApi.list({ projectId:activeProjectId!, limit:4 }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  const openTasks       = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const attendanceRate  = hrDash?.totalEmployees > 0
    ? Math.round(((hrDash?.presentToday??0) / hrDash.totalEmployees) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Site Supervisor Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Site Supervision · {fmtD(today)}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        {[
          { label:'Workers on Site',  value:hrDash?.totalEmployees??0, color:C.blue, path:'/hr/attendance' },
          { label:'Present Today',    value:hrDash?.presentToday??0,   color:C.green, path:'/hr/attendance' },
          { label:'Attendance Rate',  value:attendanceRate+'%',        color:attendanceRate>=80?C.green:C.red, path:'/hr/attendance' },
          { label:'Diary Entries',    value:diaryDash?.thisMonthEntries??0, color:C.navy, path:'/diary' },
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

      {/* Attendance visual */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Today's Attendance</h2>
          <span style={{ fontSize:13, fontWeight:800, color:attendanceRate>=80?C.green:C.red }}>{attendanceRate}%</span>
        </div>
        <div style={{ width:'100%', height:10, borderRadius:99, background:'#e2e8f0', overflow:'hidden', marginBottom:12 }}>
          <div style={{ width:attendanceRate+'%', height:'100%', borderRadius:99,
            background:attendanceRate>=80?C.green:C.amber, transition:'width 0.5s ease' }} />
        </div>
        <div style={{ display:'flex', gap:24 }}>
          {[
            { label:'Present', value:hrDash?.presentToday??0, color:C.green },
            { label:'Absent',  value:(hrDash?.totalEmployees??0)-(hrDash?.presentToday??0), color:C.red },
            { label:'Total',   value:hrDash?.totalEmployees??0, color:C.text2 },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', margin:'0 0 2px' }}>{s.label}</p>
              <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
        {[
          { label:'Mark Attendance', desc:"Record today's labour count", path:'/hr/attendance', Icon:MapPin },
          { label:'Site Diary',      desc:'Log daily site activities',    path:'/diary',         Icon:BookOpen },
          { label:'My Timesheet',    desc:'Submit your activity log',     path:'/hr/timesheets', Icon:ClipboardText },
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

      {/* Recent diary entries + open tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Recent Diary Entries</h2>
            <button onClick={() => nav('/diary')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {(recentDiary??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.text3, margin:0 }}>No diary entries yet.</p>
          ) : (recentDiary??[]).slice(0,4).map((d:any, i:number) => (
            <div key={d.id??i} onClick={() => nav('/diary')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', alignItems:'flex-start' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{d.workDone ?? d.title ?? 'Site diary entry'}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>
                  {d.weather ? d.weather+' · ' : ''}{d.manpower ? d.manpower+' workers · ' : ''}{fmtD(d.date??d.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>My Tasks ({openTasks.length} open)</h2>
            <button onClick={() => nav('/tasks')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0, display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={15} weight="fill"/> All tasks complete</p>
          ) : openTasks.slice(0,4).map((t:any, i:number) => (
            <div key={t.id??i} onClick={() => nav('/tasks')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
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

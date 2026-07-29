import { useQuery } from '@tanstack/react-query'
import { MapPin, CurrencyInr, ClipboardText } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { tasksApi } from '@/api/tasks.api'
import api from '@/api/client'

const C = {"card":"#fff","border":"#e2e8f0","text1":"#0f172a","text2":"#475569","text3":"#94a3b8","blue":"#2563eb","green":"#059669","amber":"#d97706","red":"#dc2626","navy":"#1a2540","blueBg":"#eff6ff","greenBg":"#f0fdf4"}
const fmtD = (s:string) => s ? new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''
const fmtL = (n:number) => '₹'+(n/100000).toFixed(2)+' L'

export default function HrDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn: () => hrApi.dashboard(activeProjectId??undefined).then(r => r.data),
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: timesheets } = useQuery({
    queryKey: ['timesheets-pending', activeProjectId],
    queryFn: () => api.get('/hr/timesheets', { params:{ projectId:activeProjectId, status:'submitted', limit:5 } }).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: salaryData } = useQuery({
    queryKey: ['salary-summary', activeProjectId],
    queryFn: () => api.get('/hr/salary/summary', { params:{ projectId:activeProjectId } }).then(r => r.data),
    enabled: !!activeProjectId,
  })

  const pendingTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')
  const attendanceRate = hrDash?.totalEmployees > 0
    ? Math.round(((hrDash?.presentToday??0) / hrDash.totalEmployees) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>HR Officer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Human Resources · {fmtD(today)}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        {[
          { label:'Total Employees',  value:hrDash?.totalEmployees??0, color:C.blue,  path:'/hr/employees' },
          { label:'Present Today',    value:hrDash?.presentToday??0,   color:C.green, path:'/hr/attendance' },
          { label:'Absent Today',     value:hrDash?.absentToday??0,    color:(hrDash?.absentToday??0)>0?C.red:C.green, path:'/hr/attendance' },
          { label:'Pending Timesheets', value:(timesheets??[]).length, color:(timesheets??[]).length>0?C.amber:C.green, path:'/hr/timesheets' },
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
          { label:'Mark Attendance',   desc:"Record today's site attendance", path:'/hr/attendance', Icon:MapPin },
          { label:'Generate Salary',   desc:'Process monthly salary',          path:'/hr/salary',     Icon:CurrencyInr },
          { label:'My Timesheet',      desc:'Submit daily activity log',       path:'/hr/timesheets', Icon:ClipboardText },
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

      {/* Salary summary card */}
      {salaryData && (
        <div style={{ background:'linear-gradient(135deg,#1a2540 0%,#2563eb 100%)', borderRadius:14, padding:'20px 24px' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
            Current Month Salary Summary
          </p>
          <div style={{ display:'flex', gap:32 }}>
            {[
              { label:'Total Payroll',  value:fmtL(salaryData.totalPayroll??0),  color:'#fff' },
              { label:'TDS Deducted',   value:fmtL(salaryData.totalTds??0),      color:'#fca5a5' },
              { label:'Net Disbursed',  value:fmtL(salaryData.totalNet??0),      color:'#86efac' },
              { label:'Processed',      value:(salaryData.processed??0)+' of '+(salaryData.total??0), color:'#93c5fd' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase' }}>{s.label}</p>
                <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending timesheets + open tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Pending Timesheets</h2>
            <button onClick={() => nav('/hr/timesheets')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>Review →</button>
          </div>
          {(timesheets??[]).length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>All timesheets reviewed</p>
          ) : (timesheets??[]).slice(0,4).map((ts:any, i:number) => (
            <div key={ts.id??i} onClick={() => nav('/hr/timesheets')}
              style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', alignItems:'center' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text1, margin:'0 0 2px' }}>{ts.employee?.name ?? ts.userName ?? 'Employee'}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>{fmtD(ts.date??ts.weekStart)} · {ts.totalHours ?? '—'}h</p>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:'#fffbeb', padding:'3px 10px', borderRadius:20 }}>Pending</span>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, borderRadius:14, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1.5px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>My Tasks ({pendingTasks.length} open)</h2>
            <button onClick={() => nav('/tasks')} style={{ fontSize:11, fontWeight:600, color:C.blue, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
          </div>
          {pendingTasks.length === 0 ? (
            <p style={{ padding:'20px 18px', fontSize:13, color:C.green, fontWeight:600, margin:0 }}>All tasks complete</p>
          ) : pendingTasks.slice(0,4).map((t:any, i:number) => (
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

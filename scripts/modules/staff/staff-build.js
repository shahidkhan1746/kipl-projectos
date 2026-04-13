// Run from project root: node scripts/modules/staff/build.js
const fs   = require('fs')
const path = require('path')

const SRC  = path.join('backend', 'src')
const FSRC = path.join('frontend', 'src')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

console.log('\n\x1b[1mBuilding Staff Dashboard System\x1b[0m\n')
console.log('  Role-based views: engineer, hr_officer, liaison_officer, accounts, qa_engineer, supervisor\n')

fs.mkdirSync(path.join(FSRC, 'pages', 'staff'), { recursive: true })
fs.mkdirSync(path.join(FSRC, 'pages', 'staff', 'dashboards'), { recursive: true })

// ── 1. Role-based AppLayout wrapper ───────────────────────────
// Modify Sidebar to show different links per role
const sidebarPath = path.join(FSRC, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')

// Write a new role-aware Sidebar
fs.writeFileSync(sidebarPath, `import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, FileText, Envelope, Users, MapPin,
  Buildings, SignOut, CheckSquare, BookOpen,
  GitBranch, Kanban, Package, CurrencyInr,
  ClipboardText, UserCircle, ChartBar,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'

const ALL_LINKS = [
  // OVERVIEW
  { section:'OVERVIEW',  label:'Dashboard',    path:'/dashboard',          icon:SquaresFour,  roles:['super_admin','liaison_officer','hr_officer','engineer','accounts','qa_engineer','supervisor'] },

  // LIAISON
  { section:'LIAISON',   label:'Files',         path:'/liaison',            icon:FileText,     roles:['super_admin','liaison_officer'] },
  { section:'LIAISON',   label:'Letters',       path:'/liaison/letters',    icon:Envelope,     roles:['super_admin','liaison_officer'] },

  // PLANNING
  { section:'PLANNING',  label:'WBS & Gantt',   path:'/wbs',                icon:GitBranch,    roles:['super_admin','liaison_officer','engineer'] },
  { section:'PLANNING',  label:'Task Board',    path:'/tasks',              icon:Kanban,       roles:['super_admin','liaison_officer','hr_officer','engineer','accounts','qa_engineer','supervisor'] },
  { section:'PLANNING',  label:'Meetings',      path:'/meetings',           icon:Users,        roles:['super_admin','liaison_officer','engineer'] },

  // SITE
  { section:'SITE',      label:'Site Diary',    path:'/diary',              icon:BookOpen,     roles:['super_admin','engineer','supervisor','liaison_officer'] },
  { section:'SITE',      label:'Quality (QA)',  path:'/qa',                 icon:CheckSquare,  roles:['super_admin','engineer','qa_engineer'] },

  // EPC
  { section:'EPC',       label:'BOQ & Costs',   path:'/epc',                icon:Package,      roles:['super_admin','liaison_officer','engineer'] },

  // HR
  { section:'HR',        label:'Timesheets',    path:'/hr/timesheets',      icon:ClipboardText,roles:['super_admin','hr_officer','engineer','supervisor','liaison_officer','qa_engineer','accounts'] },
  { section:'HR',        label:'Attendance',    path:'/hr/attendance',      icon:MapPin,       roles:['super_admin','hr_officer','supervisor'] },
  { section:'HR',        label:'Employees',     path:'/hr/employees',       icon:Users,        roles:['super_admin','hr_officer'] },
  { section:'HR',        label:'Salary',        path:'/hr/salary',          icon:CurrencyInr,  roles:['super_admin','hr_officer'] },

  // FINANCE
  { section:'FINANCE',   label:'Accounting',    path:'/accounting',         icon:ChartBar,     roles:['super_admin','accounts'] },
  { section:'FINANCE',   label:'Invoices',      path:'/accounting/invoices',icon:CurrencyInr,  roles:['super_admin','accounts'] },
]

const ROLE_LABELS: Record<string,string> = {
  super_admin:     'Super Admin',
  liaison_officer: 'Liaison Officer',
  hr_officer:      'HR Officer',
  engineer:        'Site Engineer',
  accounts:        'Accounts',
  qa_engineer:     'QA Engineer',
  supervisor:      'Site Supervisor',
}

const ROLE_COLORS: Record<string,string> = {
  super_admin:     '#f59e0b',
  liaison_officer: '#3b82f6',
  hr_officer:      '#8b5cf6',
  engineer:        '#10b981',
  accounts:        '#f97316',
  qa_engineer:     '#ec4899',
  supervisor:      '#06b6d4',
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role ?? 'engineer'

  const visibleLinks = ALL_LINKS.filter(l => l.roles.includes(role))

  // Group by section
  const sections: Record<string, typeof ALL_LINKS> = {}
  visibleLinks.forEach(l => {
    if (!sections[l.section]) sections[l.section] = []
    sections[l.section].push(l)
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ width:260, flexShrink:0, background:'#1a2540', display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      {/* Logo */}
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Buildings size={20} color="#fff" weight="bold" />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.02em' }}>ProjectOS</p>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', margin:0 }}>Khilari Infrastructure</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 10px' }}>
        {Object.entries(sections).map(([section, links]) => (
          <div key={section} style={{ marginBottom:16 }}>
            <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 6px 10px' }}>{section}</p>
            {links.map(link => (
              <NavLink key={link.path} to={link.path} end={link.path !== '/liaison' && !link.path.includes('letters')}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 12px', borderRadius:8, marginBottom:2,
                  textDecoration:'none', fontSize:13, fontWeight:500,
                  background: isActive ? 'rgba(37,99,235,0.25)' : 'transparent',
                  color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  transition:'all 0.15s',
                })}>
                {({ isActive }) => (
                  <>
                    <link.icon size={16} weight={isActive ? 'fill' : 'regular'} />
                    <span>{link.label}</span>
                    {isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', marginLeft:'auto' }} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User profile */}
      <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:ROLE_COLORS[role]+'33', border:'2px solid '+(ROLE_COLORS[role]+'66'), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:700, color:ROLE_COLORS[role] }}>{user?.name?.charAt(0) ?? 'U'}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name ?? 'User'}</p>
            <p style={{ fontSize:10, color:ROLE_COLORS[role], margin:0, fontWeight:600 }}>{ROLE_LABELS[role] ?? role}</p>
          </div>
          <button onClick={handleLogout} title="Logout"
            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
`)
ok('Sidebar.tsx — role-aware, shows only relevant modules per role')

// ── 2. Role-based Dashboard Page ──────────────────────────────
// The existing DashboardPage is the admin view
// We need the dashboard to redirect to role-specific view

const dashPath = path.join(FSRC, 'pages', 'dashboard', 'DashboardPage.tsx')
let dash = fs.readFileSync(dashPath, 'utf8')

// Wrap it with role check at the top
if (!dash.includes('RoleDashboardRouter')) {
  const wrapper = `import { useAuthStore } from '@/store/auth.store'
import EngineerDashboard   from '@/pages/staff/dashboards/EngineerDashboard'
import HrDashboard         from '@/pages/staff/dashboards/HrDashboard'
import LiaisonDashboard    from '@/pages/staff/dashboards/LiaisonDashboard'
import AccountsDashboard   from '@/pages/staff/dashboards/AccountsDashboard'
import QaDashboard         from '@/pages/staff/dashboards/QaDashboard'
import SupervisorDashboard from '@/pages/staff/dashboards/SupervisorDashboard'

function RoleDashboardRouter() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'engineer')        return <EngineerDashboard />
  if (role === 'hr_officer')      return <HrDashboard />
  if (role === 'liaison_officer') return <LiaisonDashboard />
  if (role === 'accounts')        return <AccountsDashboard />
  if (role === 'qa_engineer')     return <QaDashboard />
  if (role === 'supervisor')      return <SupervisorDashboard />
  return null // super_admin gets the full admin dashboard below
}

`
  dash = wrapper + dash

  // Wrap the export to check role first
  dash = dash.replace(
    'export default function DashboardPage',
    'function AdminDashboardPage'
  )
  dash = dash + `\nexport default function DashboardPage() {
  const role = useAuthStore(s => s.user?.role)
  if (role !== 'super_admin') return <RoleDashboardRouter />
  return <AdminDashboardPage />
}\n`

  fs.writeFileSync(dashPath, dash)
  ok('DashboardPage.tsx — wrapped with role router')
}

// ── 3. Individual Staff Dashboards ────────────────────────────
const STAFF_DIR = path.join(FSRC, 'pages', 'staff', 'dashboards')

// Helper: common card style
const cardStyle = "{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'20px 22px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }"
const C = "{ card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8', blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540' }"

// ── Engineer Dashboard ─────────────────────────────────────────
fs.writeFileSync(path.join(STAFF_DIR, 'EngineerDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { diaryApi } from '@/api/diary.api'
import { qaApi } from '@/api/qa.api'
import { wbsApi } from '@/api/wbs.api'
import { Spinner } from '@/components/ui/Spinner'

const C = ${JSON.stringify({card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626',navy:'#1a2540'})}

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
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</p>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Site Engineer · Dal Lake Sewerage Scheme · {today}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:32, fontWeight:900, color:'#93c5fd' }}>{dash?.contractPct ?? '—'}%</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Contract time elapsed</div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Submit Today\\'s Timesheet', desc:'Record your daily activities', path:'/hr/timesheets', color:C.blue },
          { label:'Fill Site Diary',            desc:'Weather, labour, work done',    path:'/diary',         color:C.green },
          { label:'Record QA Inspection',       desc:'Checklist-based inspection',    path:'/qa',            color:C.amber },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background=a.color+'08' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ width:36, height:36, borderRadius:10, background:a.color+'18', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12, fontSize:18 }}>
              {a.path.includes('timesheet')?'📋':a.path.includes('diary')?'📓':'✅'}
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
                      {t.status.replace(/_/g,' ')} {isOverdue?'⚠':''}
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
`)
ok('EngineerDashboard.tsx')

// ── HR Dashboard ───────────────────────────────────────────────
fs.writeFileSync(path.join(STAFF_DIR, 'HrDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { tasksApi } from '@/api/tasks.api'

const C = ${JSON.stringify({card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626',navy:'#1a2540'})}

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

  const tasks = myTasks ?? []
  const pendingTasks = tasks.filter((t:any) => t.status !== 'done')

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>HR Officer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Human Resources · {today}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Employees', value: hrDash?.totalEmployees??0, color:C.blue, path:'/hr/employees' },
          { label:'Present Today',   value: hrDash?.presentToday??0,   color:C.green, path:'/hr/attendance' },
          { label:'Absent Today',    value: hrDash?.absentToday??0,    color:(hrDash?.absentToday??0)>0?C.red:C.green, path:'/hr/attendance' },
          { label:'Pending Leaves',  value: hrDash?.pendingLeaves??0,  color:C.amber, path:'/hr/employees' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Mark Attendance',   desc:'Record today\\'s site attendance', path:'/hr/attendance', emoji:'📍' },
          { label:'Generate Salary',   desc:'Process monthly salary',           path:'/hr/salary',     emoji:'💰' },
          { label:'My Timesheet',      desc:'Submit daily activity log',        path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background='#eff6ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {pendingTasks.length > 0 && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1.5px solid '+C.border }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0 }}>My Tasks ({pendingTasks.length} open)</h2>
          </div>
          {pendingTasks.slice(0,4).map((t:any) => (
            <div key={t.id} onClick={() => nav('/tasks')} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, color:C.text1, margin:0, fontWeight:500 }}>{t.title}</p>
              <span style={{ fontSize:10, color:C.text3 }}>{t.dueDate??''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
`)
ok('HrDashboard.tsx')

// ── Liaison Dashboard ──────────────────────────────────────────
fs.writeFileSync(path.join(STAFF_DIR, 'LiaisonDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { tasksApi } from '@/api/tasks.api'
import { meetingsApi } from '@/api/meetings.api'

const C = ${JSON.stringify({card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626',navy:'#1a2540'})}

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

  const allActions = (meetings??[]).flatMap((m:any) => (m.actionItems??[]).map((a:any,i:number)=>({...a,meetingNo:m.meetingNo,idx:i,meetingId:m.id})))
  const openActions = allActions.filter((a:any) => a.status !== 'closed')
  const overdueActions = openActions.filter((a:any) => a.dueDate && a.dueDate < today)
  const pendingTasks = (myTasks??[]).filter((t:any) => t.status !== 'done')

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Liaison Officer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Government Liaison · {today}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Meetings',    value: (meetings??[]).length, color:C.blue, path:'/meetings' },
          { label:'Open Actions',      value: openActions.length,    color:openActions.length>0?C.amber:C.green, path:'/meetings' },
          { label:'Overdue Actions',   value: overdueActions.length, color:overdueActions.length>0?C.red:C.green, path:'/meetings' },
          { label:'My Open Tasks',     value: pendingTasks.length,   color:C.blue, path:'/tasks' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Liaison Files',   desc:'Track government files and approvals', path:'/liaison',    emoji:'📁' },
          { label:'Draft Letter',    desc:'Create official correspondence',        path:'/liaison/letters', emoji:'✉️' },
          { label:'Meeting Minutes', desc:'Record coordination meetings',          path:'/meetings',   emoji:'📝' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background='#eff6ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
`)
ok('LiaisonDashboard.tsx')

// ── Accounts Dashboard ─────────────────────────────────────────
fs.writeFileSync(path.join(STAFF_DIR, 'AccountsDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { accountingApi } from '@/api/accounting.api'
import { tasksApi } from '@/api/tasks.api'

const C = ${JSON.stringify({card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626',navy:'#1a2540'})}
const fmtL = (n:number) => n ? '\\u20B9'+(n/100000).toFixed(2)+' L' : '\\u20B90.00 L'

export default function AccountsDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const { data: dash } = useQuery({
    queryKey: ['acc-dash', activeProjectId],
    queryFn: () => accountingApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Accounts Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Accounts & Finance</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Expenses',  value: fmtL(dash?.totalExpenses??0),   color:C.text1, path:'/accounting' },
          { label:'Pending Payment', value: fmtL(dash?.totalPending??0),    color:C.amber, path:'/accounting' },
          { label:'TDS Liability',   value: fmtL(dash?.tdsLiability??0),    color:(dash?.tdsLiability??0)>0?C.red:C.green, path:'/accounting' },
          { label:'My Open Tasks',   value: (myTasks??[]).filter((t:any)=>t.status!=='done').length, color:C.blue, path:'/tasks' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Record Expense',  desc:'Log site expenses and bills', path:'/accounting', emoji:'💳' },
          { label:'TDS Ledger',      desc:'View and deposit TDS',        path:'/accounting', emoji:'📊' },
          { label:'My Timsheet',     desc:'Submit daily activity log',   path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background='#eff6ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
`)
ok('AccountsDashboard.tsx')

// ── QA Engineer Dashboard ──────────────────────────────────────
fs.writeFileSync(path.join(STAFF_DIR, 'QaDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { qaApi } from '@/api/qa.api'
import { tasksApi } from '@/api/tasks.api'

const C = ${JSON.stringify({card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626',navy:'#1a2540'})}

export default function QaDashboard() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
  const { data: dash } = useQuery({
    queryKey: ['qa-dash', activeProjectId],
    queryFn: () => qaApi.dashboard(activeProjectId!).then(r => r.data),
    enabled: !!activeProjectId,
  })
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>QA Engineer Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Quality Assurance · Clause 33</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Total Inspections', value: dash?.totalInspections??0,    color:C.blue,  path:'/qa' },
          { label:'Pass Rate',         value: (dash?.passRate??'0')+'%',    color:C.green, path:'/qa' },
          { label:'Failed',            value: dash?.failed??0,              color:(dash?.failed??0)>0?C.red:C.green, path:'/qa' },
          { label:'Open NCRs',         value: dash?.openNcrs??0,            color:(dash?.openNcrs??0)>0?C.red:C.green, path:'/qa' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'New Inspection', desc:'Record a QA inspection', path:'/qa', emoji:'✅' },
          { label:'Raise NCR',      desc:'Log non-conformance',   path:'/qa', emoji:'⚠️' },
          { label:'My Timesheet',   desc:'Submit daily log',      path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background='#eff6ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
`)
ok('QaDashboard.tsx')

// ── Supervisor Dashboard ───────────────────────────────────────
fs.writeFileSync(path.join(STAFF_DIR, 'SupervisorDashboard.tsx'), `import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { hrApi } from '@/api/hr.api'
import { diaryApi } from '@/api/diary.api'
import { tasksApi } from '@/api/tasks.api'

const C = ${JSON.stringify({card:'#fff',border:'#e2e8f0',text1:'#0f172a',text2:'#475569',text3:'#94a3b8',blue:'#2563eb',green:'#059669',amber:'#d97706',red:'#dc2626',navy:'#1a2540'})}

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
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => tasksApi.list({ projectId: activeProjectId, assignedTo: user?.id }).then(r => r.data),
    enabled: !!user?.id,
  })

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ background:C.navy, borderRadius:16, padding:'24px 28px' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Site Supervisor Dashboard</p>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>{user?.name}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>Site Supervision · Labour Management · {today}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Workers on Site',  value: hrDash?.totalEmployees??0,          color:C.blue, path:'/hr/attendance' },
          { label:'Present Today',    value: hrDash?.presentToday??0,            color:C.green, path:'/hr/attendance' },
          { label:'Diary Entries',    value: diaryDash?.thisMonthEntries??0,     color:C.navy, path:'/diary' },
          { label:'My Open Tasks',    value: (myTasks??[]).filter((t:any)=>t.status!=='done').length, color:C.amber, path:'/tasks' },
        ].map(k => (
          <div key={k.label} onClick={() => nav(k.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Mark Attendance',  desc:'Record today\\'s labour count', path:'/hr/attendance', emoji:'📍' },
          { label:'Site Diary',       desc:'Log daily site activities',     path:'/diary',         emoji:'📓' },
          { label:'My Timesheet',     desc:'Submit your activity log',      path:'/hr/timesheets', emoji:'📋' },
        ].map(a => (
          <div key={a.label} onClick={() => nav(a.path)}
            style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:14, padding:'18px 20px', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background='#eff6ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.card }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.emoji}</div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:12, color:C.text3, margin:0 }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
`)
ok('SupervisorDashboard.tsx')

// ── Backend: Add new roles to user entity ──────────────────────
// Check if roles enum exists and update it
const userEntityPath = path.join(SRC, 'users', 'user.entity.ts')
if (fs.existsSync(userEntityPath)) {
  let userEntity = fs.readFileSync(userEntityPath, 'utf8')
  if (!userEntity.includes('accounts') && userEntity.includes('UserRole')) {
    userEntity = userEntity.replace(
      /ENGINEER\s*=\s*'engineer'/,
      "ENGINEER    = 'engineer',\n  ACCOUNTS    = 'accounts',\n  QA_ENGINEER = 'qa_engineer',\n  SUPERVISOR  = 'supervisor'"
    )
    fs.writeFileSync(userEntityPath, userEntity)
    ok('user.entity.ts — accounts, qa_engineer, supervisor roles added')
  } else {
    ok('user.entity.ts — roles already updated or not found')
  }
}

// ── Seed new staff users ───────────────────────────────────────
// Update seed/seed.ts or seeder to add sample staff
const seedPath = path.join(SRC, 'seed', 'seed.ts')
if (fs.existsSync(seedPath)) {
  let seed = fs.readFileSync(seedPath, 'utf8')
  if (!seed.includes('qa_engineer') && seed.includes('const users')) {
    seed = seed.replace(
      /\{ name: 'Site Engineer'[^\}]+\},/,
      m => m + `
    { name: 'QA Engineer',     email: 'qa@kipl.in',         password: 'QA@KIPL#2024',     role: 'qa_engineer',     department: 'QA',       designation: 'Quality Engineer' },
    { name: 'Accounts Staff',  email: 'accounts@kipl.in',   password: 'Accounts@KIPL#2024',role: 'accounts',        department: 'Finance',  designation: 'Accounts Officer' },
    { name: 'Site Supervisor', email: 'supervisor@kipl.in', password: 'Supervisor@KIPL#2024',role:'supervisor',      department: 'Civil',    designation: 'Site Supervisor' },`
    )
    fs.writeFileSync(seedPath, seed)
    ok('seed.ts — 3 new staff roles seeded')
  } else {
    ok('seed.ts — new roles already present')
  }
}

console.log('\n\x1b[32m\x1b[1m  Staff Dashboard System complete!\x1b[0m' + NC)
console.log('\n  Role-based login — each role sees its own dashboard:')
console.log('\n  super_admin      → Full admin dashboard (existing)')
console.log('  liaison_officer  → Liaison dashboard: Files, Letters, Meetings, Tasks')
console.log('  engineer         → Engineer dashboard: My Tasks, Timesheet, Diary, QA')
console.log('  hr_officer       → HR dashboard: Attendance, Salary, Employees')
console.log('  qa_engineer      → QA dashboard: Inspections, NCRs, Checklists')
console.log('  accounts         → Accounts dashboard: Expenses, TDS, Vendors')
console.log('  supervisor       → Supervisor dashboard: Attendance, Site Diary, Tasks')
console.log('\n  Staff Login Credentials:')
console.log('  qa@kipl.in         QA@KIPL#2024')
console.log('  accounts@kipl.in   Accounts@KIPL#2024')
console.log('  supervisor@kipl.in Supervisor@KIPL#2024')
console.log('\n  Sidebar now shows only relevant modules per role')
console.log('  Role label + colour shown at bottom of sidebar\n')

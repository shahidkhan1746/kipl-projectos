// ================================================================
//  KIPL ProjectOS — Corporate Light Theme
//  White/grey background · Navy sidebar · Colorful stat cards
//  Run: node scripts/new-theme.js
// ================================================================
const fs   = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const SRC  = path.join(ROOT, 'frontend', 'src')
const G = '\x1b[32m', B = '\x1b[34m', NC = '\x1b[0m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)
function w(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c.trimStart(), 'utf8') }

// ── Design tokens ──────────────────────────────────────────────
const T = {
  // Backgrounds
  pageBg:    '#f0f2f5',
  cardBg:    '#ffffff',
  cardBg2:   '#f8f9fc',
  // Sidebar
  sidebarBg: '#1a2540',
  sidebarBorder: '#243050',
  sidebarActive: '#2563eb',
  sidebarActiveBg: 'rgba(37,99,235,0.15)',
  sidebarText: 'rgba(255,255,255,0.5)',
  sidebarTextActive: '#fff',
  // Text
  text1: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  // Border
  border: '#e2e8f0',
  borderAlt: '#cbd5e1',
  // Accent
  blue:   '#2563eb',
  green:  '#059669',
  amber:  '#d97706',
  purple: '#7c3aed',
  red:    '#dc2626',
  // Card gradients
  cardBlue:   { bg: 'linear-gradient(135deg, #1d4ed8, #2563eb)', icon: 'rgba(255,255,255,0.2)', text: '#fff' },
  cardGreen:  { bg: 'linear-gradient(135deg, #047857, #059669)', icon: 'rgba(255,255,255,0.2)', text: '#fff' },
  cardAmber:  { bg: 'linear-gradient(135deg, #b45309, #d97706)', icon: 'rgba(255,255,255,0.2)', text: '#fff' },
  cardPurple: { bg: 'linear-gradient(135deg, #6d28d9, #7c3aed)', icon: 'rgba(255,255,255,0.2)', text: '#fff' },
  cardRed:    { bg: 'linear-gradient(135deg, #b91c1c, #dc2626)', icon: 'rgba(255,255,255,0.2)', text: '#fff' },
}

// ── index.css ──────────────────────────────────────────────────
info('Writing index.css...')
w(path.join(SRC, 'index.css'), `
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: ${T.pageBg};
  color: ${T.text1};
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

#root { height: 100%; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: ${T.pageBg}; }
::-webkit-scrollbar-thumb { background: ${T.borderAlt}; border-radius: 4px; }

@keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeUp 0.2s ease forwards; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }

a { text-decoration: none; color: inherit; }

input, select, textarea, button { font-family: inherit; }
`)
ok('index.css — light corporate theme')

// ── AppLayout ──────────────────────────────────────────────────
info('Writing AppLayout...')
w(path.join(SRC, 'layouts/AppLayout.tsx'), `
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
export default function AppLayout() {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', background:'${T.pageBg}' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 36px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
`)
ok('AppLayout')

// ── Sidebar ────────────────────────────────────────────────────
info('Writing Sidebar...')
w(path.join(SRC, 'components/layout/Sidebar.tsx'), `
import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, FileText, Envelope, Users, MapPin,
  ChartBar, Package, Receipt, GitBranch, Kanban,
  Buildings, SignOut, CaretRight,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'

const GROUPS = [
  { label:'Overview', items:[
    { label:'Dashboard',   path:'/dashboard',           icon:SquaresFour, end:true  },
  ]},
  { label:'Liaison', items:[
    { label:'Files',       path:'/liaison',             icon:FileText,    end:true  },
    { label:'Letters',     path:'/liaison/letters',     icon:Envelope,    end:false },
  ]},
  { label:'Planning', items:[
    { label:'WBS & Gantt', path:'/tasks',               icon:GitBranch,   end:true  },
    { label:'Task Board',  path:'/tasks/kanban',        icon:Kanban,      end:false },
  ]},
  { label:'EPC', items:[
    { label:'BOQ & Costs', path:'/epc',                 icon:Package,     end:true  },
  ]},
  { label:'HR', items:[
    { label:'Attendance',  path:'/hr/attendance',       icon:MapPin,      end:true  },
    { label:'Employees',   path:'/hr/employees',        icon:Users,       end:false },
    { label:'Salary',      path:'/hr/salary',           icon:Receipt,     end:false },
  ]},
  { label:'Finance', items:[
    { label:'Transactions',path:'/accounting',          icon:ChartBar,    end:true  },
    { label:'Invoices',    path:'/accounting/invoices', icon:Receipt,     end:false },
  ]},
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) ?? 'K'

  return (
    <aside style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', height:'100%', background:'${T.sidebarBg}', borderRight:'1px solid ${T.sidebarBorder}' }}>

      {/* Logo */}
      <div style={{ padding:'22px 20px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid ${T.sidebarBorder}' }}>
        <div style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow:'0 4px 16px rgba(37,99,235,0.4)' }}>
          <Buildings size={20} weight="bold" color="white" />
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>ProjectOS</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:1 }}>Khilari Infrastructure</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'16px 12px' }}>
        {GROUPS.map(g => (
          <div key={g.label} style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', padding:'0 8px', marginBottom:8 }}>
              {g.label}
            </div>
            {g.items.map(item => (
              <NavLink key={item.path} to={item.path} end={item.end}
                style={({ isActive }:{ isActive:boolean }) => ({
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 10px', borderRadius:8, marginBottom:2,
                  textDecoration:'none', cursor:'pointer', transition:'all 0.15s',
                  background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                  color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                })}
              >
                {({ isActive }:{ isActive:boolean }) => (
                  <>
                    <item.icon size={16} weight={isActive?'fill':'regular'} color={isActive?'#93c5fd':'rgba(255,255,255,0.35)'} />
                    <span style={{ flex:1 }}>{item.label}</span>
                    {isActive && <div style={{ width:5, height:5, borderRadius:'50%', background:'#3b82f6', flexShrink:0 }} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding:'16px 16px', borderTop:'1px solid ${T.sidebarBorder}' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:'rgba(59,130,246,0.2)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.3)' }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textTransform:'capitalize', marginTop:1 }}>{user?.role?.replace(/_/g,' ')}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.25)', padding:6, borderRadius:6, display:'flex', alignItems:'center', transition:'color 0.15s' }}>
            <SignOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
`)
ok('Sidebar — dark navy, proper spacing')

// ── LoginPage ──────────────────────────────────────────────────
info('Writing LoginPage...')
w(path.join(SRC, 'pages/auth/LoginPage.tsx'), `
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Buildings } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/api/client'

export default function LoginPage() {
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoad]  = useState(false)
  const { setAuth, setProject } = useAuthStore()
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoad(true)
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password })
      setAuth(data.user, data.access_token, data.refresh_token)
      try {
        const { data: projects } = await api.get('/api/v1/projects')
        if (Array.isArray(projects) && projects[0]?.id) setProject(projects[0].id)
      } catch {}
      nav('/dashboard')
    } catch (err:any) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Invalid credentials')
    } finally { setLoad(false) }
  }

  const field: React.CSSProperties = {
    width:'100%', padding:'11px 14px',
    border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:14, color:'#0f172a', background:'#fff',
    outline:'none', transition:'border-color 0.15s',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'${T.pageBg}' }}>
      {/* Left panel */}
      <div style={{ width:440, flexShrink:0, background:'${T.sidebarBg}', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#3b82f6,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(37,99,235,0.5)', marginBottom:24 }}>
          <Buildings size={28} weight="bold" color="white" />
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', textAlign:'center', letterSpacing:'-0.02em', margin:0 }}>KIPL ProjectOS</h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', marginTop:10, textAlign:'center', lineHeight:1.6 }}>
          Enterprise project management<br/>for infrastructure & EPC
        </p>
        <div style={{ marginTop:48, width:'100%' }}>
          {[
            { icon:'📋', text:'Liaison file tracking' },
            { icon:'✉️', text:'Official letter management' },
            { icon:'👷', text:'HR & attendance' },
            { icon:'💰', text:'BOQ & accounting' },
          ].map(item => (
            <div key={item.text} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <h2 style={{ fontSize:24, fontWeight:800, color:'${T.text1}', margin:'0 0 6px' }}>Sign in</h2>
          <p style={{ fontSize:14, color:'${T.text3}', marginBottom:32 }}>Access your project dashboard</p>

          {error && (
            <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#b91c1c', display:'flex', alignItems:'center', gap:8 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'${T.text2}', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Email address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
                placeholder="admin@kipl.in" style={field}
                onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.12)'}}
                onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'${T.text2}', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Password</label>
              <input type="password" value={password} onChange={e=>setPass(e.target.value)} required
                placeholder="••••••••" style={field}
                onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.12)'}}
                onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}} />
            </div>
            <button type="submit" disabled={loading} style={{ padding:'13px', background: loading?'#1d4ed8':'#2563eb', border:'none', borderRadius:8, fontSize:14, fontWeight:700, color:'#fff', cursor:loading?'not-allowed':'pointer', transition:'all 0.15s', marginTop:4 }}>
              {loading ? 'Signing in...' : 'Sign in to ProjectOS →'}
            </button>
          </form>

          <p style={{ fontSize:12, color:'${T.text3}', marginTop:32, textAlign:'center' }}>
            Khilari Infrastructure Pvt. Ltd. · Internal Platform Only
          </p>
        </div>
      </div>
    </div>
  )
}
`)
ok('LoginPage — split layout, corporate')

// ── Dashboard ──────────────────────────────────────────────────
info('Writing DashboardPage...')
w(path.join(SRC, 'pages/dashboard/DashboardPage.tsx'), `
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { liaisonApi } from '@/api/liaison.api'
import api from '@/api/client'
import { FileText, Warning, CheckCircle, Clock, ArrowRight, TrendUp } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

const CARDS = [
  { key:'total',        label:'Total Files',   subKey:null,          color:'#2563eb', gradient:'linear-gradient(135deg,#1d4ed8,#2563eb)', iconBg:'rgba(255,255,255,0.15)', icon: (c:string) => <FileText size={22} weight="fill" color={c} /> },
  { key:'under_review', label:'Under Review',  subKey:null,          color:'#d97706', gradient:'linear-gradient(135deg,#b45309,#d97706)', iconBg:'rgba(255,255,255,0.15)', icon: (c:string) => <Clock size={22} weight="fill" color={c} /> },
  { key:'approved',     label:'Approved',      subKey:null,          color:'#059669', gradient:'linear-gradient(135deg,#047857,#059669)', iconBg:'rgba(255,255,255,0.15)', icon: (c:string) => <CheckCircle size={22} weight="fill" color={c} /> },
  { key:'overdue',      label:'Overdue',       subKey:'overdue',     color:'#dc2626', gradient:'linear-gradient(135deg,#b91c1c,#dc2626)', iconBg:'rgba(255,255,255,0.15)', icon: (c:string) => <Warning size={22} weight="fill" color={c} /> },
]

export default function DashboardPage() {
  const { user, activeProjectId } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn:  () => api.get('/api/v1/projects/'+activeProjectId).then(r=>r.data),
    enabled:  !!activeProjectId,
  })

  const { data: dash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn:  () => liaisonApi.dashboard(activeProjectId??undefined).then(r=>r.data),
    enabled:  !!activeProjectId,
  })

  const { data: filesData } = useQuery({
    queryKey: ['liaison-files-dash', activeProjectId],
    queryFn:  () => liaisonApi.files({ projectId:activeProjectId, limit:8 }).then(r=>r.data),
    enabled:  !!activeProjectId,
  })

  const pct = Number(project?.progressPct ?? 0)

  function getVal(card: typeof CARDS[0]) {
    if (!dash) return 0
    if (card.key === 'total') return dash.total ?? 0
    if (card.key === 'overdue') return dash.overdue ?? 0
    return dash.by_status?.[card.key] ?? 0
  }

  const card: React.CSSProperties = { borderRadius:16, padding:'24px 26px', color:'#fff', position:'relative', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.12)' }

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:28 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'${T.text1}', margin:0, letterSpacing:'-0.02em' }}>
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize:14, color:'${T.text3}', marginTop:5 }}>
            {new Date().toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        {project && (
          <div style={{ padding:'8px 16px', borderRadius:10, background:'#eff6ff', border:'1.5px solid #bfdbfe', color:'#1d4ed8', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
            <TrendUp size={14} />
            {project.code ?? 'STP-NSH-001'}
          </div>
        )}
      </div>

      {/* Project card */}
      {project && (
        <div style={{ background:'${T.sidebarBg}', borderRadius:16, padding:'26px 30px', color:'#fff', boxShadow:'0 4px 24px rgba(26,37,64,0.25)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:'0 0 5px' }}>{project.name}</h2>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0 }}>
                {project.client ?? 'LCMA / UEED'} · ₹{((Number(project.contractValue)||0)/1e7).toFixed(2)} Cr contract value
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:44, fontWeight:900, color:'#93c5fd', lineHeight:1, fontFamily:'monospace' }}>{pct}%</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>COMPLETE</div>
            </div>
          </div>
          <div style={{ height:8, borderRadius:999, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, width:pct+'%', background:'linear-gradient(90deg,#3b82f6,#34d399)', transition:'width 1.2s ease', boxShadow:'0 0 12px rgba(59,130,246,0.5)' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
            <span>Start: {project.startDate ?? '—'}</span>
            <span>End: {project.endDate ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
        {CARDS.map(c => (
          <div key={c.key} style={{ ...card, background:c.gradient }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ width:46, height:46, borderRadius:12, background:c.iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {c.icon('#fff')}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {c.label === 'Overdue' && dash?.overdue > 0 ? '⚠ Alert' : '↑ 0%'}
              </div>
            </div>
            <div style={{ fontSize:40, fontWeight:900, color:'#fff', lineHeight:1, fontFamily:'monospace', marginBottom:6 }}>
              {getVal(c)}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent files */}
      <div style={{ background:'${T.cardBg}', borderRadius:16, border:'1.5px solid ${T.border}', overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1.5px solid ${T.border}', background:'${T.cardBg2}' }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:'${T.text1}', margin:0 }}>Recent Liaison Files</h2>
          <Link to="/liaison" style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'${T.blue}', fontWeight:600 }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {!filesData ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'52px 0' }}><Spinner /></div>
        ) : !filesData.files?.length ? (
          <div style={{ padding:'52px 24px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:'${T.text3}' }}>No liaison files yet.</p>
            <Link to="/liaison" style={{ fontSize:13, color:'${T.blue}', marginTop:8, display:'inline-block', fontWeight:600 }}>
              Create your first file →
            </Link>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'${T.cardBg2}', borderBottom:'1.5px solid ${T.border}' }}>
                {['File No.','Subject','Department','Priority','Status','Holder'].map(h => (
                  <th key={h} style={{ padding:'11px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'${T.text3}', textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filesData.files.slice(0,7).map((f:any, i:number) => (
                <tr key={f.id} style={{ borderBottom: i < filesData.files.length-1 ? '1px solid ${T.border}' : 'none', transition:'background 0.1s', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f8faff')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'13px 20px', fontSize:12, fontWeight:700, color:'${T.blue}', fontFamily:'monospace' }}>{f.fileNumber ?? 'DRAFT'}</td>
                  <td style={{ padding:'13px 20px', fontSize:13, color:'${T.text1}', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.subject}</td>
                  <td style={{ padding:'13px 20px', fontSize:12, color:'${T.text2}' }}>{f.department ?? '—'}</td>
                  <td style={{ padding:'13px 20px' }}><Badge value={f.priority} size="xs" /></td>
                  <td style={{ padding:'13px 20px' }}><Badge value={f.currentStatus} size="xs" /></td>
                  <td style={{ padding:'13px 20px', fontSize:12, color:'${T.text2}' }}>{f.currentHolder?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
`)
ok('DashboardPage — corporate light, colorful cards, table layout')

// ── Badge ──────────────────────────────────────────────────────
info('Updating Badge...')
w(path.join(SRC, 'components/ui/Badge.tsx'), `
const MAP: Record<string,{bg:string;color:string;border:string}> = {
  draft:        {bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0'},
  submitted:    {bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
  under_review: {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  approved:     {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  rejected:     {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  returned:     {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  closed:       {bg:'#f8fafc', color:'#94a3b8', border:'#e2e8f0'},
  dispatched:   {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  generated:    {bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe'},
  pending:      {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  paid:         {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  low:          {bg:'#f8fafc', color:'#94a3b8', border:'#e2e8f0'},
  medium:       {bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
  high:         {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  urgent:       {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  noc:          {bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe'},
  approval:     {bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
  drawing:      {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  estimate:     {bg:'#fffbeb', color:'#b45309', border:'#fde68a'},
  report:       {bg:'#f8fafc', color:'#64748b', border:'#e2e8f0'},
  letter:       {bg:'#f5f3ff', color:'#6d28d9', border:'#ddd6fe'},
  clearance:    {bg:'#fef2f2', color:'#b91c1c', border:'#fecaca'},
  active:       {bg:'#ecfdf5', color:'#047857', border:'#a7f3d0'},
  other:        {bg:'#f8fafc', color:'#64748b', border:'#e2e8f0'},
}
const F = {bg:'#f8fafc', color:'#64748b', border:'#e2e8f0'}

export function Badge({ value, size='sm' }: { value?:string; size?:'xs'|'sm' }) {
  if (!value) return null
  const k = value.toLowerCase().replace(/[\\s-]/g,'_')
  const s = MAP[k] ?? F
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding: size==='xs' ? '2px 8px' : '3px 10px',
      borderRadius:999,
      fontSize: size==='xs' ? 10 : 11,
      fontWeight:600,
      letterSpacing:'0.03em',
      whiteSpace:'nowrap',
      background:s.bg, color:s.color,
      border:'1.5px solid '+s.border,
    }}>
      {value.replace(/_/g,' ')}
    </span>
  )
}
`)
ok('Badge — light theme colours')

// ── UI components ──────────────────────────────────────────────
info('Updating UI components...')

w(path.join(SRC, 'components/ui/Button.tsx'), `
import { Spinner } from './Spinner'
type V = 'primary'|'secondary'|'ghost'|'danger'|'success'
const VS:Record<V,React.CSSProperties> = {
  primary:   {background:'#2563eb',color:'#fff',border:'1.5px solid #2563eb'},
  secondary: {background:'#fff',color:'#374151',border:'1.5px solid #e5e7eb'},
  ghost:     {background:'transparent',color:'#6b7280',border:'1.5px solid transparent'},
  danger:    {background:'#fef2f2',color:'#b91c1c',border:'1.5px solid #fecaca'},
  success:   {background:'#ecfdf5',color:'#047857',border:'1.5px solid #a7f3d0'},
}
const SS:Record<string,React.CSSProperties> = {
  xs:{padding:'5px 10px',fontSize:11,borderRadius:6,gap:4},
  sm:{padding:'7px 14px',fontSize:12,borderRadius:8,gap:6},
  md:{padding:'10px 20px',fontSize:13,borderRadius:8,gap:8},
}
interface P extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?:V; size?:'xs'|'sm'|'md'; loading?:boolean; icon?:React.ReactNode }
export function Button({ variant='secondary', size='sm', loading, icon, children, style, disabled, ...p }:P) {
  return (
    <button {...p} disabled={disabled||loading} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:600, cursor:disabled||loading?'not-allowed':'pointer', opacity:disabled||loading?0.5:1, transition:'all 0.15s', fontFamily:'inherit', ...VS[variant], ...SS[size||'sm'], ...style }}>
      {loading ? <Spinner size={13} /> : icon}
      {children}
    </button>
  )
}
`)

w(path.join(SRC, 'components/ui/Input.tsx'), `
interface P extends React.InputHTMLAttributes<HTMLInputElement> { label?:string; error?:string; hint?:string }
export function Input({ label, error, hint, style, ...p }:P) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>}
      <input {...p} style={{ padding:'9px 12px', background:'#fff', border:'1.5px solid '+(error?'#fca5a5':'#e5e7eb'), borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', width:'100%', fontFamily:'inherit', transition:'all 0.15s', ...style }}
        onFocus={e=>{e.target.style.borderColor='#2563eb'; e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)'}}
        onBlur={e=>{e.target.style.borderColor=error?'#fca5a5':'#e5e7eb'; e.target.style.boxShadow='none'}} />
      {error && <span style={{ fontSize:11, color:'#b91c1c' }}>{error}</span>}
      {hint  && <span style={{ fontSize:11, color:'#94a3b8' }}>{hint}</span>}
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Select.tsx'), `
interface O { value:string; label:string }
interface P extends React.SelectHTMLAttributes<HTMLSelectElement> { label?:string; options:O[]; placeholder?:string }
export function Select({ label, options, placeholder, style, ...p }:P) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>}
      <select {...p} style={{ padding:'9px 12px', background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', width:'100%', fontFamily:'inherit', cursor:'pointer', ...style }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Textarea.tsx'), `
interface P extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?:string; error?:string }
export function Textarea({ label, error, style, ...p }:P) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>}
      <textarea {...p} style={{ padding:'9px 12px', background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#0f172a', outline:'none', width:'100%', fontFamily:'inherit', resize:'none', ...style }} />
      {error && <span style={{ fontSize:11, color:'#b91c1c' }}>{error}</span>}
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Modal.tsx'), `
import { X } from '@phosphor-icons/react'
interface P { open:boolean; onClose:()=>void; title:string; children:React.ReactNode; width?:number; footer?:React.ReactNode }
export function Modal({ open, onClose, title, children, width=540, footer }:P) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(6px)' }}>
      <div onClick={e=>e.stopPropagation()} className="fade-in" style={{ width:'100%', maxWidth:width, maxHeight:'90vh', display:'flex', flexDirection:'column', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1.5px solid #f1f5f9', background:'#f8fafc', borderRadius:'14px 14px 0 0' }}>
          <span style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}><X size={16} /></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'22px 24px' }}>{children}</div>
        {footer && <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8, padding:'16px 24px', borderTop:'1.5px solid #f1f5f9', background:'#f8fafc', borderRadius:'0 0 14px 14px' }}>{footer}</div>}
      </div>
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/StatCard.tsx'), `
interface P { label:string; value:string|number; sub?:string; color?:string; icon?:React.ReactNode }
export function StatCard({ label, value, sub, color='#2563eb', icon }:P) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8' }}>{label}</span>
        {icon && <span style={{ color, opacity:0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'monospace', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>{sub}</div>}
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Empty.tsx'), `
interface P { icon?:React.ReactNode; title:string; sub?:string; action?:React.ReactNode }
export function Empty({ icon, title, sub, action }:P) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'56px 24px', gap:10 }}>
      {icon && <div style={{ color:'#e2e8f0', marginBottom:4 }}>{icon}</div>}
      <p style={{ fontSize:14, fontWeight:600, color:'#94a3b8', margin:0 }}>{title}</p>
      {sub && <p style={{ fontSize:12, color:'#cbd5e1', margin:0 }}>{sub}</p>}
      {action}
    </div>
  )
}
`)

w(path.join(SRC, 'components/ui/Spinner.tsx'), `
export function Spinner({ size=20 }:{ size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin">
      <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
`)
ok('All UI components — light corporate theme')

// ── Stub pages ─────────────────────────────────────────────────
info('Updating stub pages...')
const stubs = [
  ['hr/AttendancePage','Attendance','GPS-based attendance tracking'],
  ['hr/EmployeesPage','Employees','Employee records and management'],
  ['hr/SalaryPage','Salary','Monthly payroll generation'],
  ['tasks/TasksPage','WBS & Gantt','Work breakdown and critical path'],
  ['tasks/KanbanPage','Task Board','Kanban task management'],
  ['epc/EpcPage','BOQ & Costs','Bill of quantities and cost tracking'],
  ['accounting/AccountingPage','Transactions','General ledger'],
  ['accounting/InvoicesPage','Invoices','RA bills and invoice management'],
  ['public/PublicProjectPage','Public View','Shareable project progress page'],
]
stubs.forEach(([p,title,desc]) => {
  const name = p.split('/').pop()
  w(path.join(SRC, 'pages', p+'.tsx'), `
import { Wrench } from '@phosphor-icons/react'
export default function ${name}() {
  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:'0 0 5px', letterSpacing:'-0.02em' }}>${title}</h1>
        <p style={{ fontSize:14, color:'#94a3b8', margin:0 }}>${desc}</p>
      </div>
      <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'80px 40px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Wrench size={20} color="#94a3b8" />
        </div>
        <p style={{ fontSize:14, fontWeight:600, color:'#64748b', margin:0 }}>Module in development</p>
        <p style={{ fontSize:12, color:'#cbd5e1', margin:0 }}>Being built module by module with .sh scripts</p>
      </div>
    </div>
  )
}`)
})
ok('Stub pages updated')

console.log('\n'+G+'\x1b[1m  Corporate light theme applied!\x1b[0m'+NC)
console.log(B+'  cd frontend && npm run dev'+NC+'\n')

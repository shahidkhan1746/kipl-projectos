// ================================================================
//  KIPL ProjectOS — Pure Inline Styles Fix
//  Replaces Tailwind classes with inline styles everywhere
//  Run: node scripts/fix-styles.js
// ================================================================
const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC  = path.join(ROOT, 'frontend', 'src')

const G = '\x1b[32m', NC = '\x1b[0m', B = '\x1b[34m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)
function w(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c.trimStart(), 'utf8') }

// ── index.css ──────────────────────────────────────────────────
info('Writing index.css...')
w(path.join(SRC, 'index.css'), `
@import "tailwindcss";

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: #050505;
  color: #ededed;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

#root { height: 100%; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeUp 0.25s ease forwards; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }

a { text-decoration: none; color: inherit; }
`)
ok('index.css')

// ── Sidebar ────────────────────────────────────────────────────
info('Writing Sidebar...')
w(path.join(SRC, 'components/layout/Sidebar.tsx'), `
import { NavLink, useNavigate } from 'react-router-dom'
import {
  SquaresFour, FileText, Envelope, Users, MapPin,
  ChartBar, Package, Receipt, GitBranch, Kanban,
  Buildings, SignOut,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'

const GROUPS = [
  { label: 'Overview', items: [
    { label: 'Dashboard',    path: '/dashboard',           icon: SquaresFour, end: true  },
  ]},
  { label: 'Liaison', items: [
    { label: 'Files',        path: '/liaison',             icon: FileText,    end: true  },
    { label: 'Letters',      path: '/liaison/letters',     icon: Envelope,    end: false },
  ]},
  { label: 'Planning', items: [
    { label: 'WBS & Gantt',  path: '/tasks',               icon: GitBranch,   end: true  },
    { label: 'Task Board',   path: '/tasks/kanban',        icon: Kanban,      end: false },
  ]},
  { label: 'EPC', items: [
    { label: 'BOQ & Costs',  path: '/epc',                 icon: Package,     end: true  },
  ]},
  { label: 'HR', items: [
    { label: 'Attendance',   path: '/hr/attendance',       icon: MapPin,      end: true  },
    { label: 'Employees',    path: '/hr/employees',        icon: Users,       end: false },
    { label: 'Salary',       path: '/hr/salary',           icon: Receipt,     end: false },
  ]},
  { label: 'Finance', items: [
    { label: 'Transactions', path: '/accounting',          icon: ChartBar,    end: true  },
    { label: 'Invoices',     path: '/accounting/invoices', icon: Receipt,     end: false },
  ]},
]

const S = {
  aside: { width: 224, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, height: '100%', background: '#0a0a0a', borderRight: '1px solid #1c1c1c' },
  logo:  { padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #151515' },
  logoIcon: { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'linear-gradient(135deg, #0070f3, #0050c0)', boxShadow: '0 4px 14px rgba(0,112,243,0.35)' },
  logoTitle: { fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 },
  logoSub:   { fontSize: 11, color: '#444', marginTop: 1 },
  nav:       { flex: 1, overflowY: 'auto' as const, padding: '12px 10px' },
  section:   { marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#333', padding: '0 8px', marginBottom: 6 },
  user: { padding: '14px 16px', borderTop: '1px solid #151515', display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: 'rgba(0,112,243,0.15)', color: '#4da3ff', border: '1px solid rgba(0,112,243,0.25)' },
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  return (
    <aside style={S.aside}>
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>
          <Buildings size={18} weight="bold" color="white" />
        </div>
        <div>
          <div style={S.logoTitle}>ProjectOS</div>
          <div style={S.logoSub}>Khilari Infra</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={S.nav}>
        {GROUPS.map(g => (
          <div key={g.label} style={S.section}>
            <div style={S.sectionLabel}>{g.label}</div>
            {g.items.map(item => (
              <NavLink key={item.path} to={item.path} end={item.end}
                style={({ isActive }: { isActive: boolean }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 2,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.1s',
                  background: isActive ? 'rgba(0,112,243,0.1)' : 'transparent',
                  color: isActive ? '#4da3ff' : '#555',
                })}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <item.icon size={16} weight={isActive ? 'fill' : 'regular'} color={isActive ? '#4da3ff' : '#555'} />
                    <span style={{ color: isActive ? '#4da3ff' : '#555' }}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={S.user}>
        <div style={S.avatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ededed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: '#444', textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</div>
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
                style={{ color: '#333', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                title="Sign out">
          <SignOut size={15} />
        </button>
      </div>
    </aside>
  )
}
`)
ok('Sidebar — pure inline styles')

// ── AppLayout ──────────────────────────────────────────────────
info('Writing AppLayout...')
w(path.join(SRC, 'layouts/AppLayout.tsx'), `
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#050505' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: '#050505' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
`)
ok('AppLayout')

// ── Dashboard ──────────────────────────────────────────────────
info('Writing DashboardPage...')
w(path.join(SRC, 'pages/dashboard/DashboardPage.tsx'), `
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { liaisonApi } from '@/api/liaison.api'
import api from '@/api/client'
import { FileText, Warning, CheckCircle, Clock, Buildings, ArrowRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

interface CardProps {
  label: string; value: string | number; sub: string
  bg: string; iconBg: string; icon: React.ReactNode
}

function StatCard({ label, value, sub, bg, iconBg, icon }: CardProps) {
  return (
    <div style={{ background: bg, borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, marginBottom: 16 }}>
        {icon}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 6, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, activeProjectId } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn:  () => api.get('/api/v1/projects/' + activeProjectId).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: dash } = useQuery({
    queryKey: ['liaison-dash', activeProjectId],
    queryFn:  () => liaisonApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: filesData } = useQuery({
    queryKey: ['liaison-files-dash', activeProjectId],
    queryFn:  () => liaisonApi.files({ projectId: activeProjectId, limit: 8 }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const pct = Number(project?.progressPct ?? 0)

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: 14, color: '#555', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {project && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'rgba(0,112,243,0.1)', border: '1px solid rgba(0,112,243,0.2)', color: '#4da3ff', fontSize: 13, fontWeight: 600 }}>
            <Buildings size={14} />
            {project.code ?? 'STP-NSH-001'}
          </div>
        )}
      </div>

      {/* Project progress */}
      {project && (
        <div style={{ background: '#0d0d0d', borderRadius: 16, padding: '24px 28px', border: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{project.name}</h2>
              <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                {project.client ?? 'LCMA / UEED'} · ₹{((Number(project.contractValue)||0)/1e7).toFixed(2)} Cr
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#4da3ff', lineHeight: 1, fontFamily: 'monospace' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>complete</div>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: '#1a1a1a', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: pct + '%', background: 'linear-gradient(90deg, #0070f3, #50e3c2)', transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#333' }}>
            <span>Start: {project.startDate ?? '—'}</span>
            <span>End: {project.endDate ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Files"  value={dash?.total ?? 0}
          sub="All liaison files"
          bg="linear-gradient(135deg, #0d2040, #071428)"
          iconBg="rgba(0,112,243,0.25)"
          icon={<FileText size={20} weight="fill" color="#4da3ff" />}
        />
        <StatCard label="Under Review" value={dash?.by_status?.under_review ?? 0}
          sub="Awaiting approval"
          bg="linear-gradient(135deg, #2a1c00, #1a1100)"
          iconBg="rgba(245,166,35,0.25)"
          icon={<Clock size={20} weight="fill" color="#f5a623" />}
        />
        <StatCard label="Approved"     value={dash?.by_status?.approved ?? 0}
          sub="Successfully cleared"
          bg="linear-gradient(135deg, #0a2820, #061810)"
          iconBg="rgba(80,227,194,0.25)"
          icon={<CheckCircle size={20} weight="fill" color="#50e3c2" />}
        />
        <StatCard label="Overdue"      value={dash?.overdue ?? 0}
          sub={dash?.overdue > 0 ? 'Needs attention' : 'All on track'}
          bg={dash?.overdue > 0 ? 'linear-gradient(135deg, #2c0a0a, #1c0505)' : 'linear-gradient(135deg, #0a2820, #061810)'}
          iconBg={dash?.overdue > 0 ? 'rgba(255,68,68,0.25)' : 'rgba(80,227,194,0.25)'}
          icon={<Warning size={20} weight="fill" color={dash?.overdue > 0 ? '#ff4444' : '#50e3c2'} />}
        />
      </div>

      {/* Recent files */}
      <div style={{ background: '#0a0a0a', borderRadius: 16, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #111' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Recent Liaison Files</h2>
          <Link to="/liaison" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4da3ff', fontWeight: 500 }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {!filesData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner />
          </div>
        ) : !filesData.files?.length ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#444' }}>No liaison files yet</p>
            <Link to="/liaison" style={{ fontSize: 13, color: '#4da3ff', marginTop: 8, display: 'inline-block' }}>
              Create your first file →
            </Link>
          </div>
        ) : (
          filesData.files.slice(0, 7).map((f: any, i: number) => (
            <Link to="/liaison" key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 24px', cursor: 'pointer',
              borderBottom: i < filesData.files.length - 1 ? '1px solid #0d0d0d' : 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0f0f0f')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: f.priority === 'urgent' ? '#ff4444' : f.priority === 'high' ? '#f5a623' : f.priority === 'medium' ? '#0070f3' : '#222'
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#ededed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{f.subject}</p>
                <p style={{ fontSize: 11, color: '#444', marginTop: 3, margin: 0 }}>
                  {f.fileNumber ?? 'Draft'} · {f.department ?? '—'}{f.currentHolder?.name ? ' · → ' + f.currentHolder.name : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Badge value={f.priority} size="xs" />
                <Badge value={f.currentStatus} size="xs" />
              </div>
            </Link>
          ))
        )}
      </div>

    </div>
  )
}
`)
ok('DashboardPage — colorful cards, proper padding, all inline styles')

// ── LoginPage ──────────────────────────────────────────────────
info('Writing LoginPage...')
w(path.join(SRC, 'pages/auth/LoginPage.tsx'), `
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Buildings, ArrowRight } from '@phosphor-icons/react'
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
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Invalid credentials')
    } finally { setLoad(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative' }}>
      {/* Grid background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      {/* Glow */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,112,243,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 380, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', background: '#0070f3', boxShadow: '0 0 40px rgba(0,112,243,0.4)', marginBottom: 20 }}>
            <Buildings size={24} weight="bold" color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>KIPL ProjectOS</h1>
          <p style={{ fontSize: 14, color: '#444', marginTop: 6 }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 16, padding: '28px 28px' }}>
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#ff6b6b' }}>
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="admin@kipl.in"
                style={{ width: '100%', padding: '12px 14px', background: '#000', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 14, color: '#ededed', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#0070f3'}
                onBlur={e => e.target.style.borderColor = '#1a1a1a'} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input type="password" value={password} onChange={e => setPass(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 14px', background: '#000', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 14, color: '#ededed', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#0070f3'}
                onBlur={e => e.target.style.borderColor = '#1a1a1a'} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px 20px', background: loading ? '#0050c0' : '#0070f3', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
              {loading ? 'Signing in...' : <><span>Sign in</span><ArrowRight size={15} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#222', marginTop: 24 }}>
          Khilari Infrastructure Pvt. Ltd. · Internal Platform
        </p>
      </div>
    </div>
  )
}
`)
ok('LoginPage — polished')

// ── Badge fix ──────────────────────────────────────────────────
info('Fixing Badge component...')
w(path.join(SRC, 'components/ui/Badge.tsx'), `
const MAP: Record<string, { bg: string; color: string; border: string }> = {
  draft:        { bg:'#111',                        color:'#555',    border:'#1a1a1a' },
  submitted:    { bg:'rgba(0,112,243,0.1)',          color:'#4da3ff', border:'rgba(0,112,243,0.2)' },
  under_review: { bg:'rgba(245,166,35,0.1)',         color:'#f5a623', border:'rgba(245,166,35,0.2)' },
  approved:     { bg:'rgba(80,227,194,0.1)',         color:'#50e3c2', border:'rgba(80,227,194,0.2)' },
  rejected:     { bg:'rgba(255,68,68,0.1)',          color:'#ff6b6b', border:'rgba(255,68,68,0.2)' },
  returned:     { bg:'rgba(255,68,68,0.1)',          color:'#ff6b6b', border:'rgba(255,68,68,0.2)' },
  closed:       { bg:'#111',                        color:'#444',    border:'#1a1a1a' },
  dispatched:   { bg:'rgba(80,227,194,0.1)',         color:'#50e3c2', border:'rgba(80,227,194,0.2)' },
  generated:    { bg:'rgba(147,51,234,0.1)',         color:'#a78bfa', border:'rgba(147,51,234,0.2)' },
  pending:      { bg:'rgba(245,166,35,0.1)',         color:'#f5a623', border:'rgba(245,166,35,0.2)' },
  paid:         { bg:'rgba(80,227,194,0.1)',         color:'#50e3c2', border:'rgba(80,227,194,0.2)' },
  low:          { bg:'#111',                        color:'#555',    border:'#1a1a1a' },
  medium:       { bg:'rgba(0,112,243,0.1)',          color:'#4da3ff', border:'rgba(0,112,243,0.2)' },
  high:         { bg:'rgba(245,166,35,0.1)',         color:'#f5a623', border:'rgba(245,166,35,0.2)' },
  urgent:       { bg:'rgba(255,68,68,0.1)',          color:'#ff6b6b', border:'rgba(255,68,68,0.2)' },
  noc:          { bg:'rgba(147,51,234,0.1)',         color:'#a78bfa', border:'rgba(147,51,234,0.2)' },
  approval:     { bg:'rgba(0,112,243,0.1)',          color:'#4da3ff', border:'rgba(0,112,243,0.2)' },
  drawing:      { bg:'rgba(80,227,194,0.1)',         color:'#50e3c2', border:'rgba(80,227,194,0.2)' },
  estimate:     { bg:'rgba(245,166,35,0.1)',         color:'#f5a623', border:'rgba(245,166,35,0.2)' },
  report:       { bg:'#111',                        color:'#555',    border:'#1a1a1a' },
  letter:       { bg:'rgba(147,51,234,0.1)',         color:'#a78bfa', border:'rgba(147,51,234,0.2)' },
  clearance:    { bg:'rgba(255,68,68,0.1)',          color:'#ff6b6b', border:'rgba(255,68,68,0.2)' },
  active:       { bg:'rgba(80,227,194,0.1)',         color:'#50e3c2', border:'rgba(80,227,194,0.2)' },
  other:        { bg:'#111',                        color:'#555',    border:'#1a1a1a' },
}

const fallback = { bg: '#111', color: '#555', border: '#1a1a1a' }

export function Badge({ value, size = 'sm' }: { value?: string; size?: 'xs' | 'sm' }) {
  if (!value) return null
  const key = value.toLowerCase().replace(/[\\s-]/g, '_')
  const s = MAP[key] ?? fallback
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'xs' ? '2px 6px' : '3px 8px',
      borderRadius: 999,
      fontSize: size === 'xs' ? 9 : 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap' as const,
      background: s.bg,
      color: s.color,
      border: '1px solid ' + s.border,
    }}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
`)
ok('Badge — pure inline styles')

// ── Spinner fix ────────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Spinner.tsx'), `
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin">
      <circle cx="12" cy="12" r="10" stroke="#1a1a1a" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#0070f3" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
`)
ok('Spinner')

// ── Button fix ─────────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Button.tsx'), `
import { Spinner } from './Spinner'

type V = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const VS: Record<V, React.CSSProperties> = {
  primary:   { background: '#0070f3', color: '#fff',    border: '1px solid transparent' },
  secondary: { background: '#111',    color: '#ededed', border: '1px solid #222' },
  ghost:     { background: 'transparent', color: '#666', border: '1px solid transparent' },
  danger:    { background: 'rgba(255,68,68,0.08)', color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.2)' },
  success:   { background: 'rgba(80,227,194,0.08)', color: '#50e3c2', border: '1px solid rgba(80,227,194,0.2)' },
}

const SS: Record<string, React.CSSProperties> = {
  xs: { padding: '5px 10px', fontSize: 11, borderRadius: 6, gap: 4 },
  sm: { padding: '7px 14px', fontSize: 12, borderRadius: 8, gap: 6 },
  md: { padding: '10px 20px', fontSize: 13, borderRadius: 10, gap: 8 },
}

interface P extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: V; size?: 'xs' | 'sm' | 'md'; loading?: boolean; icon?: React.ReactNode
}

export function Button({ variant = 'secondary', size = 'sm', loading, icon, children, style, disabled, ...p }: P) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.45 : 1, transition: 'all 0.15s',
        fontFamily: 'inherit',
        ...VS[variant], ...SS[size || 'sm'], ...style,
      }}
    >
      {loading ? <Spinner size={12} /> : icon}
      {children}
    </button>
  )
}
`)
ok('Button')

// ── Input fix ──────────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Input.tsx'), `
interface P extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; hint?: string }
export function Input({ label, error, hint, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <input {...p} style={{ padding: '9px 12px', background: '#050505', border: '1px solid ' + (error ? 'rgba(255,68,68,0.4)' : '#1a1a1a'), borderRadius: 8, fontSize: 13, color: '#ededed', outline: 'none', width: '100%', fontFamily: 'inherit', transition: 'border-color 0.15s', ...style }} />
      {error && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{error}</span>}
      {hint  && <span style={{ fontSize: 11, color: '#444' }}>{hint}</span>}
    </div>
  )
}
`)
ok('Input')

// ── Select fix ─────────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Select.tsx'), `
interface O { value: string; label: string }
interface P extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: O[]; placeholder?: string }
export function Select({ label, options, placeholder, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <select {...p} style={{ padding: '9px 12px', background: '#050505', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 13, color: '#ededed', outline: 'none', width: '100%', fontFamily: 'inherit', cursor: 'pointer', ...style }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
`)
ok('Select')

// ── Textarea fix ───────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Textarea.tsx'), `
interface P extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export function Textarea({ label, error, style, ...p }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <textarea {...p} style={{ padding: '9px 12px', background: '#050505', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 13, color: '#ededed', outline: 'none', width: '100%', fontFamily: 'inherit', resize: 'none', ...style }} />
      {error && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{error}</span>}
    </div>
  )
}
`)
ok('Textarea')

// ── Modal fix ──────────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Modal.tsx'), `
import { X } from '@phosphor-icons/react'
interface P { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number; footer?: React.ReactNode }

export function Modal({ open, onClose, title, children, width = 520, footer }: P) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', border: '1px solid #222', borderRadius: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #111' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#ededed' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>{children}</div>
        {footer && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid #111', background: '#060606' }}>{footer}</div>}
      </div>
    </div>
  )
}
`)
ok('Modal')

// ── StatCard fix ───────────────────────────────────────────────
w(path.join(SRC, 'components/ui/StatCard.tsx'), `
interface P { label: string; value: string|number; sub?: string; color?: string; icon?: React.ReactNode }
export function StatCard({ label, value, sub, color = '#4da3ff', icon }: P) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444' }}>{label}</span>
        {icon && <span style={{ color, opacity: 0.6 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}
`)
ok('StatCard')

// ── Empty fix ──────────────────────────────────────────────────
w(path.join(SRC, 'components/ui/Empty.tsx'), `
interface P { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }
export function Empty({ icon, title, sub, action }: P) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 10 }}>
      {icon && <div style={{ color: '#1a1a1a', marginBottom: 4 }}>{icon}</div>}
      <p style={{ fontSize: 14, fontWeight: 600, color: '#555', margin: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 12, color: '#333', margin: 0 }}>{sub}</p>}
      {action}
    </div>
  )
}
`)
ok('Empty')

console.log('\n' + G + '\x1b[1m  All fixed! Frontend will hot reload.\x1b[0m' + NC)
console.log(B + '  If server is not running: cd frontend && npm run dev' + NC + '\n')

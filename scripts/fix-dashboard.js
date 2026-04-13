// ================================================================
//  KIPL ProjectOS — Dashboard + Sidebar Visual Fix
//  Run: node scripts/fix-dashboard.js
// ================================================================
const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC  = path.join(ROOT, 'frontend', 'src')

const G = '\x1b[32m', NC = '\x1b[0m', B = '\x1b[34m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const info = s => console.log(B + '  →' + NC + ' ' + s)

function w(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c.trimStart(), 'utf8') }

info('Fixing Sidebar spacing...')
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

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full"
           style={{ background: '#0a0a0a', borderRight: '1px solid #1f1f1f' }}>

      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #0070f3, #0050d0)', boxShadow: '0 4px 12px rgba(0,112,243,0.3)' }}>
          <Buildings size={18} weight="bold" color="white" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-white">ProjectOS</div>
          <div className="text-[10px]" style={{ color: '#555' }}>Khilari Infra</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ gap: 0 }}>
        {GROUPS.map(g => (
          <div key={g.label} className="mb-6">
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest"
                 style={{ color: '#3a3a3a', letterSpacing: '0.12em' }}>
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map(item => (
                <NavLink key={item.path} to={item.path} end={item.end}
                  className={({ isActive }: { isActive: boolean }) =>
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-100 ' +
                    (isActive
                      ? 'text-white'
                      : 'text-[#555] hover:text-[#aaa] hover:bg-[#141414]')
                  }
                  style={({ isActive }: { isActive: boolean }) => isActive ? {
                    background: 'rgba(0,112,243,0.12)',
                    color: '#4da3ff',
                  } : {}}
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      <item.icon
                        size={16}
                        weight={isActive ? 'fill' : 'regular'}
                        color={isActive ? '#4da3ff' : 'currentColor'}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
               style={{ background: 'rgba(0,112,243,0.2)', color: '#4da3ff', border: '1px solid rgba(0,112,243,0.3)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white truncate">{user?.name}</div>
            <div className="text-[11px] capitalize" style={{ color: '#555' }}>
              {user?.role?.replace(/_/g, ' ')}
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[#1a1a1a]"
                  style={{ color: '#444' }} title="Sign out">
            <SignOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
`)
ok('Sidebar — better spacing + contrast')

info('Fixing Dashboard with colorful stat cards...')
w(path.join(SRC, 'pages/dashboard/DashboardPage.tsx'), `
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { liaisonApi } from '@/api/liaison.api'
import api from '@/api/client'
import { FileText, Warning, CheckCircle, Clock, Buildings, ArrowRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  gradient: string
  iconBg: string
}

function StatCard({ label, value, sub, icon, gradient, iconBg }: StatCardProps) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: gradient, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div className="text-[30px] font-bold text-white leading-none mb-1 font-mono">{value}</div>
      <div className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[11px] text-white/40 mt-1">{sub}</div>}
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
  const contractCr = ((Number(project?.contractValue) || 0) / 1e7).toFixed(2)

  return (
    <div className="space-y-6 fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-white">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-[14px] mt-1" style={{ color: '#555' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {project && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
               style={{ background: 'rgba(0,112,243,0.12)', border: '1px solid rgba(0,112,243,0.2)', color: '#4da3ff' }}>
            <Buildings size={14} />
            <span>{project.code}</span>
          </div>
        )}
      </div>

      {/* Project card */}
      {project && (
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)', border: '1px solid #1f1f1f' }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold text-white">{project.name}</h2>
              <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>
                {project.location} · {project.client} · ₹{contractCr} Cr
              </p>
            </div>
            <div className="text-right">
              <div className="text-[36px] font-bold font-mono" style={{ color: '#4da3ff' }}>{pct}%</div>
              <div className="text-[11px]" style={{ color: '#444' }}>complete</div>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
            <div className="h-full rounded-full transition-all duration-1000"
                 style={{ width: pct + '%', background: 'linear-gradient(90deg, #0070f3, #50e3c2)' }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px]" style={{ color: '#3a3a3a' }}>
            <span>Start: {project.startDate ?? '—'}</span>
            <span>End: {project.endDate ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Stat cards — colorful like reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Files"
          value={dash?.total ?? '0'}
          sub="All liaison files"
          gradient="linear-gradient(135deg, #1a3a5c 0%, #0d2040 100%)"
          iconBg="rgba(0,112,243,0.3)"
          icon={<FileText size={18} weight="fill" color="#4da3ff" />}
        />
        <StatCard
          label="Under Review"
          value={dash?.by_status?.under_review ?? '0'}
          sub="Awaiting approval"
          gradient="linear-gradient(135deg, #3d2a00 0%, #2a1c00 100%)"
          iconBg="rgba(245,166,35,0.3)"
          icon={<Clock size={18} weight="fill" color="#f5a623" />}
        />
        <StatCard
          label="Approved"
          value={dash?.by_status?.approved ?? '0'}
          sub="Successfully cleared"
          gradient="linear-gradient(135deg, #0d2e28 0%, #071e1a 100%)"
          iconBg="rgba(80,227,194,0.3)"
          icon={<CheckCircle size={18} weight="fill" color="#50e3c2" />}
        />
        <StatCard
          label="Overdue"
          value={dash?.overdue ?? '0'}
          sub={dash?.overdue > 0 ? 'Needs attention!' : 'All on track'}
          gradient={dash?.overdue > 0
            ? 'linear-gradient(135deg, #3a0d0d 0%, #280707 100%)'
            : 'linear-gradient(135deg, #0d2e28 0%, #071e1a 100%)'}
          iconBg={dash?.overdue > 0 ? 'rgba(255,68,68,0.3)' : 'rgba(80,227,194,0.3)'}
          icon={<Warning size={18} weight="fill" color={dash?.overdue > 0 ? '#ff4444' : '#50e3c2'} />}
        />
      </div>

      {/* Recent files */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #141414' }}>
          <h2 className="text-[15px] font-bold text-white">Recent Liaison Files</h2>
          <Link to="/liaison" className="flex items-center gap-1 text-[13px] font-medium transition-colors hover:text-white"
                style={{ color: '#4da3ff' }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {!filesData ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : filesData.files?.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px]" style={{ color: '#444' }}>No liaison files yet</p>
            <Link to="/liaison" className="text-[13px] mt-2 inline-block hover:underline" style={{ color: '#4da3ff' }}>
              Create your first file →
            </Link>
          </div>
        ) : (
          <div>
            {filesData.files?.slice(0, 7).map((f: any, i: number) => (
              <Link to="/liaison" key={f.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#0f0f0f] cursor-pointer"
                style={{ borderBottom: i < filesData.files.length - 1 ? '1px solid #0f0f0f' : 'none' }}>

                {/* Priority dot */}
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                     style={{ background: f.priority === 'urgent' ? '#ff4444' : f.priority === 'high' ? '#f5a623' : f.priority === 'medium' ? '#0070f3' : '#333' }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{f.subject}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#444' }}>
                    {f.fileNumber ?? 'Draft'} · {f.department ?? '—'}
                    {f.currentHolder?.name ? ' · → ' + f.currentHolder.name : ''}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge value={f.priority} size="xs" />
                  <Badge value={f.currentStatus} size="xs" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
`)
ok('DashboardPage — colorful stat cards, proper spacing')

info('Fixing AppLayout max-width and padding...')
w(path.join(SRC, 'layouts/AppLayout.tsx'), `
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050505' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: '#050505' }}>
        <div className="px-8 py-7" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
`)
ok('AppLayout — more padding, better max-width')

info('Fixing StatCard component...')
w(path.join(SRC, 'components/ui/StatCard.tsx'), `
interface P { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }
export function StatCard({ label, value, sub, color = '#0070f3', icon }: P) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#444' }}>{label}</span>
        {icon && <span style={{ color, opacity: 0.6 }}>{icon}</span>}
      </div>
      <div className="text-[28px] font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: '#444' }}>{sub}</div>}
    </div>
  )
}
`)
ok('StatCard updated')

console.log('\n' + G + '\x1b[1m  Done! Restart frontend: cd frontend && npm run dev\x1b[0m\n' + NC)

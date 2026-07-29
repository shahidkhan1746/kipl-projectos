import { lazy, Suspense } from 'react'
import { useAuthStore } from '@/store/auth.store'
import PmDashboard         from '@/pages/dashboard/PmDashboard'
import EngineerDashboard   from '@/pages/staff/dashboards/EngineerDashboard'
import HrDashboard         from '@/pages/staff/dashboards/HrDashboard'
import LiaisonDashboard    from '@/pages/staff/dashboards/LiaisonDashboard'
import AccountsDashboard   from '@/pages/staff/dashboards/AccountsDashboard'
import QaDashboard         from '@/pages/staff/dashboards/QaDashboard'
import SupervisorDashboard from '@/pages/staff/dashboards/SupervisorDashboard'

function RoleDashboardRouter() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'project_manager') return <PmDashboard />
  if (role === 'engineer')        return <EngineerDashboard />
  if (role === 'hr_officer')      return <HrDashboard />
  if (role === 'liaison_officer') return <LiaisonDashboard />
  if (role === 'accounts')        return <AccountsDashboard />
  if (role === 'qa_engineer')     return <QaDashboard />
  if (role === 'supervisor')      return <SupervisorDashboard />
  return null // super_admin gets the full admin dashboard below
}

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { liaisonApi } from '@/api/liaison.api'
import { hrApi } from '@/api/hr.api'
import { wbsApi } from '@/api/wbs.api'
import { settingsApi } from '@/api/settings.api'
import { WeatherWidget } from '@/pages/dashboard/PmDashboard'
import api from '@/api/client'

const WbsChart = lazy(() => import('@/pages/wbs/WbsCharts'))
import { Link } from 'react-router-dom'
import {
  FileText, Users, ArrowRight, Buildings,
  CurrencyInr, MapPin, Envelope, TrendUp,
  CheckSquare, Warning, Clock,
  Briefcase, Receipt,
} from '@phosphor-icons/react'

// ── Colour tokens ──────────────────────────────────────────
const C = {
  blue:   '#2563eb', blueBg:   '#eff6ff', blueBorder:   '#bfdbfe',
  green:  '#059669', greenBg:  '#ecfdf5', greenBorder:  '#a7f3d0',
  amber:  '#d97706', amberBg:  '#fffbeb', amberBorder:  '#fde68a',
  red:    '#dc2626', redBg:    '#fef2f2', redBorder:    '#fecaca',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
  text1:  '#0f172a', text2:    '#475569', text3:    '#94a3b8',
  border: '#e2e8f0', bg:       '#f0f2f5', card:     '#ffffff',
  navy:   '#1a2540',
}

// ── Reusable mini card ─────────────────────────────────────
function KPI({ label, value, sub, color, icon, href }: {
  label: string; value: string | number; sub?: string
  color: string; icon: React.ReactNode; href?: string
}) {
  const inner = (
    <div style={{
      background: C.card, border: '1.5px solid ' + C.border,
      borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: color + '18',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
  return href
    ? <Link to={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
    : inner
}

// ── Section header ─────────────────────────────────────────
function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text1, margin: 0 }}>{title}</h2>
      {href && (
        <Link to={href} style={{ fontSize: 12, color: C.blue, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          View all <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}

function AdminDashboardPage() {
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
    queryKey: ['liaison-files-recent', activeProjectId],
    queryFn:  () => liaisonApi.files({ projectId: activeProjectId, limit: 5 }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: hrDash } = useQuery({
    queryKey: ['hr-dash', activeProjectId],
    queryFn:  () => hrApi.dashboard(activeProjectId ?? undefined).then(r => r.data),
  })

  const { data: wbsDash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn:  () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: weatherKey } = useQuery({
    queryKey: ['setting-weather'],
    queryFn:  () => settingsApi.get('weather_api_key').then(r => r.data?.value ?? ''),
  })

  if (!activeProjectId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Buildings size={40} color={C.text3} weight='duotone' />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, margin: 0 }}>No project selected</h2>
        <p style={{ fontSize: 14, color: C.text3 }}>Log out and log back in to load your project</p>
      </div>
    )
  }

  // Work done (from WBS schedule) and contract time elapsed — both computed live
  const workPct  = Math.round(Number(wbsDash?.overallProgress ?? project?.progressPct ?? 0))
  const pct      = Math.round(Number(wbsDash?.contractPct ?? 0))  // contract time elapsed
  const cv  = ((Number(project?.contractValue) || 850000000) / 1e7).toFixed(2)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className='fade-in dash' style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{DASH_CSS}</style>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 14, color: C.text3, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '8px 14px', borderRadius: 10, background: C.greenBg, border: '1.5px solid ' + C.greenBorder, color: C.green, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={13} />
            {project?.status ?? 'Active'}
          </div>
        </div>
      </div>

      {/* ── Project hero card ───────────────────────────── */}
      <div style={{ background: C.navy, borderRadius: 16, padding: '26px 30px', boxShadow: '0 4px 24px rgba(26,37,64,0.2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Active Project</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 5px' }}>
              {project?.name ?? 'STP Nishat Phase 1'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Client: {project?.client ?? 'LCMA / UEED'} &nbsp;·&nbsp; Contract: ₹{cv} Cr
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#93c5fd', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time Elapsed · {workPct}% work done</div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, width: pct + '%', background: 'linear-gradient(90deg, #3b82f6, #34d399)', transition: 'width 1.2s ease' }} />
        </div>
        <div className='dash-hstats'>
          {[
            { label: 'Start Date',    value: project?.startDate ?? '01 Jan 2024' },
            { label: 'End Date',      value: project?.endDate   ?? '31 Dec 2025' },
            { label: 'Location',      value: 'Nishat, Srinagar' },
            { label: 'Project Code',  value: project?.code ?? 'STP-NSH-001' },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{item.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weather ─────────────────────────────────────── */}
      <WeatherWidget apiKey={weatherKey ?? ''} city="Srinagar,IN" />

      {/* ── KPI grid ──────────────────────────────────── */}
      <div className='dash-4'>
        <KPI label='Liaison Files'  value={dash?.total ?? 0}
          sub={`${dash?.by_status?.under_review ?? 0} under review`}
          color={C.blue}   icon={<FileText size={20} weight='fill' color={C.blue} />}
          href='/liaison' />
        <KPI label='Overdue Files'  value={dash?.overdue ?? 0}
          sub={dash?.overdue > 0 ? 'Needs attention' : 'All on track'}
          color={dash?.overdue > 0 ? C.red : C.green}
          icon={<Warning size={20} weight='fill' color={dash?.overdue > 0 ? C.red : C.green} />}
          href='/liaison' />
        <KPI label='Contract Value' value={'₹' + cv + ' Cr'}
          sub='Total project value'
          color={C.green}  icon={<CurrencyInr size={20} weight='fill' color={C.green} />} />
        <KPI label='Approved Files' value={dash?.by_status?.approved ?? 0}
          sub='Successfully cleared'
          color={C.purple} icon={<CheckSquare size={20} weight='fill' color={C.purple} />}
          href='/liaison' />
      </div>

      {/* ── Second row ────────────────────────────────── */}
      <div className='dash-4'>
        <KPI label='Urgent Files'   value={dash?.urgent ?? 0}
          sub='High priority'
          color={C.red}    icon={<Clock size={20} weight='fill' color={C.red} />}
          href='/liaison' />
        <KPI label='Letters Sent'   value={0}
          sub='Official letters'
          color={C.amber}  icon={<Receipt size={20} weight='fill' color={C.amber} />}
          href='/liaison/letters' />
        <KPI label='Staff Strength'  value={hrDash?.totalEmployees ?? 0}
          sub={`${hrDash?.presentToday ?? 0} present today`}
          color={C.blue}   icon={<Users size={20} weight='fill' color={C.blue} />}
          href='/hr/employees' />
        <KPI label='Schedule Progress' value={(wbsDash?.overallProgress ?? 0) + '%'}
          sub={`${wbsDash?.completed ?? 0}/${wbsDash?.totalTasks ?? 0} tasks`}
          color={C.purple} icon={<TrendUp size={20} weight='fill' color={C.purple} />}
          href='/wbs' />
      </div>

      {/* ── Bottom row: Recent files + Quick actions ── */}
      <div className='dash-bottom'>

        {/* Recent liaison files */}
        <div style={{ background: C.card, borderRadius: 14, border: '1.5px solid ' + C.border, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1.5px solid ' + C.border, background: '#f8f9fc' }}>
            <SectionHead title='Recent Liaison Files' href='/liaison' />
          </div>
          {!filesData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          ) : !filesData.files?.length ? (
            <div style={{ padding: '40px 22px', textAlign: 'center' }}>
              <p style={{ color: C.text3, fontSize: 13 }}>No liaison files yet</p>
              <Link to='/liaison' style={{ fontSize: 13, color: C.blue, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>Create first file →</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border }}>
                  {['Ref No.', 'Subject', 'Department', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filesData.files.slice(0,5).map((f: any, i: number) => (
                  <tr key={f.id} style={{ borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{f.fileNumber ?? 'DRAFT'}</td>
                    <td style={{ padding: '12px 18px', fontSize: 13, color: C.text1, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subject}</td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: C.text2 }}>{f.department ?? '—'}</td>
                    <td style={{ padding: '12px 18px' }}><Badge value={f.currentStatus} size='xs' /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel: Quick actions + Project info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Schedule progress gauge */}
          <div style={{ background: C.card, borderRadius: 14, border: '1.5px solid ' + C.border, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: '0 0 4px' }}>Schedule Progress</h2>
            <Suspense fallback={<div style={{ height: 200 }} />}>
              <WbsChart kind="gauge" pct={Number(wbsDash?.overallProgress ?? 0)}
                completed={wbsDash?.completed ?? 0} total={wbsDash?.totalTasks ?? 0} delayed={wbsDash?.delayed ?? 0} />
            </Suspense>
          </div>

          {/* Quick actions */}
          <div style={{ background: C.card, borderRadius: 14, border: '1.5px solid ' + C.border, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1.5px solid ' + C.border, background: '#f8f9fc' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: 0 }}>Quick Actions</h2>
            </div>
            <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'New Liaison File', Icon: FileText,   href: '/liaison',             color: C.blue   },
                { label: 'Draft Letter',     Icon: Envelope,   href: '/liaison/letters',     color: C.amber  },
                { label: 'Mark Attendance',  Icon: MapPin,     href: '/hr/attendance',       color: C.green  },
                { label: 'View Employees',   Icon: Users,      href: '/hr/employees',        color: C.purple },
                { label: 'BOQ & Costs',      Icon: CurrencyInr,href: '/epc',                 color: C.red    },
                { label: 'Invoices',         Icon: Receipt,    href: '/accounting/invoices', color: C.amber  },
              ].map(action => (
                <Link key={action.label} to={action.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <action.Icon size={17} color={action.color} weight='fill' />
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{action.label}</span>
                  <ArrowRight size={13} style={{ marginLeft: 'auto', color: C.text3 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Liaison breakdown */}
          <div style={{ background: C.card, borderRadius: 14, border: '1.5px solid ' + C.border, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: '0 0 12px' }}>File Status Breakdown</h2>
            {[
              { label: 'Draft',        value: dash?.by_status?.draft        ?? 0, color: C.text3  },
              { label: 'Submitted',    value: dash?.by_status?.submitted    ?? 0, color: C.blue   },
              { label: 'Under Review', value: dash?.by_status?.under_review ?? 0, color: C.amber  },
              { label: 'Approved',     value: dash?.by_status?.approved     ?? 0, color: C.green  },
              { label: 'Returned',     value: dash?.by_status?.returned     ?? 0, color: C.red    },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.text2 }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  )
}
const DASH_CSS = `
.dash-4{display:grid;gap:14px;grid-template-columns:repeat(4,1fr)}
.dash-hstats{display:grid;gap:16px;grid-template-columns:repeat(4,1fr);margin-top:20px}
.dash-bottom{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) 320px}
@media(max-width:900px){
  .dash-4{grid-template-columns:repeat(2,1fr)}
  .dash-bottom{grid-template-columns:1fr}
}
@media(max-width:560px){
  .dash-4{grid-template-columns:1fr 1fr}
  .dash-hstats{grid-template-columns:1fr 1fr}
}
`

export default function DashboardPage() {
  const role = useAuthStore(s => s.user?.role)
  if (role !== 'super_admin') return <RoleDashboardRouter />
  return <AdminDashboardPage />
}

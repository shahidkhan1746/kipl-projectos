import { lazy, Suspense } from 'react'
import { useAuthStore } from '@/store/auth.store'
import PmDashboard         from '@/pages/dashboard/PmDashboard'
import EngineerDashboard   from '@/pages/staff/dashboards/EngineerDashboard'
import HrDashboard         from '@/pages/staff/dashboards/HrDashboard'
import LiaisonDashboard    from '@/pages/staff/dashboards/LiaisonDashboard'
import AccountsDashboard   from '@/pages/staff/dashboards/AccountsDashboard'
import QaDashboard         from '@/pages/staff/dashboards/QaDashboard'
import SupervisorDashboard from '@/pages/staff/dashboards/SupervisorDashboard'
import StaffDashboard      from '@/pages/staff/dashboards/StaffDashboard'

function RoleDashboardRouter() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'project_manager') return <PmDashboard />
  if (role === 'engineer')        return <EngineerDashboard />
  if (role === 'hr_officer')      return <HrDashboard />
  if (role === 'liaison_officer') return <LiaisonDashboard />
  if (role === 'accounts' || role === 'accountant') return <AccountsDashboard />
  if (role === 'qa_engineer')     return <QaDashboard />
  if (role === 'supervisor')      return <SupervisorDashboard />
  return <StaffDashboard />
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
import { Link, useNavigate } from 'react-router-dom'
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

/**
 * A figure this page is willing to print, or null.
 *
 * Everything on this dashboard is read by people making decisions on a live
 * ₹280 Cr government contract, so a missing value is shown as an em dash and
 * never as a plausible-looking default. The previous version fell back to a
 * hard-coded ₹85 Cr contract value, a "STP Nishat Phase 1" project name and
 * 2024/2025 contract dates — all wrong, all indistinguishable from real data.
 */
const n = (v: unknown): number | null => {
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

/** Renders a number, or an em dash when it is genuinely unknown. */
const show = (v: number | null, suffix = '', digits = 0): string =>
  v === null ? '—' : v.toFixed(digits) + suffix

/** The fields this page reads off a liaison file row. */
interface LiaisonFileRow {
  id: string
  fileNumber?: string | null
  subject?: string | null
  department?: string | null
  dueDate?: string | null
  currentStatus?: string | null
}

/** Renders a string field, or an em dash. Never a placeholder. */
const text = (v: unknown): string => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length > 0 ? s : '—'
}

// ── One figure, as tight as it can still be read ───────────
function Stat({ label, value, tone, hint }: {
  label: string; value: string | number; tone?: string; hint?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: C.text2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
        {hint && <span style={{ color: C.text3, fontSize: 11 }}> · {hint}</span>}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: tone ?? C.text1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

// ── A titled group of figures ──────────────────────────────
function Panel({ title, href, icon, children, pad = '12px 14px' }: {
  title: string; href?: string; icon?: React.ReactNode
  children: React.ReactNode; pad?: string
}) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: '1.5px solid ' + C.border,
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1.5px solid ' + C.border, background: '#f8f9fc',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        borderRadius: '10px 10px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {icon}
          <h2 style={{ fontSize: 11.5, fontWeight: 700, color: C.text1, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h2>
        </div>
        {href && (
          <Link to={href} style={{ fontSize: 11, color: C.blue, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            Open <ArrowRight size={11} />
          </Link>
        )}
      </div>
      <div style={{ padding: pad, flex: 1 }}>{children}</div>
    </div>
  )
}

/**
 * Only the things somebody has to act on, and only when there are any.
 *
 * The old layout gave a full-size card to every counter whether it was zero or
 * not, so "1 overdue file" and "0 letters sent" occupied identical space and
 * neither stood out. Zero is not news; it is not shown.
 */
function Attention({ items }: { items: { label: string; count: number | null; href: string; tone: string; bg: string; border: string }[] }) {
  const live = items.filter(i => (i.count ?? 0) > 0)

  if (live.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderRadius: 10, background: C.greenBg, border: '1.5px solid ' + C.greenBorder,
      }}>
        <CheckSquare size={15} weight='fill' color={C.green} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.green }}>
          Nothing needs attention today
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {live.map(i => (
        <Link key={i.label} to={i.href} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px',
          borderRadius: 10, background: i.bg, border: '1.5px solid ' + i.border,
          textDecoration: 'none',
        }}>
          <Warning size={14} weight='fill' color={i.tone} />
          <span style={{ fontSize: 16, fontWeight: 800, color: i.tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{i.count}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{i.label}</span>
        </Link>
      ))}
    </div>
  )
}

function AdminDashboardPage() {
  const { user, activeProjectId } = useAuthStore()
  const nav = useNavigate()
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
    queryFn:  () => liaisonApi.files({ projectId: activeProjectId, limit: 6 }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  // Letters were previously a KPI card hard-coded to 0. Counted for real now.
  const { data: lettersData } = useQuery({
    queryKey: ['liaison-letters-count', activeProjectId],
    queryFn:  () => liaisonApi.letters({ projectId: activeProjectId }).then(r => r.data),
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

  // ── Schedule position ────────────────────────────────────
  const workPct = n(wbsDash?.overallProgress ?? project?.progressPct)
  const timePct = n(wbsDash?.contractPct)
  // The single most important number on this page: how far behind the
  // contract clock the work actually is. It used to be a caption.
  const variance = workPct !== null && timePct !== null ? workPct - timePct : null
  const behind = variance !== null && variance < 0

  const contractCr = (() => {
    const v = n(project?.contractValue)
    return v === null ? null : v / 1e7
  })()

  const letters = Array.isArray(lettersData)
    ? lettersData.length
    : n(lettersData?.total ?? lettersData?.letters?.length)

  const files: LiaisonFileRow[] = Array.isArray(filesData?.files) ? filesData.files : []

  return (
    <div className='fade-in dash' style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{DASH_CSS}</style>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="responsive-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {wbsDash?.daysRemaining != null && <> &nbsp;·&nbsp; {show(n(wbsDash.daysRemaining))} days to contract end</>}
          </p>
        </div>
        <div style={{ padding: '7px 13px', borderRadius: 10, background: C.greenBg, border: '1.5px solid ' + C.greenBorder, color: C.green, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Briefcase size={13} />
          {text(project?.status) === '—' ? 'Active' : project.status}
        </div>
      </div>

      {/* ── Project hero: identity + where the schedule stands ── */}
      <div className='dash-hero'>
        <div className='dash-hero-grid'>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 5px' }}>Active Project</p>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: '0 0 5px' }}>
              {text(project?.name)}
            </h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              {text(project?.client)} &nbsp;·&nbsp; {text(project?.code)} &nbsp;·&nbsp; ₹{show(contractCr, ' Cr', 2)}
            </p>
          </div>

          {/* Work done against contract time — the headline comparison */}
          <div className='dash-variance'>
            <div>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#93c5fd', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {show(workPct, '%', 1)}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Work done</div>
            </div>
            <div>
              <div style={{ fontSize: 34, fontWeight: 900, color: 'rgba(255,255,255,0.55)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {show(timePct, '%', 1)}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Time elapsed</div>
            </div>
            <div>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: variance === null ? 'rgba(255,255,255,0.55)' : behind ? '#fca5a5' : '#6ee7b7' }}>
                {variance === null ? '—' : (variance > 0 ? '+' : '') + variance.toFixed(1) + '%'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {variance === null ? 'Variance' : behind ? 'Schedule Lag' : 'Schedule Lead'}
              </div>
            </div>
          </div>
        </div>

        {/* Actual fill, planned marker. The gap between them is the story. */}
        <div style={{ position: 'relative', height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'visible', marginTop: 4 }}>
          <div style={{
            height: '100%', borderRadius: 999, width: Math.max(0, Math.min(100, workPct ?? 0)) + '%',
            background: behind ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#3b82f6,#34d399)',
            transition: 'width 1.2s ease',
          }} />
          {timePct !== null && (
            <div style={{ position: 'absolute', top: -4, bottom: -4, left: Math.max(0, Math.min(100, timePct)) + '%', width: 2, background: '#fff', opacity: 0.85, borderRadius: 2 }} />
          )}
        </div>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', margin: '7px 0 0' }}>
          Bar is work completed. White marker is contract time elapsed.
        </p>

        <div className='dash-hstats'>
          {[
            { label: 'Start',           value: text(project?.startDate) },
            { label: 'End',             value: text(project?.endDate) },
            { label: 'Days remaining',  value: show(n(wbsDash?.daysRemaining)) },
            { label: 'Location',        value: 'Nishat, Srinagar' },
            { label: 'Milestones hit',  value: `${show(n(wbsDash?.milestonesHit))} / ${show(n(wbsDash?.milestones))}` },
            { label: 'Critical tasks',  value: show(n(wbsDash?.criticalTasks)) },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{item.label}</p>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Only what needs a decision today ────────────── */}
      <Attention items={[
        { label: 'overdue files',    count: n(dash?.overdue),            href: '/liaison',            tone: C.red,    bg: C.redBg,    border: C.redBorder },
        { label: 'urgent files',     count: n(dash?.urgent),             href: '/liaison',            tone: C.red,    bg: C.redBg,    border: C.redBorder },
        { label: 'files returned',   count: n(dash?.by_status?.returned),href: '/liaison',            tone: C.amber,  bg: C.amberBg,  border: C.amberBorder },
        { label: 'delayed tasks',    count: n(wbsDash?.delayed),         href: '/wbs',                tone: C.amber,  bg: C.amberBg,  border: C.amberBorder },
        { label: 'leaves pending',   count: n(hrDash?.pendingLeaves),    href: '/hr/leave',           tone: C.amber,  bg: C.amberBg,  border: C.amberBorder },
        { label: 'salaries in draft',count: n(hrDash?.pendingSalaries),  href: '/hr/salary',          tone: C.purple, bg: C.purpleBg, border: C.purpleBorder },
      ]} />

      {/* ── Four dense groups ──────────────────────────── */}
      <div className='dash-groups'>
        <Panel title='Schedule' href='/wbs' icon={<TrendUp size={14} weight='fill' color={C.purple} />}>
          <Stat label='Work done'      value={show(workPct, '%', 1)} tone={C.purple} />
          <Stat label='Time elapsed'   value={show(timePct, '%', 1)} />
          <Stat label='Tasks complete' value={`${show(n(wbsDash?.completed))} / ${show(n(wbsDash?.totalTasks))}`} />
          <Stat label='In progress'    value={show(n(wbsDash?.inProgress))} tone={C.blue} />
          <Stat label='Delayed'        value={show(n(wbsDash?.delayed))} tone={(n(wbsDash?.delayed) ?? 0) > 0 ? C.red : C.green} />
          <Stat label='On critical path' value={show(n(wbsDash?.criticalTasks))} />
          <Stat label='PERT expected'  value={show(n(wbsDash?.projectExpectedDuration), ' d', 0)} hint='execution window' />
          <Stat label='PERT σ'         value={show(n(wbsDash?.projectStdDeviation), ' d', 1)} />
        </Panel>

        <Panel title='Liaison & approvals' href='/liaison' icon={<FileText size={14} weight='fill' color={C.blue} />}>
          <Stat label='Total files'  value={show(n(dash?.total))} tone={C.blue} />
          <Stat label='Draft'        value={show(n(dash?.by_status?.draft))} tone={C.text3} />
          <Stat label='Submitted'    value={show(n(dash?.by_status?.submitted))} tone={C.blue} />
          <Stat label='Under review' value={show(n(dash?.by_status?.under_review))} tone={C.amber} />
          <Stat label='Approved'     value={show(n(dash?.by_status?.approved))} tone={C.green} />
          <Stat label='Returned'     value={show(n(dash?.by_status?.returned))} tone={C.amber} />
          <Stat label='Rejected'     value={show(n(dash?.by_status?.rejected))} tone={C.red} />
          <Stat label='Letters'      value={show(letters)} hint='drafted & sent' />
        </Panel>

        <Panel title='Workforce today' href='/hr/employees' icon={<Users size={14} weight='fill' color={C.blue} />}>
          <Stat label='Staff strength' value={show(n(hrDash?.totalEmployees))} tone={C.blue} />
          <Stat label='Present'        value={show(n(hrDash?.presentToday))} tone={C.green} />
          <Stat label='Absent'         value={show(n(hrDash?.absentToday))} tone={(n(hrDash?.absentToday) ?? 0) > 0 ? C.red : C.text1} />
          <Stat label='On leave'       value={show(n(hrDash?.onLeaveToday))} tone={C.amber} />
          <Stat label='Attendance'     value={show(n(hrDash?.attendancePct), '%')} />
          <Stat label='Leaves pending' value={show(n(hrDash?.pendingLeaves))} tone={C.amber} />
          <Stat label='Salaries draft' value={show(n(hrDash?.pendingSalaries))} tone={C.purple} />
        </Panel>

      </div>

      {/* ── Recent files + schedule gauge + actions ────── */}
      <div className='dash-bottom'>
        <Panel title='Recent liaison files' href='/liaison' icon={<FileText size={14} weight='fill' color={C.blue} />} pad='0'>
          {!filesData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 34 }}><Spinner /></div>
          ) : files.length === 0 ? (
            <div style={{ padding: '34px 20px', textAlign: 'center' }}>
              <p style={{ color: C.text3, fontSize: 13, margin: 0 }}>No liaison files yet</p>
              <Link to='/liaison' style={{ fontSize: 13, color: C.blue, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>Create first file →</Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border }}>
                    {['Ref No.', 'Subject', 'Department', 'Due', 'Status'].map(h => (
                      <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {files.slice(0, 6).map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: i < Math.min(files.length, 6) - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                      onClick={() => nav('/liaison?file=' + f.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{f.fileNumber ?? 'DRAFT'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12.5, color: C.text1, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subject}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: C.text2 }}>{text(f.department)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 11.5, color: C.text2, whiteSpace: 'nowrap' }}>{text(f.dueDate)}</td>
                      <td style={{ padding: '10px 16px' }}><Badge value={String(f.currentStatus ?? '')} size='xs' /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Panel title='Schedule progress' href='/wbs' icon={<TrendUp size={14} weight='fill' color={C.purple} />}>
            <Suspense fallback={<div style={{ height: 190 }} />}>
              <WbsChart kind="gauge" pct={workPct ?? 0}
                completed={n(wbsDash?.completed) ?? 0} total={n(wbsDash?.totalTasks) ?? 0} delayed={n(wbsDash?.delayed) ?? 0} />
            </Suspense>
          </Panel>

          <Panel title='Quick actions' icon={<CheckSquare size={14} weight='fill' color={C.green} />} pad='6px'>
            {[
              { label: 'New Liaison File', Icon: FileText,    href: '/liaison',             color: C.blue   },
              { label: 'Draft Letter',     Icon: Envelope,    href: '/liaison/letters',     color: C.amber  },
              { label: 'Mark Attendance',  Icon: MapPin,      href: '/hr/attendance',       color: C.green  },
              { label: 'View Employees',   Icon: Users,       href: '/hr/employees',        color: C.purple },
              { label: 'BOQ & Costs',      Icon: CurrencyInr, href: '/epc',                 color: C.red    },
              { label: 'Invoices',         Icon: Receipt,     href: '/accounting/invoices', color: C.amber  },
              { label: 'Site Diary',       Icon: Clock,       href: '/diary',               color: C.blue   },
            ].map(action => (
              <Link key={action.label} to={action.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 9px', borderRadius: 8, textDecoration: 'none',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <action.Icon size={16} color={action.color} weight='fill' />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: C.text1 }}>{action.label}</span>
                <ArrowRight size={12} style={{ marginLeft: 'auto', color: C.text3 }} />
              </Link>
            ))}
          </Panel>
        </div>
      </div>

      {/* Weather sits last: it is real contract data (the site diary logs
          weather hours lost against EOT claims) but it is the least
          decision-critical thing here, so it no longer takes a full band
          above the numbers. */}
      <WeatherWidget apiKey={weatherKey ?? ''} city="Srinagar,IN" />

    </div>
  )
}
const DASH_CSS = `
.dash-hero{background:#1a2540;border-radius:16px;padding:18px;box-shadow:0 4px 24px rgba(26,37,64,0.2)}
.dash-hero-grid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start;margin-bottom:16px}
.dash-variance{display:grid;grid-template-columns:repeat(3,auto);gap:26px;text-align:left}
.dash-hstats{display:grid;gap:14px;grid-template-columns:repeat(6,1fr);margin-top:16px}
.dash-groups{display:grid;gap:14px;grid-template-columns:repeat(3,1fr);align-items:start}
.dash-bottom{display:grid;gap:16px;grid-template-columns:minmax(0,1fr) 330px;align-items:start}
@media(min-width:640px){
  .dash-hero{padding:22px 26px}
}
@media(max-width:1200px){
  .dash-groups{grid-template-columns:repeat(2,1fr)}
  .dash-hstats{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:900px){
  .dash-bottom{grid-template-columns:1fr}
}
@media(max-width:620px){
  .dash-hero-grid{grid-template-columns:1fr}
  .dash-variance{gap:16px}
  .dash-groups{grid-template-columns:1fr}
  .dash-hstats{grid-template-columns:repeat(2,1fr)}
}
`

export default function DashboardPage() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'super_admin' || role === 'admin') return <AdminDashboardPage />
  return <RoleDashboardRouter />
}

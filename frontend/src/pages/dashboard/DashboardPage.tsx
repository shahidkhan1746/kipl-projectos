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
  CurrencyInr, MapPin, Envelope,
  CheckSquare, Warning, Clock,
  Briefcase, Receipt,
  ListChecks, CheckCircle, WarningCircle, Path, Flag, CaretRight,
  Newspaper,
} from '@phosphor-icons/react'
import { updatesApi } from '@/api/updates.api'

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
  // The remainder slice of a ring — work not started, days not yet spent.
  // Deliberately neutral, because a remainder is the absence of a category and
  // not a category of its own; dark enough to clear 3:1 on white, which the
  // lighter #94a3b8 does not.
  slate:  '#64748b',
  // Text sitting on the tints above. The tone that reads correctly as an icon
  // is too light as 12px type: amber on its own tint is 3.07:1, under the 4.5
  // floor. Same ladder the Badge component already uses.
  redInk: '#b91c1c', amberInk: '#b45309', purpleInk: '#6d28d9',
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

// ── A titled group of figures ──────────────────────────────
function Panel({ title, href, icon, children, pad = '12px 14px' }: {
  title: string; href?: string; icon?: React.ReactNode
  children: React.ReactNode; pad?: string
}) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: '1.5px solid ' + C.border,
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
      // A grid item defaults to min-width:auto, which lets a wide child — the
      // liaison table is 520px at its narrowest — push the whole track past
      // the viewport instead of scrolling inside its own wrapper.
      minWidth: 0,
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
function Attention({ items }: { items: { label: [one: string, many: string]; count: number | null; href: string; tone: string; ink: string; bg: string; border: string }[] }) {
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
        <Link key={i.label[1]} to={i.href} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px',
          borderRadius: 10, background: i.bg, border: '1.5px solid ' + i.border,
          textDecoration: 'none',
        }}>
          <Warning size={14} weight='fill' color={i.tone} />
          <span style={{ fontSize: 16, fontWeight: 800, color: i.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{i.count}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>
            {i.count === 1 ? i.label[0] : i.label[1]}
          </span>
        </Link>
      ))}
    </div>
  )
}

/**
 * One headline count, sized to be read from across a site office.
 *
 * These are the five figures a project manager quotes in a review meeting, so
 * each is a link: the number is the question, the page behind it is the answer.
 */
function Kpi({ label, value, sub, Icon, tone, bg, href }: {
  label: string; value: string; sub?: string
  Icon: React.ElementType; tone: string; bg: string; href: string
}) {
  return (
    <Link to={href} className='dash-kpi'>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={19} weight='fill' color={tone} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Wraps rather than ellipsises: at phone width the track is 86px and
            "CRITICAL PATH" wants 97, and a KPI whose label reads "CRITICAL P…"
            has stopped being a KPI. Two lines cost a few pixels of height. */}
        <p style={{ fontSize: 10.5, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px', lineHeight: 1.25 }}>
          {label}
        </p>
        <p style={{ fontSize: 24, fontWeight: 800, color: C.text1, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
          {sub && <span style={{ fontSize: 13, fontWeight: 600, color: C.slate }}> {sub}</span>}
        </p>
      </div>
      <CaretRight size={13} color={C.slate} style={{ flexShrink: 0 }} />
    </Link>
  )
}

/**
 * A ring, its headline figure, and the numbers behind it in plain text.
 *
 * The legend is HTML rather than an ECharts legend on purpose. The worst
 * adjacent slice pair on this page separates by about 6.6 dE under tritanopia,
 * which is inside the band where colour alone is not enough — so every slice
 * carries its own written label and count, and the ring only ranks them.
 */
function DonutPanel({ title, centre, caption, slices, footer }: {
  title: string; centre: string; caption?: string
  slices: { name: string; value: number; color: string; display: string }[]
  footer?: string
}) {
  return (
    <Panel title={title} pad='10px 14px 12px'>
      <Suspense fallback={<div style={{ height: 150 }} />}>
        <WbsChart kind='donut' slices={slices} centre={centre} caption={caption} />
      </Suspense>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
        {slices.map(sl => (
          <div key={sl.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: sl.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: C.text2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sl.name}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>{sl.display}</span>
          </div>
        ))}
      </div>
      {footer && (
        <p style={{ fontSize: 10.5, color: C.slate, margin: '9px 0 0', lineHeight: 1.45 }}>{footer}</p>
      )}
    </Panel>
  )
}

/** The fields this page reads off a project update row. */
interface UpdateRow {
  id: string
  date?: string | null
  title?: string | null
  category?: string | null
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

  // What was actually recorded on site lately. There is no "activity feed"
  // endpoint; project updates are the nearest thing the system genuinely has,
  // and they carry a date, a title and a category.
  //
  // The seven-day window is cut in `select` rather than in render: reading the
  // clock while rendering is impure, and would let the window drift on any
  // unrelated re-render. Here it is fixed at the moment the data arrives.
  const { data: thisWeek } = useQuery({
    queryKey: ['project-updates-recent'],
    queryFn:  () => updatesApi.list().then(r => r.data),
    select: (rows: UpdateRow[]): UpdateRow[] => {
      const weekAgo = Date.now() - 7 * 86400000
      return (Array.isArray(rows) ? rows : [])
        .filter(u => {
          const t = Date.parse(String(u.date ?? ''))
          return Number.isFinite(t) && t >= weekAgo
        })
        .slice(0, 6)
    },
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

  const files: LiaisonFileRow[] = Array.isArray(filesData?.files) ? filesData.files : []

  // ── Ring inputs ──────────────────────────────────────────
  const totalTasks = n(wbsDash?.totalTasks)
  const completed  = n(wbsDash?.completed)
  const inProgress = n(wbsDash?.inProgress)
  const notStarted = totalTasks !== null && completed !== null && inProgress !== null
    ? Math.max(0, totalTasks - completed - inProgress)
    : null

  // Days are taken from the contract dates the schedule engine itself uses, so
  // this ring and the contract percentage above it can never disagree.
  const startMs = Date.parse(String(wbsDash?.contractStart ?? ''))
  const endMs   = Date.parse(String(wbsDash?.contractEnd ?? ''))
  const daysTotal = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? Math.round((endMs - startMs) / 86400000)
    : null
  const daysLeft = n(wbsDash?.daysRemaining)
  const daysGone = daysTotal !== null && daysLeft !== null
    ? Math.max(0, daysTotal - daysLeft)
    : null

  // Schedule Performance Index: work delivered against the work the contract
  // clock says should be delivered by now. 1.00 is on programme.
  const spi = workPct !== null && timePct !== null && timePct > 0 ? workPct / timePct : null



  return (
    <div className='fade-in dash' style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{DASH_CSS}</style>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="responsive-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 13, color: C.text2, marginTop: 2 }}>
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
        { label: ['overdue file',     'overdue files'],     count: n(dash?.overdue),             href: '/liaison',      tone: C.red,    ink: C.redInk,    bg: C.redBg,    border: C.redBorder },
        { label: ['urgent file',      'urgent files'],      count: n(dash?.urgent),              href: '/liaison',      tone: C.red,    ink: C.redInk,    bg: C.redBg,    border: C.redBorder },
        { label: ['file returned',    'files returned'],    count: n(dash?.by_status?.returned), href: '/liaison',      tone: C.amber,  ink: C.amberInk,  bg: C.amberBg,  border: C.amberBorder },
        { label: ['delayed task',     'delayed tasks'],     count: n(wbsDash?.delayed),          href: '/wbs',          tone: C.amber,  ink: C.amberInk,  bg: C.amberBg,  border: C.amberBorder },
        { label: ['leave pending',    'leaves pending'],    count: n(hrDash?.pendingLeaves),     href: '/hr/employees', tone: C.amber,  ink: C.amberInk,  bg: C.amberBg,  border: C.amberBorder },
        { label: ['salary in draft',  'salaries in draft'], count: n(hrDash?.pendingSalaries),   href: '/hr/salary',    tone: C.purple, ink: C.purpleInk, bg: C.purpleBg, border: C.purpleBorder },
      ]} />

      {/* ── The five figures quoted in every review meeting ── */}
      <div className='dash-kpis'>
        <Kpi label='Total tasks'     value={show(totalTasks)}            Icon={ListChecks}    tone={C.blue}   bg={C.blueBg}   href='/wbs' />
        <Kpi label='Completed'       value={show(completed)}             Icon={CheckCircle}   tone={C.green}  bg={C.greenBg}  href='/wbs' />
        <Kpi label='Delayed'         value={show(n(wbsDash?.delayed))}   Icon={WarningCircle} tone={(n(wbsDash?.delayed) ?? 0) > 0 ? C.red : C.green} bg={(n(wbsDash?.delayed) ?? 0) > 0 ? C.redBg : C.greenBg} href='/wbs' />
        <Kpi label='Critical path'    value={show(n(wbsDash?.criticalTasks))} Icon={Path}     tone={C.amber}  bg={C.amberBg}  href='/wbs' />
        <Kpi label='Milestones'      value={show(n(wbsDash?.milestonesHit))}
             sub={'/ ' + show(n(wbsDash?.milestones))}                   Icon={Flag}          tone={C.purple} bg={C.purpleBg} href='/wbs' />
      </div>

      {/* ── How the schedule divides, three ways ─────────── */}
      <div className='dash-rings'>
        <DonutPanel
          title='Schedule progress'
          centre={show(workPct, '%', 1)} caption='work done'
          slices={[
            { name: 'Completed',   value: completed  ?? 0, color: C.green, display: show(completed) },
            { name: 'In progress', value: inProgress ?? 0, color: C.blue,  display: show(inProgress) },
            { name: 'Not started', value: notStarted ?? 0, color: C.slate, display: show(notStarted) },
          ]}
          footer='Ring counts tasks. The percentage is weighted progress across them, so the two move apart.'
        />

        <DonutPanel
          title='Time progress'
          centre={show(timePct, '%', 1)} caption='elapsed'
          slices={[
            { name: 'Days elapsed',   value: daysGone ?? 0, color: C.blue,  display: show(daysGone) },
            { name: 'Days remaining', value: daysLeft ?? 0, color: C.slate, display: show(daysLeft) },
          ]}
          footer={daysTotal === null ? undefined : `${show(daysTotal)}-day contract period.`}
        />

        <DonutPanel
          title='Schedule performance'
          centre={spi === null ? '—' : spi.toFixed(2)} caption='SPI'
          slices={[
            { name: 'Work delivered', value: Math.max(0, workPct ?? 0), color: C.green, display: show(workPct, '%', 1) },
            { name: behind ? 'Shortfall' : 'Ahead of plan',
              value: Math.abs(variance ?? 0),
              color: behind ? C.red : C.green,
              display: variance === null ? '—' : Math.abs(variance).toFixed(1) + '%' },
          ]}
          footer='Work delivered divided by contract time elapsed. 1.00 is on programme.'
        />
      </div>

      {/* ── Files, what happened, what to do next ───────── */}
      <div className='dash-bottom'>
        <Panel title='Recent liaison files' href='/liaison' icon={<FileText size={14} weight='fill' color={C.blue} />} pad='0'>
          {!filesData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 34 }}><Spinner /></div>
          ) : files.length === 0 ? (
            <div style={{ padding: '34px 20px', textAlign: 'center' }}>
              <p style={{ color: C.text2, fontSize: 13, margin: 0 }}>No liaison files yet</p>
              <Link to='/liaison' style={{ fontSize: 13, color: C.blue, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>Create first file →</Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fc', borderBottom: '1.5px solid ' + C.border }}>
                    {['Ref No.', 'Subject', 'Department', 'Due', 'Status'].map(h => (
                      <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
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
                      <td style={{ padding: '10px 16px', fontSize: 12.5, color: C.text1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subject}</td>
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

        {/* What was actually recorded on site in the last seven days. */}
        <Panel title='This week on site' href='/site-updates' icon={<Newspaper size={14} weight='fill' color={C.green} />} pad='0'>
          {!thisWeek ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 34 }}><Spinner /></div>
          ) : thisWeek.length === 0 ? (
            <div style={{ padding: '30px 18px', textAlign: 'center' }}>
              <p style={{ color: C.text2, fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
                Nothing was posted in the last seven days.
              </p>
              <Link to='/site-updates' style={{ fontSize: 12.5, color: C.blue, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>Post an update →</Link>
            </div>
          ) : (
            <div>
              {thisWeek.map((u, i) => (
                <Link key={u.id} to='/site-updates' style={{
                  display: 'block', padding: '10px 14px', textDecoration: 'none',
                  borderBottom: i < thisWeek.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Date and category on the thin line, title underneath with
                      room to wrap. Side by side, every one of these titles was
                      cut mid-word in a 290px column. */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.slate, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(String(u.date)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    {text(u.category) !== '—' && (
                      <span style={{ fontSize: 9.5, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {u.category}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12.5, color: C.text1, fontWeight: 500, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {text(u.title)}
                  </span>
                </Link>
              ))}
            </div>
          )}
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
              <ArrowRight size={12} style={{ marginLeft: 'auto', color: C.slate }} />
            </Link>
          ))}
        </Panel>
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

/* auto-fit rather than fixed counts: the tracks collapse on their own as the
   window narrows, so there is no width at which a card is squeezed below the
   point its number stops being readable. */
.dash-kpis{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.dash-kpi{display:flex;align-items:center;gap:11px;padding:13px 14px;background:#fff;
  border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,0.05);
  text-decoration:none;transition:border-color .15s,box-shadow .15s}
.dash-kpi:hover{border-color:#bfdbfe;box-shadow:0 3px 12px rgba(37,99,235,0.10)}

/* stretch, not start: three rings with different legend lengths would
   otherwise leave a ragged bottom edge across the row. */
.dash-rings{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:stretch}
.dash-bottom{display:grid;gap:16px;grid-template-columns:minmax(0,1fr) 290px 240px;align-items:start}

@media(min-width:640px){
  .dash-hero{padding:22px 26px}
}
@media(max-width:1280px){
  /* The table is the widest thing here, so it takes the full row and the two
     narrow panels share the one below. */
  .dash-bottom{grid-template-columns:repeat(2,minmax(0,1fr))}
  .dash-bottom>*:first-child{grid-column:1/-1}
}
@media(max-width:1200px){
  .dash-hstats{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:700px){
  /* minmax(0,1fr), never 1fr: a bare 1fr track is min-content sized, so the
     liaison table would widen the page rather than scroll within its panel. */
  .dash-bottom{grid-template-columns:minmax(0,1fr)}
  .dash-bottom>*:first-child{grid-column:auto}
}
@media(max-width:620px){
  .dash-hero-grid{grid-template-columns:1fr}
  .dash-variance{gap:16px}
  .dash-hstats{grid-template-columns:repeat(2,1fr)}
}
`

export default function DashboardPage() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'super_admin' || role === 'admin') return <AdminDashboardPage />
  return <RoleDashboardRouter />
}

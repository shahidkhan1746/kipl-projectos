import { toast } from '@/lib/notify'
import { useState, useRef, useMemo, lazy, Suspense } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChartBar, Flag, Warning, Download, ArrowCounterClockwise, Path, ChartLine, FilePdf, CurrencyInr, ShieldCheck } from '@phosphor-icons/react'
import { wbsApi } from '@/api/wbs.api'
import { epcApi } from '@/api/epc.api'
import { aiApi } from '@/api/ai.api'
import { settingsApi } from '@/api/settings.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, DatePicker } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/date'
import { ScheduleSummary, ScheduleHealth, CpmTimeline, CpmNetwork, CpmLegend } from './CpmViews'
import { svgToPng } from './cpmExport'
import type { CpmData, BaselineDates, TimelineMarkers } from './CpmViews'
import { rowFromTask, rolledUpProgress, clause16Checkpoints, describeVariance, orderRows } from './cpmLayout'
import type { CpmRow } from './cpmLayout'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
  critical: '#dc2626', criticalBg: '#fef2f2',
}

const STATUS_COLORS: Record<string, { bg:string; color:string; border:string }> = {
  not_started: { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
  in_progress: { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  completed:   { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  delayed:     { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
  on_hold:     { bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
}

const STATUS_OPTIONS = [
  { value:'not_started', label:'Not Started' },
  { value:'in_progress', label:'In Progress' },
  { value:'completed',   label:'Completed'   },
  { value:'delayed',     label:'Delayed'     },
  { value:'on_hold',     label:'On Hold'     },
]

type Tab = 'gantt' | 'list' | 'milestones' | 'cpm' | 'pert' | 'eot' | 'ld' | 'dlp'

const WbsChart = lazy(() => import('./WbsCharts'))
const ChartFallback = () => <div style={{ padding:50, textAlign:'center' }}><Spinner /></div>

const CALENDAR_OPTIONS = [
  { value:'seven_day', label:'7-day week' },
  { value:'six_day', label:'6-day week (Sundays off)' },
  { value:'winter_restricted', label:'Winter-restricted (no work Dec–Feb)' },
]
const SCOPE_OPTIONS = [
  { value:'contract', label:'Contract work (inside the 30 months)' },
  { value:'post_completion', label:'After completion (trial run, O&M)' },
]
const DRIVER_LABEL: Record<string, string> = {
  'project-start':'Contract start', 'data-date':'Data date', approval:'Approval', constraint:'Constraint', actual:'Actual dates', summary:'—',
}
const SCHED_STATUS: Record<string, { label:string; bg:string; color:string }> = {
  complete:    { label:'Done',        bg:'#ecfdf5', color:'#047857' },
  in_progress: { label:'In progress', bg:'#eff6ff', color:'#1d4ed8' },
  not_started: { label:'Not started', bg:'#f1f5f9', color:'#475569' },
}
const fmtDeps = (deps: any[] | undefined) =>
  (deps ?? []).map((d: any) => `${d.code}${d.type && d.type !== 'FS' ? ' ' + d.type : ''}${d.lag ? (d.lag > 0 ? '+' : '') + d.lag : ''}`).join(', ')

/** A toggle in a toolbar. */
function Chip({ active, onClick, children, tone = 'blue', title }: { active: boolean; onClick: () => void; children: ReactNode; tone?: 'blue' | 'red'; title?: string }) {
  const c = tone === 'red' ? C.red : C.blue
  return (
    <button onClick={onClick} title={title} style={{
      padding:'5px 11px', fontSize:11, fontWeight:700, borderRadius:7, cursor:'pointer', border:'1px solid', whiteSpace:'nowrap',
      borderColor: active ? c : '#cbd5e1', background: active ? (tone === 'red' ? '#fef2f2' : '#eff6ff') : '#fff', color: active ? c : C.text2,
    }}>{children}</button>
  )
}

/** Whether an EOT item sits on the current longest path — or that nobody has assessed it. */
function CpTag({ v }: { v: boolean | null | undefined }) {
  if (v === true) return <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700, background:'#fee2e2', color:C.red }}>ON PATH</span>
  if (v === false) return <span style={{ fontSize:10.5, color:C.text3 }}>No</span>
  return <span style={{ fontSize:10.5, color:C.text3, fontStyle:'italic' }} title="Not linked to an activity, or not recorded">not assessed</span>
}

/** Duration, calendar, scope and constraint: the inputs the scheduler actually uses. */
function ScheduleFields({ form, setForm, isMilestone }: { form: any; setForm: (fn: (f: any) => any) => void; isMilestone?: boolean }) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }))
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'12px 14px', background:'#f8fafc', border:'1.5px solid '+C.border, borderRadius:10 }}>
      <div style={{ display:'grid', gridTemplateColumns:'150px 1fr', gap:12 }}>
        <Input label={isMilestone ? 'Duration (0 for a milestone)' : 'Duration (working days) *'} type="number" min={0} value={form.plannedDuration}
          onChange={set('plannedDuration')} placeholder={isMilestone ? '0' : 'e.g. 90'} />
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Calendar</label>
          <select value={form.calendar} onChange={set('calendar')} style={selStyle}>
            {CALENDAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Scope</label>
        <select value={form.scheduleScope} onChange={set('scheduleScope')} style={selStyle}>
          {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Date constraint</label>
          <select value={form.constraintType ?? ''} onChange={set('constraintType')} style={selStyle}>
            <option value="">None — logic only</option>
            <option value="SNET">Start no earlier than</option>
            <option value="FNLT">Finish no later than</option>
          </select>
        </div>
        {form.constraintType ? <Input label="Constraint date" type="date" value={form.constraintDate} onChange={set('constraintDate')} /> : <div />}
      </div>
      <p style={{ fontSize:11, color:C.text3, margin:0 }}>Dates come from the logic and these durations. Use a constraint only for a real outside date, such as a statutory approval window.</p>
    </div>
  )
}

/** −  100%  +  Fit */
function ZoomControl({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  const b: CSSProperties = { border:'none', background:'none', padding:'4px 9px', cursor:'pointer', fontSize:14, fontWeight:700, color:C.text1 }
  return (
    <div style={{ display:'flex', alignItems:'center', background:'#f8fafc', borderRadius:8, padding:2, border:'1.5px solid '+C.border }}>
      <button style={b} title="Zoom out" onClick={() => onZoom(Math.max(0.5, +(zoom / 1.25).toFixed(2)))}>−</button>
      <span style={{ fontSize:11, fontWeight:700, color:C.text2, minWidth:38, textAlign:'center', fontVariantNumeric:'tabular-nums' }}>{Math.round(zoom * 100)}%</span>
      <button style={b} title="Zoom in" onClick={() => onZoom(Math.min(4, +(zoom * 1.25).toFixed(2)))}>+</button>
      <div style={{ width:1, height:14, background:'#cbd5e1' }} />
      <button style={{ ...b, fontSize:11, fontWeight:600, color:C.text2, display:'flex', alignItems:'center', gap:3 }} title="Fit to width" onClick={() => onZoom(1)}>
        <ArrowCounterClockwise size={12}/> Fit
      </button>
    </div>
  )
}

const DEP_TYPES = [
  { value:'FS', label:'FS — Finish → Start (default)' },
  { value:'SS', label:'SS — Start → Start' },
  { value:'FF', label:'FF — Finish → Finish' },
  { value:'SF', label:'SF — Start → Finish' },
]

const selStyle: CSSProperties = { padding:'8px 10px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:12, background:'#fff', width:'100%', fontFamily:'inherit', cursor:'pointer' }

// Convert legacy comma-separated predecessor codes → structured deps (FS/0).
function parseDeps(task: any): any[] {
  if (Array.isArray(task?.dependencies) && task.dependencies.length > 0) {
    return task.dependencies.map((d: any) => ({ code: String(d.code), type: d.type ?? 'FS', lag: Number(d.lag) || 0 }))
  }
  return String(task?.predecessors ?? '')
    .split(',').map((s: string) => s.trim()).filter(Boolean)
    .map((code: string) => ({ code, type: 'FS', lag: 0 }))
}

// Predecessor picker: task + relationship type + lag/lead, no free-text codes.
function DependencyEditor({ value, onChange, options, selfCode }: {
  value: any[]; onChange: (v: any[]) => void; options: any[]; selfCode?: string
}) {
  const deps = Array.isArray(value) ? value : []
  const avail = options.filter(o => o.wbsCode !== selfCode)
  const update = (i: number, patch: any) => onChange(deps.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  const remove = (i: number) => onChange(deps.filter((_, idx) => idx !== i))
  const add = () => onChange([...deps, { code: avail[0]?.wbsCode ?? '', type: 'FS', lag: 0 }])
  return (
    <div>
      <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
        Dependencies <span style={{ color:C.text3, fontWeight:400 }}>(predecessor · relationship · lag days)</span>
      </label>
      {deps.length === 0 && (
        <p style={{ fontSize:12, color:C.text3, margin:'0 0 8px' }}>No predecessors — starts at the contract start unless a constraint says otherwise. Schedule health flags this as an open start.</p>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {deps.map((d, i) => (
          <div key={i} className="responsive-form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 118px 74px 30px', gap:8, alignItems:'center' }}>
            <select value={d.code} onChange={e => update(i, { code: e.target.value })} style={selStyle}>
              {avail.map(o => <option key={o.wbsCode} value={o.wbsCode}>{o.wbsCode} — {o.title}</option>)}
            </select>
            <select value={d.type} onChange={e => update(i, { type: e.target.value })} style={selStyle}
              title={DEP_TYPES.find(t => t.value === d.type)?.label}>
              {DEP_TYPES.map(t => <option key={t.value} value={t.value} title={t.label}>{t.value}</option>)}
            </select>
            <input type="number" value={d.lag}
              onChange={e => update(i, { lag: parseInt(e.target.value) || 0 })}
              title="Lag in days (negative = lead)"
              style={{ ...selStyle, textAlign:'center', cursor:'text' }} placeholder="lag" />
            <button onClick={() => remove(i)} title="Remove"
              style={{ width:30, height:30, border:'1.5px solid '+C.border, borderRadius:8, background:'#fff', color:C.red, cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
          </div>
        ))}
      </div>
      <button onClick={add} disabled={avail.length === 0}
        style={{ marginTop:8, padding:'7px 12px', border:'1.5px dashed '+C.border, borderRadius:8, background:'#f8fafc', color:C.blue, cursor: avail.length ? 'pointer' : 'not-allowed', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
        <Plus size={13} weight="bold" /> Add dependency
      </button>
    </div>
  )
}

export default function WbsPage() {
  const { activeProjectId } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab]                 = useState<Tab>('gantt')
  const [ganttFilter, setGanttFilter] = useState<'all' | 'critical' | 'milestones' | 'level1'>('all')
  const [ganttZoom, setGanttZoom]     = useState(1)
  const [pertTargetDays, setPertTargetDays] = useState<number | null>(null)
  const [editTask, setEdit]           = useState<any>(null)
  const [editForm, setEditForm]       = useState<any>({})
  const [showNew, setShowNew]         = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [pdfLoading, setPdfLoading]   = useState('')
  const [cpmFilter, setCpmFilter]     = useState<'all' | 'contract' | 'critical'>('all')
  const [cpmView, setCpmView]         = useState<'timeline' | 'network'>('timeline')
  const [cpmZoom, setCpmZoom]         = useState(1)
  const [baselineId, setBaselineId]   = useState('')
  const [showBaseline, setShowBaseline] = useState(false)
  const [baselineForm, setBaselineForm] = useState({ name:'', notes:'' })
  const cpmSvgRef                     = useRef<SVGSVGElement | null>(null)
  const EMPTY_TASK = {
    wbsCode:'', title:'', level:2, plannedDuration:'', plannedStart:'', plannedEnd:'',
    calendar:'seven_day', scheduleScope:'contract', constraintType:'', constraintDate:'',
    status:'not_started', progressPct:'0', responsible:'', remarks:'', description:'',
    dependencies: [],
  }
  const [newForm, setNewForm]         = useState<any>(EMPTY_TASK)

  const { data: dash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn:  () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })
  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['wbs', activeProjectId],
    queryFn:  () => wbsApi.list(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })
  const { data: cpmData } = useQuery({
    queryKey: ['wbs-cpm', activeProjectId],
    queryFn:  () => wbsApi.cpm(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'cpm',
  })
  const { data: pertData } = useQuery({
    queryKey: ['wbs-pert', activeProjectId],
    queryFn:  () => wbsApi.pert(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'pert',
  })
  const { data: eotData } = useQuery({
    queryKey: ['wbs-eot', activeProjectId],
    queryFn:  () => wbsApi.eotRegister(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'eot',
  })
  const { data: baselines } = useQuery({
    queryKey: ['wbs-baselines', activeProjectId],
    queryFn:  () => wbsApi.baselines(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId && tab === 'cpm',
  })
  const { data: baselineVar } = useQuery({
    queryKey: ['wbs-baseline-var', baselineId],
    queryFn:  () => wbsApi.baselineVariance(baselineId).then(r => r.data),
    enabled:  !!baselineId && tab === 'cpm',
  })
  const { data: contractValueRaw } = useQuery({
    queryKey: ['contract-value'],
    queryFn:  () => settingsApi.get('project.contract_value').then(r => r.data?.value ?? null),
    enabled:  tab === 'ld',
  })
  const [ldDelayDays, setLdDelayDays] = useState('')

  // ── AI: draft EOT justification narrative from the register ──
  const [eotNarr, setEotNarr] = useState('')
  const [eotBusy, setEotBusy] = useState(false)
  const [showEotNarr, setShowEotNarr] = useState(false)
  async function draftEotNarrative() {
    if (!eotData) { return }
    setEotBusy(true)
    try {
      const cp = (v: boolean | null | undefined) => v === true ? ' [on the current longest path]' : v === false ? ' [not on the longest path]' : ' [critical-path impact not assessed]'
      const day = (d: any) => d ? String(d).split('T')[0] : '?'
      const ap = (eotData.approvalDelays ?? []).map((x: any) => `Approval: ${x.subject} (${x.department || ''}) expected ${day(x.expectedDate)}, ${x.actualDate ? 'received ' + day(x.actualDate) : 'still pending'}, ${x.delayDays}d delay${x.isEotGround ? ' [EOT ground]' : ''}${cp(x.criticalPathImpact)}`).join('\n')
      const wd = (eotData.weatherDelays ?? []).map((x: any) => `Weather: ${x.ref} — ${x.reason}, ${x.eotDays}d${cp(x.criticalPathImpact)}`).join('\n')
      const td = (eotData.taskDelays ?? []).map((x: any) => `Task ${x.ref} ${x.subject}: ${x.delayDays}d forecast slip${x.eotApplied ? `, EOT ${x.eotDays}d claimed` : ''}${cp(x.criticalPathImpact)}${x.reason ? ` — ${x.reason}` : ''}`).join('\n')
      const tot = eotData.totals ?? {}
      const system = 'You draft formal Extension of Time (EOT) justification narratives under Clause 16 of a J&K UEED EPC contract, for a contractor (Khilari Infrastructure Pvt. Ltd.) on the Dal Lake Sewerage Scheme. Professional and factual. Use only the data given. State critical-path impact only for items marked as on the current longest path; for items marked "not assessed", say that a time-impact assessment is to follow — never assert impact that is not in the data. Criticality here comes from the current forecast, not a time-impact analysis at the date of each delay, so do not call it one. Output the narrative body only.'
      const prompt = `Draft an EOT justification narrative.\nEOT sought: ${tot.claimableEotDays || 0} days (gross ${tot.grossEotDays || 0} days, less ${tot.overlapDays || 0} days where delays overlap, counted once). Contract completion: ${eotData.contractEnd}.\nBasis of the register: ${eotData.basis ?? ''}\n\nApproval / statutory delays:\n${ap || 'none'}\n\nWeather stoppages (site diary):\n${wd || 'none'}\n\nSite / task delays:\n${td || 'none'}\n\nExplain why these hindrances were beyond the contractor's control and the extension sought, within the limits above.`
      const r = await aiApi.generate(prompt, system)
      setEotNarr((r.data?.text ?? '').trim()); setShowEotNarr(true)
    } catch (e: any) {
      toast.error('AI draft failed: ' + (e?.response?.data?.message ?? e?.message))
    } finally { setEotBusy(false) }
  }
  // ── AI: schedule health + recovery plan + per-task details ──
  const [aiOut, setAiOut]         = useState('')
  const [aiTitle, setAiTitle]     = useState('')
  const [aiBusy, setAiBusy]       = useState('')   // '' | 'health' | 'recovery'
  const [showAiOut, setShowAiOut] = useState(false)
  const [taskAiBusy, setTaskAiBusy] = useState(false)

  function scheduleData(): string {
    const d: any = dash || {}
    const lines = (list as any[]).map((t: any) => {
      const s = String(t.forecastStart ?? t.plannedStart ?? '').split('T')[0]
      const e = String(t.forecastFinish ?? t.plannedEnd ?? '').split('T')[0]
      const crit = (t.isCritical ?? t.critical) ? ' [critical]' : ''
      const ms = t.isMilestone ? ' [milestone]' : ''
      return `${t.wbsCode ?? ''} ${t.title ?? ''} — ${Math.round(Number(t.progressPct) || 0)}%${ms}${crit} (${s}→${e}, ${t.status ?? ''})`
    }).join('\n')
    const v = describeVariance(d.contractVarianceDays)
    return `KPIs: contract time elapsed ${d.contractPct}%, overall progress ${d.overallProgress}%, ${d.daysRemaining} days remaining. Completed ${d.completed}/${d.totalTasks}, in progress ${d.inProgress}, delayed ${d.delayed}, on the longest path ${d.criticalTasks}, milestones achieved ${d.milestonesHit}/${d.milestones} (${d.milestonesOverdue ?? 0} overdue).\nContract: ${d.contractStart ?? '?'} → ${d.contractEnd ?? '?'}${d.contractDatesSource === 'default' ? ' (built-in dates; not yet set on the project record)' : ''}.\nCPM forecast completion: ${d.forecastFinish ?? 'not computed'} (${v.text} against the contract).\n\nTasks (forecast dates):\n${lines}`
  }

  async function analyzeSchedule() {
    setAiBusy('health')
    try {
      const system = 'You are a senior planning engineer for the Dal Lake Sewerage Scheme (38.5 MLD SBR STP, KIPL / J&K UEED EPC). Analyse schedule health for management. Be factual and concise; use short labelled sections and bullets. Compare overall progress against contract time elapsed, quantify the slippage, flag risks to the critical path and to milestones, and list the top risks/actions. Do not invent data beyond what is given.'
      const r = await aiApi.generate(`Write a schedule health brief.\n\n${scheduleData()}`, system)
      setAiTitle('AI — Schedule Health Analysis'); setAiOut((r.data?.text ?? '').trim()); setShowAiOut(true)
    } catch (e: any) { toast.error('AI failed: ' + (e?.response?.data?.message ?? e?.message)) }
    finally { setAiBusy('') }
  }

  async function draftRecoveryPlan() {
    setAiBusy('recovery')
    try {
      const system = 'You are a construction planning manager. From the schedule data, propose a practical recovery / catch-up plan for the Dal Lake Sewerage Scheme (KIPL / J&K UEED EPC). Give concrete, numbered acceleration measures — resequencing, parallel crews, extra shifts, procurement pull-ins, milestone re-baselining — prioritising critical-path and delayed tasks. Be realistic for a Srinagar site (monsoon and winter shutdown windows). Do not invent data.'
      const r = await aiApi.generate(`Propose a recovery plan to pull the programme back on track.\n\n${scheduleData()}`, system)
      setAiTitle('AI — Recovery / Catch-up Plan'); setAiOut((r.data?.text ?? '').trim()); setShowAiOut(true)
    } catch (e: any) { toast.error('AI failed: ' + (e?.response?.data?.message ?? e?.message)) }
    finally { setAiBusy('') }
  }

  async function generateTaskDetails() {
    if (!newForm.title?.trim()) { toast.error('Enter a task title first'); return }
    setTaskAiBusy(true)
    try {
      const system = 'You are a construction method engineer for a sewage treatment plant EPC (Dal Lake Sewerage Scheme, 38.5 MLD SBR STP, Srinagar). Given a task title, write a short brief with three labelled parts — Scope (what the work covers), Method (how it is typically executed), Risks (key site risks and controls). Tight and practical, plain text, no markdown headers.'
      const r = await aiApi.generate(`Task: ${newForm.wbsCode ? newForm.wbsCode + ' ' : ''}${newForm.title}\n\nWrite the Scope / Method / Risks brief.`, system)
      setNewForm((f: any) => ({ ...f, description: (r.data?.text ?? '').trim() }))
      toast.success('Draft added to Description — review & edit')
    } catch (e: any) { toast.error('AI failed: ' + (e?.response?.data?.message ?? e?.message)) }
    finally { setTaskAiBusy(false) }
  }

  const { data: raBillsDlp } = useQuery({
    queryKey: ['ra-bills-dlp', activeProjectId],
    queryFn:  () => epcApi.raBills(activeProjectId!).then(r => r.data).catch(() => []),
    enabled:  !!activeProjectId && tab === 'dlp',
  })
  const [completionDate, setCompletionDate] = useState('')
  const [labourCleared, setLabourCleared] = useState(false)

  // Every schedule view is derived from the same calculation, so a write refreshes them all.
  function invalidateSchedule() {
    for (const k of ['wbs', 'wbs-dash', 'wbs-cpm', 'wbs-pert', 'wbs-eot', 'wbs-baseline-var']) qc.invalidateQueries({ queryKey: [k] })
  }
  /** Numbers as numbers and empty optional fields as absent, so validation reads what the user meant. */
  function taskPayload(f: any) {
    const out: any = { ...f }
    if (out.plannedDuration === '' || out.plannedDuration === undefined) delete out.plannedDuration
    else out.plannedDuration = Math.max(0, parseInt(out.plannedDuration) || 0)
    if (!out.constraintType) { out.constraintType = null; out.constraintDate = null }
    for (const k of ['plannedStart', 'plannedEnd']) if (out[k] === '') delete out[k]
    return out
  }

  const seedM = useMutation({
    mutationFn: (force: boolean) => wbsApi.seed(activeProjectId!, force),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wbs'] }); qc.invalidateQueries({ queryKey: ['wbs-dash'] }) },
  })
  const updateM = useMutation({
    mutationFn: () => wbsApi.update(editTask.id, taskPayload(editForm)),
    onSuccess: () => { invalidateSchedule(); setEdit(null) },
    onError: (e: any) => toast.error('Could not save: ' + (e?.response?.data?.message ?? e?.message)),
  })
  const createM = useMutation({
    mutationFn: () => wbsApi.create(taskPayload({ ...newForm, projectId: activeProjectId, progressPct: parseFloat(newForm.progressPct)||0 })),
    onSuccess: () => { invalidateSchedule(); setShowNew(false); setNewForm(EMPTY_TASK) },
    onError: (e: any) => toast.error('Could not add the activity: ' + (e?.response?.data?.message ?? e?.message)),
  })
  const recalcM = useMutation({
    mutationFn: () => wbsApi.recalculate(activeProjectId!),
    onSuccess: (r: any) => {
      invalidateSchedule()
      const d = r?.data
      if (d && d.ok === false) toast.error('The schedule has errors — see Schedule health on the Critical Path tab.')
      else if (d?.forecastFinish) toast.success(`Recalculated. Forecast completion ${formatDate(d.forecastFinish)} — ${describeVariance(d.contractVarianceDays).text}.`)
    },
  })
  const baselineM = useMutation({
    mutationFn: () => wbsApi.createBaseline(activeProjectId!, baselineForm.name.trim(), baselineForm.notes.trim() || undefined),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['wbs-baselines'] })
      setShowBaseline(false); setBaselineForm({ name:'', notes:'' })
      if (r?.data?.id) setBaselineId(r.data.id)
      toast.success('Baseline saved. The timeline now compares against it.')
    },
    onError: (e: any) => toast.error('Could not save the baseline: ' + (e?.response?.data?.message ?? e?.message)),
  })
  const enablingM = useMutation({
    mutationFn: () => wbsApi.addEnabling(activeProjectId!),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['wbs'] }); qc.invalidateQueries({ queryKey: ['wbs-dash'] })
      qc.invalidateQueries({ queryKey: ['wbs-cpm'] }); qc.invalidateQueries({ queryKey: ['wbs-eot'] })
      if ((r?.data?.added ?? 0) === 0) toast.error('Phase 0 enabling works are already present.')
    },
    onError: (e: any) => toast.error('Could not add Phase 0: ' + (e?.response?.data?.message ?? e?.message)),
  })

  async function downloadPdf(type: 'gantt-full' | 'gantt-quart' | 'report') {
    setPdfLoading(type)
    try {
      const fn = type === 'gantt-full' ? wbsApi.ganttFullPdf : type === 'gantt-quart' ? wbsApi.ganttQuartPdf : wbsApi.reportPdf
      const res = await fn(activeProjectId!)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `DalLake_${type}_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setShowDownload(false)
    } catch (e) {
      toast.error('PDF generation failed: ' + (e as any)?.message)
    } finally {
      setPdfLoading('')
    }
  }

  // Client-side graphical A3 report (Gantt + CPM network + PERT curve) via echarts + jsPDF
  async function downloadGraphicalReport() {
    setPdfLoading('graphical')
    try {
      const [cpm, pert] = await Promise.all([
        wbsApi.cpm(activeProjectId!).then(r => r.data),
        wbsApi.pert(activeProjectId!).then(r => r.data),
      ])
      const { generateMonthlyReport } = await import('./wbsPdf')
      await generateMonthlyReport({
        projectName: 'Dal Lake Sewerage Scheme — 38.5 MLD STP',
        client: 'J&K UEED',
        allotment: 'CE/UEED/PS/01 of 2025-26',
        cpm, pert,
        kpis: {
          overallProgress: Math.round(Number(dash?.overallProgress ?? 0)),
          contractPct: Math.round(Number(dash?.contractPct ?? 0)),
          daysRemaining: Number(dash?.daysRemaining ?? 0),
          completed: Number(dash?.completed ?? 0), total: Number(dash?.totalTasks ?? 0),
          milestonesHit: `${dash?.milestonesHit ?? 0}/${dash?.milestones ?? 0}`,
        },
      })
      setShowDownload(false)
    } catch (e) {
      toast.error('Report generation failed: ' + (e as any)?.message)
    } finally {
      setPdfLoading('')
    }
  }

  const cpm = cpmData as CpmData | undefined
  const cpmRows = useMemo(() => {
    const all = cpm?.allTasks ?? []
    if (cpmFilter === 'critical') return all.filter(t => t.isCritical)
    if (cpmFilter === 'contract') return all.filter(t => t.scope !== 'post_completion')
    return all
  }, [cpm, cpmFilter])
  const baselineMap = useMemo(() => {
    if (!baselineId || !baselineVar?.activities) return null
    return new Map<string, BaselineDates>(baselineVar.activities.map((a: any) => [a.wbsCode, { start: a.baselineStart, finish: a.baselineFinish }]))
  }, [baselineId, baselineVar])
  const baselineRowVar = useMemo(
    () => new Map<string, number | null>((baselineVar?.activities ?? []).map((a: any) => [a.wbsCode, a.finishVarianceDays])),
    [baselineVar])

  function openEditByCode(code: string) {
    const t = (tasks ?? []).find((x: any) => x.wbsCode === code)
    if (t) openEdit(t)
  }

  const cpmFileStem = () => `KIPL-DalLake-CPM-${cpmView}-${cpmFilter}-${new Date().toISOString().split('T')[0]}`

  const handleCpmExportPng = async () => {
    if (!cpmSvgRef.current) { toast.error('The diagram is not ready yet'); return }
    try {
      const { dataUrl } = await svgToPng(cpmSvgRef.current, 2)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = cpmFileStem() + '.png'
      a.click()
    } catch (e: any) {
      toast.error('Could not export the PNG: ' + (e?.message || e))
    }
  }

  const handleCpmExportPdf = async () => {
    if (!cpm || !cpmSvgRef.current) { toast.error('The diagram is not ready yet'); return }
    setPdfLoading('cpm-pdf')
    try {
      const image = await svgToPng(cpmSvgRef.current, 2)
      const { generateCpmLandscapePdf } = await import('./wbsPdf')
      const scopeLabel = cpmFilter === 'critical' ? 'Longest path only' : cpmFilter === 'contract' ? 'Contract work' : 'All activities'
      await generateCpmLandscapePdf({
        projectName: 'Dal Lake Sewerage Scheme — 38.5 MLD STP',
        client: 'J&K UEED / LCMA',
        allotment: 'CE/UEED/PS/01 of 2025-26',
        title: cpmView === 'timeline' ? 'Time-scaled logic diagram (forecast)' : 'Activity-on-node network',
        scopeLabel,
        image,
        cpm,
        fileStem: cpmFileStem(),
      })
    } catch (e: any) {
      toast.error('Could not build the PDF: ' + (e?.message || e))
    } finally {
      setPdfLoading('')
    }
  }

  const list       = tasks ?? []
  const milestones = list.filter((t: any) => t.isMilestone)
  const workItems  = list.filter((t: any) => !t.isMilestone)
  const noTasks    = list.length === 0 && !isLoading && !isError

  // The contract dates and the forecast come from the project record through the
  // scheduler — one source for every tab, never typed into the page.
  const contractStart: string | null = dash?.contractStart ?? null
  const contractEnd: string | null = dash?.contractEnd ?? null
  const markers: TimelineMarkers | null = dash && contractEnd ? {
    dataDate: dash.dataDate ?? new Date().toISOString().slice(0, 10),
    contractCompletion: contractEnd,
    forecastFinish: dash.forecastFinish ?? null,
    contractVarianceDays: dash.contractVarianceDays ?? null,
  } : null
  const c16 = useMemo(() => contractStart && contractEnd ? clause16Checkpoints(contractStart, contractEnd) : [], [contractStart, contractEnd])
  const allRows = useMemo<CpmRow[]>(() => ((tasks ?? []) as unknown[]).map(rowFromTask), [tasks])
  const progressMap = useMemo(() => rolledUpProgress(allRows), [allRows])
  const ganttRows = useMemo(() => allRows.filter(r => {
    if (ganttFilter === 'critical') return r.isCritical
    if (ganttFilter === 'milestones') return r.isMilestone
    if (ganttFilter === 'level1') return (r.level ?? 1) === 1
    return true
  }), [allRows, ganttFilter])

  function openEdit(task: any) {
    setEdit(task)
    setEditForm({
      progressPct: task.progressPct,
      status: task.status,
      actualStart: task.actualStart ?? '',
      actualEnd: task.actualEnd ?? '',
      remarks: task.remarks ?? '',
      delayReason: task.delayReason ?? '',
      eotApplied: task.eotApplied ?? false,
      eotDays: task.eotDays ?? 0,
      dependencies: parseDeps(task),
      plannedDuration: task.plannedDuration ?? '',
      calendar: task.calendar ?? 'seven_day',
      scheduleScope: task.scheduleScope ?? 'contract',
      constraintType: task.constraintType ?? '',
      constraintDate: task.constraintDate ? String(task.constraintDate).slice(0, 10) : '',
    })
  }

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>WBS & Schedule</h1>
          <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Clause 17 — CPM · PERT · Milestones · Progress Tracking</p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {noTasks && (
            <Button variant="secondary" loading={seedM.isPending} onClick={() => seedM.mutate(false)}>Load Dal Lake Schedule</Button>
          )}
          {!noTasks && !list.some((t: any) => String(t.wbsCode).startsWith('0')) && (
            <Button variant="secondary" size="md" icon={<Path size={14}/>} loading={enablingM.isPending}
              onClick={() => { if (confirm('Add the Phase 0 “Land & Statutory Enabling” group (land allotment, paperwork, tree felling/Forest+LCMA auction, site handover, procurement permissions, enforcement hold) before Task 1? Your existing schedule is not touched. Dates are placeholders you can edit.')) enablingM.mutate() }}>
              Add Phase 0
            </Button>
          )}
          {!noTasks && (
            <Button variant="secondary" size="md" icon={<ArrowCounterClockwise size={14}/>} loading={recalcM.isPending} onClick={() => recalcM.mutate()}>
              Recalc CPM/PERT
            </Button>
          )}
          {!noTasks && (
            <Button variant="secondary" size="md" icon={<Download size={14}/>} onClick={() => setShowDownload(true)}>
              Download PDF
            </Button>
          )}
          <Button variant="primary" icon={<Plus size={15}/>} onClick={() => setShowNew(true)}>Add Task</Button>
        </div>
      </div>

      {dash && (() => {
        const v = describeVariance(dash.contractVarianceDays)
        const vColor = v.tone === 'late' ? '#fca5a5' : v.tone === 'early' ? '#6ee7b7' : '#93c5fd'
        return (
        <div style={{ background:C.navy, borderRadius:14, padding:'16px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:12 }}>
            <div>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Contract Progress — Dal Lake EPC</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', margin:0 }}>
                Start {formatDate(dash.contractStart)} → Completion {formatDate(dash.contractEnd)} (30 months, trial run excluded)
              </p>
              {dash.contractDatesSource === 'default' && (
                <p style={{ fontSize:11, color:'#fcd34d', margin:'4px 0 0' }}>Built-in dates — set the start and completion dates on the project record so every report uses the contract's own.</p>
              )}
            </div>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:28, fontWeight:900, color:'#93c5fd', fontVariantNumeric:'tabular-nums' }}>{dash.contractPct}%</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Contract time elapsed</div>
              </div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:vColor, marginTop:6 }}>{dash.forecastFinish ? formatDate(dash.forecastFinish) : '—'}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Forecast completion · <span style={{ color:vColor, fontWeight:700 }}>{v.text}</span></div>
              </div>
            </div>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,0.1)', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:dash.contractPct+'%', background:'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius:999 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
            <span>{formatDate(dash.contractStart)}</span>
            <span style={{ color:'rgba(255,255,255,0.65)', fontWeight:600 }}>{dash.daysRemaining} days remaining</span>
            <span>{formatDate(dash.contractEnd)}</span>
          </div>
        </div>
        )
      })()}

      {dash && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:14 }}>
          {[
            { label:'Overall Progress',   value: dash.overallProgress+'%',           color: C.blue },
            { label:'Tasks In Progress',  value: dash.inProgress,                    color: C.blue },
            { label:'Completed',          value: dash.completed+'/'+dash.totalTasks, color: C.green },
            { label:'Delayed Tasks',      value: dash.delayed,                       color: dash.delayed > 0 ? C.red : C.green },
            { label:'On Longest Path',    value: dash.criticalTasks,                 color: C.red },
            { label:'Milestones Achieved', value: dash.milestonesHit+'/'+dash.milestones + (dash.milestonesOverdue ? ` · ${dash.milestonesOverdue} overdue` : ''), color: dash.milestonesOverdue ? C.red : C.amber },
          ].map(k => (
            <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {dash && !noTasks && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <Button variant="secondary" size="sm" loading={aiBusy==='health'} onClick={analyzeSchedule}>✨ Schedule health analysis (AI)</Button>
          <Button variant="secondary" size="sm" loading={aiBusy==='recovery'} onClick={draftRecoveryPlan}>✨ Recovery / catch-up plan (AI)</Button>
          <span style={{ fontSize:11, color:C.text3 }}>AI reads your live progress vs contract time — review before acting.</span>
        </div>
      )}

      <div style={{ display:'flex', borderBottom:'1.5px solid '+C.border, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {([
          ['gantt','Gantt Chart',    <ChartBar size={13}/>],
          ['list','Task List',       null],
          ['milestones','Milestones',<Flag size={13}/>],
          ['cpm','Critical Path',    <Path size={13}/>],
          ['pert','PERT Analysis',   <ChartLine size={13}/>],
          ['eot','EOT Register',     <Warning size={13}/>],
          ['ld','LD & Withholding',  <CurrencyInr size={13}/>],
          ['dlp','DLP & Retention',  <ShieldCheck size={13}/>],
        ] as const).map(([t,l,icon]) => (
          <button key={t} onClick={() => setTab(t as Tab)} style={{
            padding:'10px 18px', fontSize:13, fontWeight:600, border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===t ? '2px solid '+C.blue : '2px solid transparent',
            color: tab===t ? C.blue : C.text3, marginBottom:-1, whiteSpace:'nowrap',
            display:'flex', alignItems:'center', gap:6,
          }}>{icon}{l}</button>
        ))}
      </div>

      {/* Gantt Tab — forecast bars on real dates, the plan as a ghost beneath */}
      {tab === 'gantt' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', marginRight:4 }}>Show</span>
              <Chip active={ganttFilter === 'all'} onClick={() => setGanttFilter('all')}>All ({allRows.length})</Chip>
              <Chip active={ganttFilter === 'critical'} tone="red" onClick={() => setGanttFilter('critical')}>Longest path ({allRows.filter(r => r.isCritical).length})</Chip>
              <Chip active={ganttFilter === 'milestones'} onClick={() => setGanttFilter('milestones')}>Milestones ({milestones.length})</Chip>
              <Chip active={ganttFilter === 'level1'} onClick={() => setGanttFilter('level1')}>Level 1 ({allRows.filter(r => (r.level ?? 1) === 1).length})</Chip>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:C.text3 }}>Click an activity to update it</span>
              <ZoomControl zoom={ganttZoom} onZoom={setGanttZoom} />
            </div>
          </div>

          {isError ? <div style={{ padding:16, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', fontSize:13 }}>Could not load the schedule. <button onClick={() => refetch()} style={{ color:'#2563eb', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Retry</button></div>
          : isLoading || (!noTasks && !markers) ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          : noTasks ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:12, background:C.card, border:'1.5px solid '+C.border, borderRadius:12 }}>
              <ChartBar size={36} color={C.border} />
              <p style={{ fontSize:14, fontWeight:600, color:C.text3, margin:0 }}>No schedule loaded</p>
              <Button variant="primary" loading={seedM.isPending} onClick={() => seedM.mutate(false)}>Load Dal Lake Schedule</Button>
            </div>
          ) : (
            <CpmTimeline cpm={markers!} rows={ganttRows} zoom={ganttZoom} onSelect={openEditByCode} checkpoints={c16} progress={progressMap} />
          )}
          {!noTasks && !isLoading && <CpmLegend ghost="Planned dates" />}
        </div>
      )}

      {/* Task List Tab */}
      {tab === 'list' && (
        <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden' }}>
          {workItems.length === 0 ? <div style={{ padding:40, textAlign:'center', color:C.text3 }}>No tasks</div> : (
            <div className="table-responsive">
            <table style={{ width:'100%', minWidth:980, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                  {['Code','Task','Forecast start','Forecast finish','Dur','Progress','Status','Slip vs plan','Longest path','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workItems.map((t: any, i: number) => {
                  const ss = STATUS_COLORS[t.status] ?? STATUS_COLORS.not_started
                  return (
                    <tr key={t.id} style={{ borderBottom: i<workItems.length-1?'1px solid #f1f5f9':'none', background:t.isCritical?C.criticalBg:t.level===2?'#fafafa':'#fff' }}>
                      <td style={{ padding:'11px 14px', fontSize:11, fontWeight:700, color:t.isCritical?C.red:C.blue, fontFamily:'monospace' }}>{t.wbsCode}</td>
                      <td style={{ padding:'11px 14px', maxWidth:220 }}>
                        <p style={{ fontSize:13, fontWeight:t.level===1?700:400, color:t.isCritical?C.red:C.text1, margin:0, paddingLeft:t.level===2?12:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }} title={'Planned ' + formatDate(t.plannedStart)}>{formatDate(t.forecastStart ?? t.plannedStart)}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }} title={'Planned ' + formatDate(t.plannedEnd)}>{formatDate(t.forecastFinish ?? t.plannedEnd)}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:C.text2 }}>{t.plannedDuration}d</td>
                      <td style={{ padding:'11px 14px', minWidth:100 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:6, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:Number(t.progressPct)+'%', background:Number(t.progressPct)===100?C.green:C.blue, borderRadius:999 }} />
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:C.text3, minWidth:28 }}>{t.progressPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:ss.bg, color:ss.color, border:'1.5px solid '+ss.border }}>{t.status.replace(/_/g,' ')}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:Number(t.delayDays)>0?C.red:C.text3, fontWeight:Number(t.delayDays)>0?700:400 }}>
                        {Number(t.delayDays) > 0 ? '+'+t.delayDays+'d' : '—'}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        {t.isCritical && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:C.criticalBg, color:C.critical, border:'1.5px solid #fecaca' }}>CRITICAL</span>}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <button onClick={() => openEdit(t)}
                          style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:5, cursor:'pointer' }}>Update</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* Milestones Tab */}
      {tab === 'milestones' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {milestones.map((m: any) => {
            const isPast    = new Date(m.plannedEnd) < new Date()
            const isDone    = m.status === 'completed'
            const isDelayed = isPast && !isDone
            return (
              <div key={m.id} style={{ background:C.card, border:'1.5px solid '+(isDone?'#a7f3d0':isDelayed?'#fecaca':C.border), borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:isDone?C.green:isDelayed?C.red:C.amber, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Flag size={18} color="#fff" weight="fill" />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>{m.title}</p>
                  <p style={{ fontSize:12, color:C.text3, margin:0 }}>
                    Planned: <strong>{formatDate(m.plannedEnd)}</strong>
                    {m.forecastFinish && <span style={{ marginLeft:12, color: m.forecastFinish > m.plannedEnd ? C.red : C.green }}>Forecast: <strong>{formatDate(m.forecastFinish)}</strong></span>}
                    {m.paymentMilestone && <span style={{ marginLeft:12, color:C.blue }}>Payment: {m.paymentMilestone} ({m.paymentPct}%)</span>}
                  </p>
                </div>
                <span style={{ fontSize:11, padding:'4px 12px', borderRadius:999, fontWeight:700, background:isDone?'#ecfdf5':isDelayed?'#fef2f2':'#fffbeb', color:isDone?C.green:isDelayed?C.red:C.amber, border:'1.5px solid '+(isDone?'#a7f3d0':isDelayed?'#fecaca':'#fde68a') }}>
                  {isDone ? 'Achieved' : isDelayed ? 'Overdue' : 'Upcoming'}
                </span>
                <button onClick={() => openEdit(m)} style={{ padding:'6px 12px', fontSize:11, fontWeight:600, color:C.blue, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:7, cursor:'pointer', flexShrink:0 }}>Update</button>
              </div>
            )
          })}
        </div>
      )}

      {/* CPM Tab */}
      {tab === 'cpm' && !cpm && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>}
      {tab === 'cpm' && cpm && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <ScheduleSummary cpm={cpm} />
          <ScheduleHealth issues={cpm.issues ?? []} />

          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <Chip active={cpmView === 'timeline'} onClick={() => setCpmView('timeline')}>Timeline</Chip>
              <Chip active={cpmView === 'network'} onClick={() => setCpmView('network')}>Network</Chip>
              <div style={{ width:1, height:18, background:'#cbd5e1', margin:'0 6px' }} />
              <Chip active={cpmFilter === 'all'} onClick={() => setCpmFilter('all')}>All ({cpm.allTasks.length})</Chip>
              <Chip active={cpmFilter === 'contract'} onClick={() => setCpmFilter('contract')} title="Leave out the trial run and O&M">Contract work</Chip>
              <Chip active={cpmFilter === 'critical'} tone="red" onClick={() => setCpmFilter('critical')}>Longest path ({cpm.allTasks.filter(t => t.isCritical).length})</Chip>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {cpmView === 'timeline' && (
                <select value={baselineId} onChange={e => setBaselineId(e.target.value)} style={{ ...selStyle, width:'auto', maxWidth:260, padding:'6px 10px' }} title="What the grey bar under each activity shows">
                  <option value="">Compare with: planned dates</option>
                  {(baselines ?? []).map((b: any) => <option key={b.id} value={b.id}>Baseline: {b.name} ({formatDate(b.dataDate)})</option>)}
                </select>
              )}
              <Button variant="secondary" size="sm" onClick={() => setShowBaseline(true)} disabled={!cpm.ok}>Save baseline</Button>
              <ZoomControl zoom={cpmZoom} onZoom={setCpmZoom} />
              <Button variant="secondary" size="sm" icon={<Download size={13}/>} onClick={handleCpmExportPng} disabled={!cpm.ok}>PNG</Button>
              <Button variant="primary" size="sm" icon={<FilePdf size={13}/>} loading={pdfLoading === 'cpm-pdf'} onClick={handleCpmExportPdf} disabled={!cpm.ok}>A3 PDF</Button>
            </div>
          </div>

          {baselineId && baselineVar && (
            <div style={{ padding:'10px 14px', borderRadius:10, fontSize:12.5, background:'#f8fafc', border:'1.5px solid '+C.border, color:C.text2 }}>
              Against baseline <b style={{ color:C.text1 }}>{baselineVar.baseline?.name}</b> (data date {formatDate(baselineVar.baseline?.dataDate)}):
              {' '}forecast completion {baselineVar.finishVarianceDays === null ? 'not comparable' : baselineVar.finishVarianceDays === 0 ? 'unchanged'
                : <b style={{ color: baselineVar.finishVarianceDays > 0 ? C.red : C.green }}>{baselineVar.finishVarianceDays > 0 ? 'later by ' : 'earlier by '}{Math.abs(baselineVar.finishVarianceDays)} days</b>}
              {(baselineVar.added ?? []).length > 0 && <> · added since: {baselineVar.added.join(', ')}</>}
            </div>
          )}

          {!cpm.ok ? (
            <div style={{ padding:'28px 20px', textAlign:'center', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12, color:C.red, fontSize:13, fontWeight:600 }}>
              The schedule has errors, so no dates are calculated. Fix the items under Schedule health, then recalculate.
            </div>
          ) : cpmView === 'timeline' ? (
            <CpmTimeline cpm={cpm} rows={cpmRows} baseline={baselineMap} zoom={cpmZoom} svgRef={cpmSvgRef} onSelect={openEditByCode} checkpoints={c16} progress={progressMap} />
          ) : (
            <CpmNetwork rows={cpmRows} zoom={cpmZoom} svgRef={cpmSvgRef} />
          )}
          {cpm.ok && <CpmLegend view={cpmView} ghost={baselineId ? 'Baseline' : 'Planned dates'} />}

          {/* Schedule table */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:'#f8fafc', borderBottom:'1px solid '+C.border, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text2, textTransform:'uppercase' }}>Schedule ({cpmRows.length} activities)</span>
              <span style={{ fontSize:11, color:C.text3 }}>Forecast dates from the data date {formatDate(cpm.dataDate)} · float in working days</span>
            </div>
            <div className="table-responsive">
            <table style={{ width:'100%', minWidth:1040, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {['Code','Activity','Logic','Dur','Forecast start','Forecast finish','Total float','Free float','Status','Driven by', ...(baselineId ? ['vs baseline'] : [])].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderRows(cpmRows).map(t => {
                  const st = SCHED_STATUS[t.status ?? ''] ?? SCHED_STATUS.not_started
                  const drv = t.drivenBy ?? null
                  const bv = baselineRowVar.get(t.wbsCode)
                  return (
                  <tr key={t.wbsCode} onClick={() => openEditByCode(t.wbsCode)} style={{ borderBottom:'1px solid #f1f5f9', background: t.isCritical ? C.criticalBg : t.isSummary ? '#f8faff' : '#fff', cursor:'pointer' }}>
                    <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color:t.isCritical?C.red:C.blue, fontFamily:'monospace', whiteSpace:'nowrap' }}>{t.wbsCode}</td>
                    <td style={{ padding:'9px 12px', paddingLeft: 12 + t.depth * 14, fontSize:12, fontWeight:t.isSummary?700:400, color:t.scope === 'post_completion' ? '#6d28d9' : C.text1, maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.title}>{t.title}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, fontFamily:'monospace', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={fmtDeps(t.dependencies)}>{fmtDeps(t.dependencies) || '—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, fontVariantNumeric:'tabular-nums' }}>{t.isSummary ? '' : t.duration + 'd'}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(t.forecastStart)}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(t.forecastFinish)}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, fontWeight:(t.float ?? 0) <= 0 ? 700 : 400, color:(t.float ?? 0) < 0 ? C.red : t.isCritical ? '#991b1b' : C.green, fontVariantNumeric:'tabular-nums' }}>{t.float ?? '—'}{t.float !== null && t.float !== undefined ? 'd' : ''}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, fontVariantNumeric:'tabular-nums' }}>{t.freeFloat ?? '—'}{t.freeFloat !== null && t.freeFloat !== undefined ? 'd' : ''}</td>
                    <td style={{ padding:'9px 12px' }}><span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:st.bg, color:st.color, whiteSpace:'nowrap' }}>{st.label}</span></td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, fontFamily: drv && !DRIVER_LABEL[drv] ? 'monospace' : 'inherit', whiteSpace:'nowrap' }}>{drv ? (DRIVER_LABEL[drv] ?? '← ' + drv) : '—'}</td>
                    {baselineId && <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color: (bv ?? 0) > 0 ? C.red : (bv ?? 0) < 0 ? C.green : C.text3 }}>{bv === null || bv === undefined ? '—' : bv === 0 ? '0' : (bv > 0 ? '+' : '') + bv + 'd'}</td>}
                  </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* PERT Tab */}
      {tab === 'pert' && pertData && (() => {
        const mu: number | null = pertData.projectExpectedDuration ?? null
        const sigma: number | null = pertData.projectStdDeviation ?? null
        const contractDays: number = Number(pertData.contractTargetDays)
        const hasSpread = mu !== null && sigma !== null && sigma > 0
        const target = pertTargetDays ?? contractDays
        const erf = (x: number) => {
          const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
          const sign = x < 0 ? -1 : 1
          const absX = Math.abs(x)
          const t = 1.0 / (1.0 + p * absX)
          const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX)
          return sign * y
        }
        const calcProbPct = hasSpread ? Math.min(100, Math.max(0, +(0.5 * (1 + erf(((target - mu!) / sigma!) / Math.SQRT2)) * 100).toFixed(1))) : null
        const onTime: number | null = pertData.contractOnTimeProbPct ?? null
        const range = (r: any) => r ? `${Math.round(r.lower)}–${Math.round(r.upper)}d` : '—'
        const card = (label: string, value: ReactNode, color: string, sub?: ReactNode) => (
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:19, fontWeight:800, color, fontVariantNumeric:'tabular-nums' }}>{value}</div>
            {sub && <div style={{ fontSize:10.5, color:C.text3, marginTop:3 }}>{sub}</div>}
          </div>
        )

        return (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:12 }}>
              {card('Expected finish (TE)', mu === null ? '—' : `day ${Math.round(mu)}`, C.navy, `contract completion is day ${contractDays}`)}
              {card('Std deviation (σ)', sigma === null ? '—' : `${sigma} days`, C.amber, 'along the remaining longest path')}
              {card('68% range', range(pertData.probability68), C.green)}
              {card('95% range', range(pertData.probability95), C.blue)}
              {card('On time for the contract', onTime === null ? '—' : `${onTime}%`, onTime === null ? C.text3 : onTime >= 50 ? C.green : C.red, onTime === null ? 'not computed' : 'single-path estimate')}
            </div>
            <div style={{ padding:'10px 14px', background:'#f8fafc', border:'1.5px solid '+C.border, borderRadius:10, fontSize:12, color:C.text2, lineHeight:1.5 }}>
              <b style={{ color:C.text1 }}>How to read this: </b>{pertData.probabilityNote}
            </div>

            {hasSpread && (
            <div style={{ background:'#f8fafc', border:'1.5px solid '+C.border, borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <div>
                <h4 style={{ fontSize:13, fontWeight:800, color:C.navy, margin:'0 0 4px' }}>Chance of finishing by a given day</h4>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>Days counted from the contract start. Same single-path model as above.</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.text2 }}>Day:</label>
                  <input type="number" value={target} onChange={e => setPertTargetDays(Number(e.target.value))}
                    style={{ width:90, padding:'6px 10px', fontSize:13, fontWeight:700, border:'1.5px solid #cbd5e1', borderRadius:6, background:'#fff' }} />
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[
                    { label:`Contract (${contractDays})`, v: contractDays },
                    { label:`Expected (${Math.round(mu!)})`, v: Math.round(mu!) },
                    ...(pertData.probability95 ? [{ label:`95% (${Math.round(pertData.probability95.upper)})`, v: Math.round(pertData.probability95.upper) }] : []),
                  ].map(b => (
                    <button key={b.label} onClick={() => setPertTargetDays(b.v)}
                      style={{ padding:'6px 10px', fontSize:11, fontWeight:700, background: target === b.v ? '#dbeafe' : '#fff', border:'1px solid #cbd5e1', borderRadius:6, cursor:'pointer' }}>{b.label}</button>
                  ))}
                </div>
                <div style={{ background: calcProbPct! >= 75 ? '#ecfdf5' : calcProbPct! >= 50 ? '#eff6ff' : '#fef2f2', border:'1.5px solid '+(calcProbPct! >= 75 ? '#a7f3d0' : calcProbPct! >= 50 ? '#bfdbfe' : '#fecaca'), padding:'6px 14px', borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:C.text3, fontWeight:600 }}>Chance:</span>
                  <span style={{ fontSize:16, fontWeight:900, color: calcProbPct! >= 75 ? C.green : calcProbPct! >= 50 ? C.blue : C.red }}>{calcProbPct}%</span>
                </div>
              </div>
            </div>
            )}

            {hasSpread && (
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 2px' }}>Spread of the finish (bell curve and cumulative S-curve)</p>
              <p style={{ fontSize:11, color:C.text3, margin:'0 0 8px' }}>Blue area = density · green line = cumulative chance · amber line = contract completion (day {contractDays})</p>
              <Suspense fallback={<ChartFallback />}>
                <WbsChart kind="pert" mean={mu} sigma={sigma} p68={pertData.probability68} p95={pertData.probability95} contractTargetDays={contractDays} />
              </Suspense>
            </div>
            )}

            {/* Clause 16.3 — tested on the forecast S-curve, not on today's figure */}
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
              <div style={{ background:'#f8f9fc', padding:'12px 16px', borderBottom:'1.5px solid '+C.border }}>
                <h4 style={{ fontSize:13, fontWeight:800, color:C.navy, margin:'0 0 2px' }}>Clause 16.3 progress stages</h4>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>Share of the work due at each quarter of the contract time, against the progress the forecast reaches by that date. A shortfall exposes the stage to withholding under Clause 8.1.</p>
              </div>
              <div className="table-responsive">
                <table style={{ width:'100%', minWidth:800, borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#1e293b' }}>
                      {['Stage', 'Date', 'Required', 'Forecast by then', 'Verdict'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(pertData.clause16Milestones ?? []).map((s: any) => {
                      const f: number | null = s.forecastProgressPct
                      const verdict = s.forecastMeets === null ? { label:'Not computed', bg:'#f1f5f9', color:C.text2 }
                        : s.forecastMeets ? { label: s.status === 'passed' ? 'Met' : 'On course', bg:'#dcfce7', color:'#166534' }
                        : { label: s.status === 'passed' ? 'Missed' : 'Forecast short', bg:'#fee2e2', color:C.red }
                      return (
                        <tr key={s.stage} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, color:C.navy }}>{s.stage}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{formatDate(s.date)} <span style={{ color:C.text3 }}>(day {s.elapsedDays} · month {s.elapsedMonths})</span></td>
                          <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, color:C.blue }}>{s.targetProgressPct}% <span style={{ fontSize:10, fontWeight:400, color:C.text3 }}>({s.rule})</span></td>
                          <td style={{ padding:'11px 14px', fontSize:12 }}>
                            {f === null ? '—' : (
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ flex:1, height:6, borderRadius:999, background:'#e2e8f0', overflow:'hidden', maxWidth:110 }}>
                                  <div style={{ height:'100%', width:`${Math.min(100, (f / s.targetProgressPct) * 100)}%`, background: s.forecastMeets ? C.green : C.red, borderRadius:999 }} />
                                </div>
                                <span style={{ fontSize:11, fontWeight:700, color: s.forecastMeets ? C.green : C.red, fontVariantNumeric:'tabular-nums' }}>{f.toFixed(1)}%</span>
                                {s.progressTodayPct !== null && s.progressTodayPct !== undefined && <span style={{ fontSize:10, color:C.text3 }}>today {Number(s.progressTodayPct).toFixed(1)}%</span>}
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:verdict.bg, color:verdict.color }}>{verdict.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Three-point estimates table */}
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
              <div style={{ background:'#f8f9fc', padding:'10px 16px', borderBottom:'1.5px solid '+C.border }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>PERT Three-Point Estimates (Auto-computed)</p>
                <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>O = M × 0.9 · M = Planned · P = M × 1.3 + delays · TE = (O + 4M + P) / 6</p>
              </div>
              <div className="table-responsive">
              <table style={{ width:'100%', minWidth:850, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    {['Code','Task','Optimistic','Most Likely','Pessimistic','Expected (TE)','Variance','σ','Critical'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(pertData.tasks ?? []).map((t: any, i: number) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: t.isCritical ? C.criticalBg : '#fff' }}>
                      <td style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:t.isCritical?C.red:C.blue, fontFamily:'monospace' }}>{t.wbsCode}</td>
                      <td style={{ padding:'10px 12px', fontSize:12, color:t.isCritical?C.red:C.text1, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.green }}>{t.optimistic}d</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.blue, fontWeight:700 }}>{t.mostLikely}d</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.red }}>{t.pessimistic}d</td>
                      <td style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:C.navy }}>{t.expected}d</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.variance}</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:C.text2 }}>{t.stdDeviation}</td>
                      <td style={{ padding:'10px 12px' }}>
                        {t.isCritical && <span style={{ fontSize:9, padding:'2px 8px', borderRadius:999, fontWeight:700, background:'#fee2e2', color:C.red }}>CRITICAL</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* EOT Register Tab */}
      {tab === 'eot' && eotData && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12 }}>
            {[
              { label:'Approval delays (EOT grounds)', value: (eotData.approvalDelays ?? []).filter((d: any) => d.isEotGround).reduce((s: number, d: any) => s + d.delayDays, 0), color: C.amber },
              { label:'Weather (site diary)', value: eotData.totals.weatherDelayDays, color: '#0369a1' },
              { label:'Site / task EOT', value: eotData.totals.taskDelayDays, color: C.red },
              { label:'Less overlap (counted once)', value: -eotData.totals.overlapDays, color: C.text2 },
            ].map(k => (
              <div key={k.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value} days</div>
              </div>
            ))}
            <div style={{ background:C.criticalBg, border:'1.5px solid #fecaca', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.red, textTransform:'uppercase', marginBottom:6 }}>EOT sought (net)</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.red, fontVariantNumeric:'tabular-nums' }}>{eotData.totals.claimableEotDays} days</div>
              <div style={{ fontSize:10.5, color:'#991b1b', marginTop:3 }}>gross {eotData.totals.grossEotDays}d · {eotData.totals.undatedEotDays}d without dates</div>
            </div>
          </div>
          <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:10, fontSize:12, color:'#92400e', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <span style={{ flex:1, minWidth:220, lineHeight:1.5 }}>{eotData.basis} Contract completion: <b>{formatDate(eotData.contractEnd)}</b>.</span>
            <Button variant="primary" size="sm" loading={eotBusy} onClick={draftEotNarrative}>✨ Draft EOT narrative (AI)</Button>
          </div>

          {/* Government approval delays */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
            <div style={{ background:'#f8f9fc', padding:'10px 16px', borderBottom:'1.5px solid '+C.border }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Government Approval Delays (from Liaison)</p>
            </div>
            <div className="table-responsive" style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
                <thead><tr style={{ background:C.navy }}>
                  {['File','Subject','Dept','Expected','Actual','Delay','Gates','Longest path','EOT'].map(h =>
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(eotData.approvalDelays ?? []).length === 0 && (
                    <tr><td colSpan={9} style={{ padding:'18px 12px', fontSize:12, color:C.text3, textAlign:'center' }}>No approval delays recorded. Set expected/actual dates on Liaison files to track them.</td></tr>
                  )}
                  {(eotData.approvalDelays ?? []).map((d: any, i: number) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: d.isEotGround && d.criticalPathImpact ? C.criticalBg : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', color:C.text2, whiteSpace:'nowrap' }}>{d.ref ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:C.text1, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.subject}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2 }}>{d.department ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{d.expectedDate?.split('T')[0] ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{d.actualDate?.split('T')[0] ?? (d.settled ? '—' : 'pending')}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color: d.delayDays>0?C.red:C.green }}>{d.delayDays}d</td>
                      <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', color:C.blue }}>{d.linkedWbsCode ?? '—'}</td>
                      <td style={{ padding:'9px 12px' }}><CpTag v={d.criticalPathImpact} /></td>
                      <td style={{ padding:'9px 12px' }}>{d.isEotGround && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700, background:'#fef3c7', color:'#b45309' }}>EOT</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Site / task delays */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
            <div style={{ background:'#f8f9fc', padding:'10px 16px', borderBottom:'1.5px solid '+C.border }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Site / Task Delays (from WBS)</p>
              <p style={{ fontSize:11, color:C.text3, margin:'3px 0 0' }}>Slip is the forecast finish against the planned finish, from the scheduler — not typed in.</p>
            </div>
            <div className="table-responsive" style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
                <thead><tr style={{ background:C.navy }}>
                  {['Code','Task','Responsible','Slip vs plan','Longest path','EOT days','Reason'].map(h =>
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(eotData.taskDelays ?? []).length === 0 && (
                    <tr><td colSpan={7} style={{ padding:'18px 12px', fontSize:12, color:C.text3, textAlign:'center' }}>No task delays recorded.</td></tr>
                  )}
                  {(eotData.taskDelays ?? []).map((d: any, i: number) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: d.eotApplied && d.criticalPathImpact ? C.criticalBg : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', fontWeight:700, color:C.blue }}>{d.ref}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:C.text1, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.subject}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2 }}>{d.responsible ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color:C.red }}>{d.delayDays}d</td>
                      <td style={{ padding:'9px 12px' }}><CpTag v={d.criticalPathImpact} /></td>
                      <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color: d.eotApplied?'#b45309':C.text3 }} title={d.copiedFromDiaries ? `${d.copiedFromDiaries}d copied from site diaries are counted under weather instead` : undefined}>{d.eotApplied ? d.eotDays+'d' : '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weather stoppages from the site diary */}
          <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
            <div style={{ background:'#f8f9fc', padding:'10px 16px', borderBottom:'1.5px solid '+C.border }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Weather Stoppages (from the Site Diary)</p>
              <p style={{ fontSize:11, color:C.text3, margin:'3px 0 0' }}>Days = hours lost ÷ 8. The diary does not record which activity stopped, so critical-path impact is not assessed.</p>
            </div>
            <div className="table-responsive" style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
                <thead><tr style={{ background:C.navy }}>
                  {['Date','Reason','EOT days','Window','Longest path'].map(h =>
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(eotData.weatherDelays ?? []).length === 0 && (
                    <tr><td colSpan={5} style={{ padding:'18px 12px', fontSize:12, color:C.text3, textAlign:'center' }}>No diary entries flagged for EOT.</td></tr>
                  )}
                  {(eotData.weatherDelays ?? []).map((d: any, i: number) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', color:C.text2, whiteSpace:'nowrap' }}>{formatDate(d.ref)}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:C.text1 }}>{d.reason}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color: d.eotDays > 0 ? '#0369a1' : C.text3 }}>{d.hoursNotRecorded ? 'hours not recorded' : d.eotDays + 'd'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{d.window ? `${formatDate(d.window.from)} → ${formatDate(d.window.to)}` : '—'}</td>
                      <td style={{ padding:'9px 12px' }}><CpTag v={d.criticalPathImpact} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LD & Milestone Withholding Tab (Clause 8.1) */}
      {tab === 'ld' && (() => {
        const CV = contractValueRaw ? Number(String(contractValueRaw).replace(/[^0-9.]/g, '')) : 0
        const inr = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
        const today = new Date()
        const ms = list.filter((t: any) => t.isMilestone).map((t: any) => {
          const planned = t.plannedEnd ? new Date(t.plannedEnd) : null
          const achieved = t.status === 'completed' || !!t.actualEnd
          const missed = !achieved && planned ? planned < today : false
          let delay = 0
          if (achieved && t.actualEnd && planned) delay = Math.max(0, Math.round((new Date(t.actualEnd).getTime() - planned.getTime()) / 86400000))
          else if (missed && planned) delay = Math.round((today.getTime() - planned.getTime()) / 86400000)
          const pct = Number(t.paymentPct) || 0
          const amount = CV * pct / 100
          return { code: t.wbsCode, title: t.paymentMilestone || t.title, pct, amount, planned: t.plannedEnd, achieved, missed, delay, withheld: missed ? amount : 0 }
        })
        const totalWithheld = ms.reduce((s: number, m: any) => s + m.withheld, 0)
        const maxMsDelay = Math.max(0, ...ms.map((m: any) => m.delay))
        const ldDays = ldDelayDays !== '' ? parseInt(ldDelayDays) || 0 : maxMsDelay
        const ldCap = CV * 0.10
        const ldRaw = CV * 0.0005 * ldDays
        const ld = Math.min(ldRaw, ldCap)
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {CV <= 0 && (
              <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1.5px solid '+'#fde68a', borderRadius:10, fontSize:12, color:'#92400e' }}>
                Contract value not set — enter it in the “Incomplete Project Data” prompt (Contract Value item) to compute amounts. Milestone status still shown below.
              </div>
            )}
            <div className="responsive-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>Contract Value</div>
                <div style={{ fontSize:17, fontWeight:800, color:C.navy }}>{CV > 0 ? inr(CV) : '—'}</div>
              </div>
              <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>LD Cap (10%)</div>
                <div style={{ fontSize:17, fontWeight:800, color:C.amber }}>{CV > 0 ? inr(ldCap) : '—'}</div>
              </div>
              <div style={{ background:C.criticalBg, border:'1.5px solid #fecaca', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.red, textTransform:'uppercase', marginBottom:6 }}>Milestone Withholding (now)</div>
                <div style={{ fontSize:17, fontWeight:800, color:C.red }}>{CV > 0 ? inr(totalWithheld) : '—'}</div>
              </div>
              <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>Compensation @ {ldDays}d</div>
                <div style={{ fontSize:17, fontWeight:800, color: ldRaw >= ldCap ? C.red : C.text1 }}>{CV > 0 ? inr(ld) : '—'}{ldRaw >= ldCap && CV > 0 && <span style={{ fontSize:10, color:C.red }}> (capped)</span>}</div>
              </div>
            </div>

            {/* LD calculator */}
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>Compensation for Delay — Clause 8.1</p>
              <p style={{ fontSize:11, color:C.text3, margin:'0 0 12px' }}>0.05% of contract value per day of delay, capped at 10% of contract value. Enter the assessed delay (defaults to the worst milestone slip, {maxMsDelay}d).</p>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:C.text2, display:'block', marginBottom:4 }}>Delay (days)</label>
                  <input type="number" value={ldDelayDays} placeholder={String(maxMsDelay)} onChange={e => setLdDelayDays(e.target.value)}
                    style={{ padding:'8px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:13, width:120, fontFamily:'inherit' }} />
                </div>
                <div style={{ fontSize:13, color:C.text2 }}>
                  {CV > 0 ? <>= {inr(CV)} × 0.05% × {ldDays} = <b style={{ color: ldRaw >= ldCap ? C.red : C.navy }}>{inr(ld)}</b>{ldRaw >= ldCap && <span style={{ color:C.red }}> (10% cap reached)</span>}</> : 'Set contract value to compute.'}
                </div>
              </div>
            </div>

            {/* Milestone withholding table */}
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
              <div style={{ background:'#f8f9fc', padding:'10px 16px', borderBottom:'1.5px solid '+C.border }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:0 }}>Milestone Withholding</p>
                <p style={{ fontSize:11, color:C.text3, margin:'4px 0 0' }}>Missed milestones are withheld automatically (no notice) and adjusted against compensation at final EOT grant; released if subsequent milestones catch up.</p>
              </div>
              <div className="table-responsive" style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
                  <thead><tr style={{ background:C.navy }}>
                    {['Code','Milestone','Pay %','Amount','Planned','Status','Delay','Withheld'].map(h =>
                      <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ms.length === 0 && <tr><td colSpan={8} style={{ padding:'18px', fontSize:12, color:C.text3, textAlign:'center' }}>No milestones defined.</td></tr>}
                    {ms.map((m: any, i: number) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: m.missed ? C.criticalBg : '#fff' }}>
                        <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', fontWeight:700, color:C.blue }}>{m.code}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:C.text1, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text2 }}>{m.pct}%</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text2 }}>{CV > 0 ? inr(m.amount) : '—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:C.text2, whiteSpace:'nowrap' }}>{m.planned ? String(m.planned).split('T')[0] : '—'}</td>
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ fontSize:9, padding:'2px 7px', borderRadius:999, fontWeight:700,
                            background: m.achieved ? '#ecfdf5' : m.missed ? '#fee2e2' : '#f1f5f9',
                            color: m.achieved ? '#047857' : m.missed ? C.red : C.text2 }}>
                            {m.achieved ? 'ACHIEVED' : m.missed ? 'MISSED' : 'PENDING'}
                          </span>
                        </td>
                        <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color: m.delay>0?C.red:C.text3 }}>{m.delay>0 ? m.delay+'d' : '—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, fontWeight:700, color: m.withheld>0?C.red:C.text3 }}>{m.withheld>0 && CV>0 ? inr(m.withheld) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* DLP & Retention Release Tracker (Clause 3.0 / 38.0) */}
      {tab === 'dlp' && (() => {
        const inr = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
        const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d }
        const fmt = (d: Date) => d.toISOString().split('T')[0]
        const bills = raBillsDlp ?? []
        const billedGross = bills.reduce((s: number, b: any) => s + (Number(b.grossAmount) || 0), 0)
        const retentionHeld = bills.reduce((s: number, b: any) => s + (Number(b.retentionAmount) || 0), 0)
        const retentionEff = retentionHeld > 0 ? retentionHeld : billedGross * 0.05

        const completion = completionDate || contractEnd || new Date().toISOString().slice(0, 10)
        const comp = new Date(completion)
        const trialEnd = addMonths(completion, 6)              // 6-month free trial run
        const dlpEnd = addMonths(fmt(trialEnd), 24)            // DLP: 24 months after trial run
        const labourDeemed = addMonths(completion, 6)          // deemed clearance 6 months post-completion
        const today = new Date()
        const daysTo = (d: Date) => Math.round((d.getTime() - today.getTime()) / 86400000)

        const phases = [
          { label: 'Construction', start: contractStart ?? '—', end: completion },
          { label: 'Free Trial Run (6 mo)', start: completion, end: fmt(trialEnd) },
          { label: 'Defects Liability (24 mo)', start: fmt(trialEnd), end: fmt(dlpEnd) },
        ]
        const curPhase = today < comp ? 'Construction'
          : today < trialEnd ? 'Free Trial Run'
          : today < dlpEnd ? 'Defects Liability Period'
          : 'DLP Expired'
        const dlpExpired = today >= dlpEnd
        const releasable = dlpExpired && labourCleared

        return (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="responsive-kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>Retention Held (5%)</div>
                <div style={{ fontSize:17, fontWeight:800, color:C.navy }}>{inr(retentionEff)}</div>
                <div style={{ fontSize:9, color:C.text3, marginTop:2 }}>{retentionHeld > 0 ? 'from RA bills' : 'est. 5% of billed'}</div>
              </div>
              <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>Current Phase</div>
                <div style={{ fontSize:14, fontWeight:800, color:C.blue }}>{curPhase}</div>
              </div>
              <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, textTransform:'uppercase', marginBottom:6 }}>DLP Expiry</div>
                <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>{fmt(dlpEnd)}</div>
                <div style={{ fontSize:9, color:C.text3, marginTop:2 }}>{daysTo(dlpEnd) > 0 ? daysTo(dlpEnd) + ' days away' : 'passed'}</div>
              </div>
              <div style={{ background: releasable ? '#ecfdf5' : '#fffbeb', border:'1.5px solid '+(releasable ? '#a7f3d0' : '#fde68a'), borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:9, fontWeight:700, color: releasable ? '#047857' : '#b45309', textTransform:'uppercase', marginBottom:6 }}>Retention Release</div>
                <div style={{ fontSize:14, fontWeight:800, color: releasable ? '#047857' : '#b45309' }}>{releasable ? 'Due now' : 'On hold'}</div>
              </div>
            </div>

            {/* Completion date input + conditions */}
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>Release conditions — Clause 3.0 / 38.0</p>
              <p style={{ fontSize:11, color:C.text3, margin:'0 0 12px' }}>Security deposit (5%) is released after <b>both</b>: (a) expiry of the Defects Liability Period, and (b) labour clearance certificate (deemed 6 months after completion if no complaint is pending). DLP is extended by any EOT granted.</p>
              <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:C.text2, display:'block', marginBottom:4 }}>Completion date (actual/expected)</label>
                  <div style={{ width: 180 }}>
                    <DatePicker value={completion} onChange={e => setCompletionDate(e.target.value)} />
                  </div>
                </div>
                <div style={{ fontSize:12, color:C.text2 }}>Trial run ends <b>{fmt(trialEnd)}</b> · DLP ends <b>{fmt(dlpEnd)}</b></div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { ok: dlpExpired, label: `(a) Defects Liability Period expired (${fmt(dlpEnd)})` },
                  { ok: labourCleared, label: `(b) Labour clearance certificate obtained (deemed ${fmt(labourDeemed)})`, toggle: true },
                ].map((c, i) => (
                  <div key={i} onClick={() => c.toggle && setLabourCleared(v => !v)}
                    style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:C.text1, cursor: c.toggle ? 'pointer' : 'default' }}>
                    <span style={{ width:18, height:18, borderRadius:5, border:'1.5px solid '+(c.ok ? C.green : C.border), background: c.ok ? C.green : '#fff', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>{c.ok ? '✓' : ''}</span>
                    {c.label}{c.toggle && <span style={{ fontSize:10, color:C.text3 }}>(click to toggle)</span>}
                  </div>
                ))}
              </div>
              {releasable && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'#ecfdf5', border:'1.5px solid #a7f3d0', borderRadius:8, fontSize:12.5, color:'#047857', fontWeight:700 }}>
                  Both conditions met — {inr(retentionEff)} security deposit is due for release.
                </div>
              )}
            </div>

            {/* Phase timeline */}
            <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12, padding:'16px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 12px' }}>Retention lifecycle</p>
              {phases.map((p, i) => {
                const active = curPhase.startsWith(p.label.split(' (')[0])
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom: i < phases.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background: active ? C.blue : (new Date(p.end) < today ? C.green : C.border), flexShrink:0 }} />
                    <span style={{ fontSize:13, fontWeight: active ? 700 : 500, color: active ? C.blue : C.text1, flex:1 }}>{p.label}</span>
                    <span style={{ fontSize:11, color:C.text3, fontFamily:'monospace' }}>{p.start} → {p.end}</span>
                  </div>
                )
              })}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0' }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background: releasable ? C.green : C.border, flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:700, color: releasable ? C.green : C.text2, flex:1 }}>Security Deposit Release</span>
                <span style={{ fontSize:11, color:C.text3, fontFamily:'monospace' }}>{fmt(dlpEnd)} (subject to labour clearance)</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* AI EOT narrative */}
      <Modal open={showAiOut} onClose={() => setShowAiOut(false)} title={aiTitle} width={720}
        footer={<>
          <Button variant="ghost" onClick={() => setShowAiOut(false)}>Close</Button>
          <Button variant="primary" onClick={() => { navigator.clipboard?.writeText(aiOut); toast.success('Copied') }}>Copy</Button>
        </>}>
        <div style={{ whiteSpace:'pre-wrap', fontSize:13.5, color:C.text1, lineHeight:1.65 }}>{aiOut}</div>
      </Modal>

      <Modal open={showEotNarr} onClose={() => setShowEotNarr(false)} title="AI — EOT Justification Narrative" width={680}
        footer={<>
          <Button variant="ghost" onClick={() => setShowEotNarr(false)}>Close</Button>
          <Button variant="primary" onClick={() => { navigator.clipboard?.writeText(eotNarr); toast.success('Copied — paste into the EOT application') }}>Copy</Button>
        </>}>
        <p style={{ fontSize:11, color:C.text3, margin:'0 0 10px' }}>Drafted from the EOT register. Review, edit, and use in the Clause-16 EOT application. Do not submit unverified.</p>
        <div style={{ whiteSpace:'pre-wrap', fontSize:13.5, color:C.text1, lineHeight:1.65 }}>{eotNarr}</div>
      </Modal>

      {/* Download PDF Modal */}
      <Modal open={showDownload} onClose={() => setShowDownload(false)} title="Download PDF Reports" width={500}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={downloadGraphicalReport} disabled={!!pdfLoading}
            style={{ padding:'14px 16px', borderRadius:10, border:'1.5px solid '+C.blue, background:'#eff6ff', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14 }}>
            {pdfLoading === 'graphical' ? <Spinner /> : <ChartBar size={20} color={C.blue} weight="fill" />}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.text1 }}>Monthly Graphical Report — A3</div>
              <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>Forecast timeline + activity network + PERT curve, with a KPI and Clause 16.3 cover. For contract submission.</div>
            </div>
            <Download size={16} color={C.blue} />
          </button>
          {[
            { type:'gantt-full', icon:<ChartBar size={20} color={C.blue}/>, title:'Gantt Chart — Full A3', desc:'Full 30-month timeline on single A3 landscape page' },
            { type:'gantt-quart', icon:<ChartBar size={20} color={C.green}/>, title:'Gantt Chart — Quarterly', desc:'One quarter per A4 page, easier to read in detail' },
            { type:'report', icon:<FilePdf size={20} color={C.amber}/>, title:'Progress Report — Full', desc:'Cover, KPIs, full task list, milestones, delays, CPM analysis' },
          ].map(opt => (
            <button key={opt.type} onClick={() => downloadPdf(opt.type as any)} disabled={!!pdfLoading}
              style={{ padding:'14px 16px', borderRadius:10, border:'1.5px solid '+C.border, background:'#fff', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14 }}>
              {pdfLoading === opt.type ? <Spinner /> : opt.icon}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{opt.title}</div>
                <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{opt.desc}</div>
              </div>
              <Download size={16} color={C.text3} />
            </button>
          ))}
        </div>
      </Modal>

      {/* Save baseline */}
      <Modal open={showBaseline} onClose={() => setShowBaseline(false)} title="Save a baseline" width={480}
        footer={<>
          <Button variant="ghost" onClick={() => setShowBaseline(false)}>Cancel</Button>
          <Button variant="primary" loading={baselineM.isPending} disabled={!baselineForm.name.trim()} onClick={() => baselineM.mutate()}>Save baseline</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <p style={{ fontSize:12.5, color:C.text2, margin:0, lineHeight:1.55 }}>
            A baseline freezes today's forecast for every activity. Progress and delay are then measured against it, and it never changes afterwards —
            take one when the programme is accepted under Clause 17, and again for each approved revision.
          </p>
          <Input label="Name *" value={baselineForm.name} onChange={e => setBaselineForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Clause 17 programme — Rev 0" />
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Notes</label>
            <textarea value={baselineForm.notes} onChange={e => setBaselineForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Submission reference, approval letter, what changed…"
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12.5, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }} />
          </div>
        </div>
      </Modal>

      {/* Update Task Modal */}
      <Modal open={!!editTask} onClose={() => setEdit(null)} title={'Update: ' + (editTask?.title ?? '')} width={520}
        footer={<>
          <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="primary" loading={updateM.isPending} onClick={() => updateM.mutate()}>Save Update</Button>
        </>}>
        {editTask && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'10px 14px', background:'#f8f9fc', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12 }}>
              <p style={{ fontWeight:600, color:C.text1, margin:'0 0 3px' }}>{editTask.wbsCode} — {editTask.title}</p>
              <p style={{ color:C.text3, margin:0 }}>
                Planned {formatDate(editTask.plannedStart)} → {formatDate(editTask.plannedEnd)}
                {editTask.forecastFinish && <> · Forecast {formatDate(editTask.forecastStart)} → <b style={{ color: Number(editTask.delayDays) > 0 ? C.red : C.text2 }}>{formatDate(editTask.forecastFinish)}</b></>}
                {typeof editTask.totalFloat === 'number' && <> · Float {editTask.totalFloat}d</>}
              </p>
            </div>

            {!editTask.isMilestone && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Progress: {editForm.progressPct}%</label>
                <input type="range" min="0" max="100" step="5" value={editForm.progressPct}
                  onChange={e => setEditForm((f: any) => ({ ...f, progressPct: parseInt(e.target.value), status: parseInt(e.target.value)===100?'completed':parseInt(e.target.value)>0?'in_progress':f.status }))}
                  style={{ width:'100%', cursor:'pointer' }} />
              </div>
            )}

            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                style={{ width:'100%', padding:'10px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {editTask.isSummary ? (
              <p style={{ fontSize:12, color:C.text3, margin:0 }}>This is a WBS package: its dates and progress roll up from its activities. Links to it stand for every activity inside it.</p>
            ) : (
              <ScheduleFields form={editForm} setForm={setEditForm} isMilestone={editTask.isMilestone} />
            )}

            <DependencyEditor
              value={editForm.dependencies}
              onChange={v => setEditForm((f: any) => ({ ...f, dependencies: v }))}
              options={list}
              selfCode={editTask.wbsCode} />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Actual Start" type="date" value={editForm.actualStart} onChange={e => setEditForm((f: any) => ({ ...f, actualStart: e.target.value }))} />
              <Input label="Actual End" type="date" value={editForm.actualEnd} onChange={e => setEditForm((f: any) => ({ ...f, actualEnd: e.target.value }))} />
            </div>

            {(editForm.status === 'delayed' || Number(editTask.delayDays) > 0 || (Number(editForm.progressPct) < 100 && new Date(editTask.plannedEnd) < new Date())) && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:C.red, display:'block', marginBottom:5 }}>Delay Reason</label>
                <textarea value={editForm.delayReason} onChange={e => setEditForm((f: any) => ({ ...f, delayReason: e.target.value }))} rows={2}
                  style={{ width:'100%', padding:'9px 13px', background:'#fff', border:'1.5px solid #fecaca', borderRadius:8, fontSize:13, fontFamily:'inherit', resize:'none' }} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Task Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add Activity" width={540}
        footer={<>
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" loading={createM.isPending} onClick={() => createM.mutate()}
            disabled={!newForm.wbsCode?.trim() || !newForm.title?.trim() || (newForm.plannedDuration === '' && !(newForm.plannedStart && newForm.plannedEnd))}>Add</Button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'110px 1fr', gap:12 }}>
            <Input label="Code *" value={newForm.wbsCode} onChange={e => setNewForm((f: any) => ({ ...f, wbsCode: e.target.value }))} placeholder="2.6" />
            <Input label="Activity *" value={newForm.title} onChange={e => setNewForm((f: any) => ({ ...f, title: e.target.value }))} />
          </div>
          <ScheduleFields form={newForm} setForm={setNewForm} />
          <details>
            <summary style={{ fontSize:12, fontWeight:600, color:C.text2, cursor:'pointer' }}>Planned dates (optional — kept for comparison only)</summary>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:10 }}>
              <Input label="Planned start" type="date" value={newForm.plannedStart} onChange={e => setNewForm((f: any) => ({ ...f, plannedStart: e.target.value }))} />
              <Input label="Planned end" type="date" value={newForm.plannedEnd} onChange={e => setNewForm((f: any) => ({ ...f, plannedEnd: e.target.value }))} />
            </div>
          </details>
          <DependencyEditor
            value={newForm.dependencies}
            onChange={v => setNewForm((f: any) => ({ ...f, dependencies: v }))}
            options={list} />
          <Input label="Responsible" value={newForm.responsible} onChange={e => setNewForm((f: any) => ({ ...f, responsible: e.target.value }))} />
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>Description / scope</label>
              <Button variant="ghost" size="sm" loading={taskAiBusy} onClick={generateTaskDetails}>✨ Generate scope & risks</Button>
            </div>
            <textarea value={newForm.description || ''} onChange={e => setNewForm((f: any) => ({ ...f, description: e.target.value }))} rows={5}
              placeholder="Scope, method and key risks… or click Generate to draft from the title."
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid '+C.border, borderRadius:8, fontSize:12.5, color:C.text1, outline:'none', fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

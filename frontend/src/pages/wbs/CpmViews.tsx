/**
 * The CPM, drawn from the engine's own numbers.
 *
 * Two views replace the force-directed graph that used to float in an empty
 * canvas:
 *  - a time-scaled logic Gantt — forecast bars on real dates, the plan (or a
 *    baseline) as a ghost bar beneath, float as a tail, driving ties on the
 *    longest path, and the data date, contract date and forecast as lines;
 *  - a layered network diagram of Primavera-style boxes, laid out so every
 *    arrow runs left to right and the critical path is one straight spine.
 *
 * Both are plain SVG, so they print, export and scale without a chart library.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  orderRows, timeScale, chartSpan, networkLayout, networkEdges, connectorPath, describeVariance,
  addDaysIso, parseIso, type CpmRow,
} from './cpmLayout'
import { formatDate } from '@/lib/date'

const CPM_COLORS = {
  ink: '#0f172a', ink2: '#475569', ink3: '#94a3b8', line: '#e2e8f0', faint: '#f1f5f9', paper: '#ffffff',
  navy: '#1a2540', blue: '#2563eb', blueSoft: '#dbeafe',
  red: '#dc2626', redSoft: '#fee2e2', redInk: '#991b1b',
  green: '#059669', greenSoft: '#d1fae5', amber: '#d97706', amberSoft: '#fef3c7',
  slate: '#64748b', winter: '#eef6ff',
}
const K = CPM_COLORS
const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

export interface CpmIssue { severity: 'error' | 'warning' | 'info'; rule: string; activity?: string; message: string }

/** The dates every time-scaled view marks: where we are, what we owe, where we are heading. */
export interface TimelineMarkers {
  dataDate: string
  contractCompletion: string
  forecastFinish: string | null
  contractVarianceDays: number | null
}

export interface CpmData extends TimelineMarkers {
  ok: boolean
  issues: CpmIssue[]
  projectStart: string
  contractDatesSource: 'project' | 'default'
  overallFinish: string | null
  longestPath: string[]
  allTasks: CpmRow[]
}

/** A dated checkpoint drawn across the timeline, e.g. a Clause 16.3 stage. */
export interface Checkpoint { date: string; label: string; title: string }

// ── Summary strip ───────────────────────────────────────────────────────────
export function ScheduleSummary({ cpm }: { cpm: CpmData }) {
  const v = describeVariance(cpm.contractVarianceDays)
  const tone = v.tone === 'late' ? K.red : v.tone === 'early' ? K.green : v.tone === 'even' ? K.blue : K.slate
  const byCode = new Map(cpm.allTasks.map(t => [t.wbsCode, t]))
  const tile = (label: string, value: ReactNode, note: ReactNode, accent?: string) => (
    <div style={{ flex: '1 1 180px', minWidth: 0, background: K.paper, border: `1.5px solid ${K.line}`, borderRadius: 12, padding: '12px 16px', borderTop: `3px solid ${accent ?? K.line}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: K.ink3 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: accent ?? K.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: K.ink2, marginTop: 2 }}>{note}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tile('Contract completion', formatDate(cpm.contractCompletion),
          cpm.contractDatesSource === 'project' ? 'from the project record' : <span style={{ color: K.amber, fontWeight: 600 }}>built-in date — set it on the project</span>)}
        {tile('Forecast completion', cpm.forecastFinish ? formatDate(cpm.forecastFinish) : '—', `as of data date ${formatDate(cpm.dataDate)}`, tone)}
        {tile('Against the contract', v.text, v.tone === 'late' ? 'negative float on the longest path' : v.tone === 'early' ? 'float on the longest path' : ' ', tone)}
        {tile('Trial run & O&M end', cpm.overallFinish ? formatDate(cpm.overallFinish) : '—', 'post-completion, outside the 30 months')}
      </div>
      {cpm.longestPath.length > 0 && (
        <div style={{ background: K.paper, border: `1.5px solid ${K.line}`, borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: K.redInk, marginBottom: 8 }}>
            Longest path to completion · {cpm.longestPath.length} activities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {cpm.longestPath.map((code, i) => {
              const t = byCode.get(code)
              // The longest path can branch (two activities finishing together), so an
              // arrow is drawn only where this activity really follows the one before it.
              const prev = cpm.longestPath[i - 1]
              const follows = !!prev && (t?.dependencies ?? []).some(d => d.code === prev || prev.startsWith(d.code + '.'))
              return (
                <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && (follows
                    ? <span aria-hidden style={{ color: K.red, fontSize: 12 }}>→</span>
                    : <span title="A parallel branch that also finishes on the forecast date" style={{ color: K.ink3, fontSize: 11, padding: '0 4px', borderLeft: `1px solid ${K.line}` }}>and</span>)}
                  <span title={t?.title} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '4px 9px', borderRadius: 999, background: K.redSoft, color: K.redInk, fontSize: 11.5, maxWidth: 260 }}>
                    <b style={{ fontFamily: MONO }}>{code}</b>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t?.title?.replace(/^MILESTONE:\s*/i, '◆ ')}</span>
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Schedule health ─────────────────────────────────────────────────────────
const RULE_TITLES: Record<string, string> = {
  'logic-loop': 'Logic loops', 'unknown-predecessor': 'Missing predecessors', 'duplicate-code': 'Duplicate codes',
  'self-link': 'Self links', 'bad-relationship': 'Invalid relationships', 'bad-lag': 'Invalid lags', 'bad-duration': 'Invalid durations',
  'open-start': 'Open starts', 'open-end': 'Open ends', 'date-derived-lag': 'Lags derived from dates',
  'summary-start-link': 'SS/SF links from summaries', 'summary-link': 'Links through summaries', 'lead': 'Leads (negative lags)',
  'milestone-with-duration': 'Milestones with durations', 'contract-after-post-completion': 'Contract work after the trial run',
  'contract-dates-unset': 'Contract dates', 'approval-undated': 'Undated approvals', 'no-actual-start': 'Missing actual starts',
  'complete-without-actuals': 'Complete without actual dates', 'progress-without-actuals': 'Progress without an actual start',
  'unknown-parent': 'Unknown parents',
}

export function ScheduleHealth({ issues }: { issues: CpmIssue[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const groups = useMemo(() => {
    const m = new Map<string, CpmIssue[]>()
    for (const i of issues) m.set(i.rule, [...(m.get(i.rule) ?? []), i])
    const rank = { error: 0, warning: 1, info: 2 }
    return [...m.entries()].sort((a, b) => rank[a[1][0].severity] - rank[b[1][0].severity] || b[1].length - a[1].length)
  }, [issues])
  const count = (s: CpmIssue['severity']) => issues.filter(i => i.severity === s).length
  const dot = (s: CpmIssue['severity']) => ({ error: K.red, warning: K.amber, info: K.slate })[s]
  if (!issues.length) {
    return <div style={{ padding: '10px 14px', borderRadius: 12, background: K.greenSoft, color: K.green, fontSize: 12.5, fontWeight: 600 }}>Schedule health: no errors or warnings.</div>
  }
  return (
    <div style={{ background: K.paper, border: `1.5px solid ${K.line}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderBottom: `1px solid ${K.line}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: K.ink2 }}>Schedule health</span>
        {(['error', 'warning', 'info'] as const).map(s => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: K.ink2 }}>
            <i style={{ width: 8, height: 8, borderRadius: 99, background: dot(s), display: 'inline-block' }} />
            <b style={{ color: K.ink }}>{count(s)}</b> {s === 'error' ? 'errors' : s === 'warning' ? 'warnings' : 'notes'}
          </span>
        ))}
        {count('error') > 0 && <span style={{ fontSize: 12, color: K.red, fontWeight: 600 }}>The schedule cannot be calculated until the errors are fixed.</span>}
      </div>
      {groups.map(([rule, list]) => (
        <div key={rule} style={{ borderBottom: `1px solid ${K.faint}` }}>
          <button onClick={() => setOpen(open === rule ? null : rule)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <i style={{ width: 8, height: 8, borderRadius: 99, background: dot(list[0].severity), flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: K.ink }}>{RULE_TITLES[rule] ?? rule}</span>
            <span style={{ fontSize: 11.5, color: K.ink3 }}>{list.length}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: K.ink3 }}>{open === rule ? 'Hide' : 'Show'}</span>
          </button>
          {open === rule && (
            <ul style={{ margin: 0, padding: '0 14px 10px 32px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {list.map((i, n) => (
                <li key={n} style={{ fontSize: 12, color: K.ink2, lineHeight: 1.45 }}>
                  {i.activity && <b style={{ fontFamily: MONO, color: K.ink, marginRight: 6 }}>{i.activity}</b>}{i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Time-scaled logic Gantt ─────────────────────────────────────────────────
export interface BaselineDates { start: string | null; finish: string | null }

export function CpmTimeline({ cpm, rows, baseline, zoom = 1, svgRef, width: fixedWidth, onSelect, checkpoints = [], progress }: {
  cpm: TimelineMarkers
  rows: CpmRow[]
  baseline?: Map<string, BaselineDates> | null
  zoom?: number
  svgRef?: RefObject<SVGSVGElement | null>
  /** Fixed drawing width, for export; on screen the chart fills its container. */
  width?: number
  /** Called with the activity code when a row is clicked. */
  onSelect?: (code: string) => void
  checkpoints?: Checkpoint[]
  /** Progress to print beside each label (summaries rolled up from their activities). */
  progress?: Map<string, number>
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapW, setWrapW] = useState(1100)
  const [scrollX, setScrollX] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth))
    ro.observe(el); setWrapW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const ordered = useMemo(() => orderRows(rows), [rows])
  // A five-year O&M period would squeeze the 30 months into a sliver, so long
  // post-completion periods are left out of the scale and run off the right edge.
  const span = useMemo(() => {
    const scaled = rows.filter(r => r.scope !== 'post_completion' || r.duration <= 366)
    return chartSpan(scaled.length ? scaled : rows, [cpm.contractCompletion, cpm.forecastFinish, cpm.dataDate, ...checkpoints.map(c => c.date)])
  }, [rows, cpm.contractCompletion, cpm.forecastFinish, cpm.dataDate, checkpoints])
  const LABEL_W = 300, ROW_H = 30, HEAD_H = 46, PAD_B = checkpoints.length ? 32 : 18
  const chartW = Math.max((fixedWidth ?? wrapW) - LABEL_W - 2, 600) * zoom
  const scale = timeScale(span.from, span.to, chartW)
  const width = LABEL_W + chartW
  const height = HEAD_H + ordered.length * ROW_H + PAD_B
  const yOf = new Map(ordered.map((r, i) => [r.wbsCode, HEAD_H + i * ROW_H]))
  const RIGHT = LABEL_W + chartW - 2
  const X = (iso: string) => LABEL_W + scale.x(iso)
  const endX = (iso: string) => X(addDaysIso(iso, 1))

  // Srinagar winter bands (Dec–Feb): the shutdown winter-restricted work observes.
  const winters: Array<[number, number]> = []
  for (let y = +span.from.slice(0, 4) - 1; y <= +span.to.slice(0, 4); y++) {
    const a = Math.max(parseIso(`${y}-12-01`), parseIso(span.from)), b = Math.min(parseIso(`${y + 1}-03-01`), parseIso(span.to))
    if (b > a) winters.push([LABEL_W + scale.x(new Date(a).toISOString().slice(0, 10)), LABEL_W + scale.x(new Date(b).toISOString().slice(0, 10))])
  }

  const edges = useMemo(() => networkEdges(rows).filter(e => e.critical), [rows])
  const byCode = useMemo(() => new Map(rows.map(r => [r.wbsCode, r])), [rows])

  // The contract and forecast labels face away from each other so they never collide.
  const forecastFirst = !!cpm.forecastFinish && cpm.forecastFinish < cpm.contractCompletion
  const marker = (iso: string | null, label: string, color: string, dash?: string, align: 'start' | 'end' = 'start') => {
    if (!iso) return null
    const x = iso === cpm.dataDate ? X(iso) : endX(iso)
    return (
      <g>
        <line x1={x} x2={x} y1={HEAD_H - 6} y2={height - PAD_B + 6} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
        <text x={align === 'start' ? x + 5 : x - 5} y={HEAD_H - 10} fontSize={10.5} fontWeight={700} fill={color} textAnchor={align}>{label}</text>
      </g>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', overflowX: 'auto', border: `1.5px solid ${K.line}`, borderRadius: 12, background: K.paper }}
      onScroll={e => setScrollX((e.target as HTMLDivElement).scrollLeft)}>
      <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label="Time-scaled logic Gantt of the forecast schedule" style={{ display: 'block', fontFamily: FONT }}>
        <defs>
          <marker id="cpm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill={K.red} />
          </marker>
          <pattern id="cpm-post" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#ede9fe" /><line x1="0" y1="0" x2="0" y2="6" stroke="#c4b5fd" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill={K.paper} />

        {/* zebra rows */}
        {ordered.map((r, i) => i % 2 === 1 && <rect key={r.wbsCode} x={0} y={HEAD_H + i * ROW_H} width={width} height={ROW_H} fill="#fafbfc" />)}
        {/* winter shutdown bands */}
        {winters.map(([a, b], i) => (
          <g key={i}>
            <rect x={a} y={HEAD_H} width={b - a} height={height - HEAD_H - PAD_B} fill={K.winter} />
            <text x={(a + b) / 2} y={height - 5} fontSize={9} fill="#7aa2cc" textAnchor="middle">winter</text>
          </g>
        ))}
        {/* time axis */}
        <rect x={LABEL_W} y={0} width={chartW} height={HEAD_H - 16} fill="#f8fafc" />
        {scale.ticks.map((t, i) => (
          <g key={i}>
            <line x1={LABEL_W + t.x} x2={LABEL_W + t.x} y1={t.major ? 0 : 14} y2={height - PAD_B} stroke={t.major ? '#cbd5e1' : K.faint} strokeWidth={t.major ? 1.2 : 1} />
            <text x={LABEL_W + t.x + 4} y={t.major ? 12 : 25} fontSize={t.major ? 11 : 9.5} fontWeight={t.major ? 800 : 500} fill={t.major ? K.ink : K.ink3}>{t.label}</text>
          </g>
        ))}

        {/* Clause 16.3 stages: share of the work due at each fraction of the contract time */}
        {checkpoints.map(c => {
          const x = endX(c.date)
          return (
            <g key={c.date}>
              <title>{c.title}</title>
              <line x1={x} x2={x} y1={HEAD_H} y2={height - PAD_B} stroke={K.amber} strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.7} />
              <text x={x + 4} y={height - 18} fontSize={9} fontWeight={700} fill={K.amber}>{c.label}</text>
            </g>
          )
        })}

        {marker(cpm.dataDate, 'Data date', K.blue)}
        {marker(cpm.contractCompletion, `Contract ${formatDate(cpm.contractCompletion)}`, K.navy, '5 4', forecastFirst ? 'start' : 'end')}
        {cpm.forecastFinish && cpm.forecastFinish !== cpm.contractCompletion &&
          marker(cpm.forecastFinish, `Forecast ${formatDate(cpm.forecastFinish)}`, (cpm.contractVarianceDays ?? 0) > 0 ? K.red : K.green, undefined, forecastFirst ? 'end' : 'start')}

        {/* driving ties along the longest path */}
        {edges.map((e, i) => {
          const a = byCode.get(e.from), b = byCode.get(e.to)
          const ya = yOf.get(e.from), yb = yOf.get(e.to)
          if (!a?.forecastStart || !b?.forecastStart || ya === undefined || yb === undefined) return null
          const x1 = e.type === 'SS' || e.type === 'SF' ? X(a.forecastStart) : (a.duration > 0 ? endX(a.forecastFinish!) : X(a.forecastStart))
          const x2 = X(b.forecastStart)
          const y1 = ya + ROW_H / 2, y2 = yb + ROW_H / 2
          const mid = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 10))
          return <path key={i} d={`M${x1},${y1} H${mid} V${y2} H${x2 - 2}`} fill="none" stroke={K.red} strokeWidth={1.3} strokeOpacity={0.75} markerEnd="url(#cpm-arrow)" />
        })}

        {/* bars */}
        {ordered.map(r => {
          const y = yOf.get(r.wbsCode)!
          const cy = y + ROW_H / 2
          const crit = !!r.isCritical
          const post = r.scope === 'post_completion'
          const done = r.status === 'complete'
          const tip = `${r.wbsCode}  ${r.title}\nForecast ${r.forecastStart ? formatDate(r.forecastStart) : '—'} → ${r.forecastFinish ? formatDate(r.forecastFinish) : '—'}`
            + `\nPlanned ${r.plannedStart ? formatDate(r.plannedStart) : '—'} → ${r.plannedEnd ? formatDate(r.plannedEnd) : '—'}`
            + `\nDuration ${r.duration}d · Total float ${r.float ?? '—'}d · Free float ${r.freeFloat ?? '—'}d${crit ? ' · on the longest path' : ''}`
          const ghost = baseline?.get(r.wbsCode) ?? { start: r.plannedStart ?? null, finish: r.plannedEnd ?? null }
          return (
            <g key={r.wbsCode} onClick={onSelect ? () => onSelect(r.wbsCode) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined}>
              <title>{tip}</title>
              {/* the plan (or baseline) as a ghost bar */}
              {ghost.start && ghost.finish && !r.isMilestone && (
                <rect x={X(ghost.start)} y={cy + 6} width={Math.max(2, Math.min(RIGHT, endX(ghost.finish)) - X(ghost.start))} height={4} rx={2} fill="#cbd5e1" />
              )}
              {r.forecastStart && r.forecastFinish && (() => {
                const x1 = X(r.forecastStart), rawX2 = r.duration > 0 || r.isSummary ? endX(r.forecastFinish) : x1
                const clipped = rawX2 > RIGHT
                const x2 = Math.min(rawX2, RIGHT)
                if (r.isSummary) {
                  const c = crit ? K.red : K.navy
                  return (
                    <g>
                      <rect x={x1} y={cy - 5} width={Math.max(2, x2 - x1)} height={6} fill={c} />
                      <path d={`M${x1},${cy + 1} l0,6 l6,-6 z M${x2},${cy + 1} l0,6 l-6,-6 z`} fill={c} />
                    </g>
                  )
                }
                if (r.duration === 0 || r.isMilestone) {
                  const c = done ? K.green : crit ? K.red : K.amber
                  return <path d={`M${x1},${cy - 8} l8,8 l-8,8 l-8,-8 z`} fill={c} stroke="#fff" strokeWidth={1.5} />
                }
                const w = Math.max(3, x2 - x1)
                const fill = post ? 'url(#cpm-post)' : done ? K.green : crit ? K.red : K.blue
                const pct = Math.max(0, Math.min(100, Number(r.progressPct) || 0))
                return (
                  <g>
                    <rect x={x1} y={cy - 8} width={w} height={14} rx={4} fill={fill} fillOpacity={done || post ? 1 : 0.22} stroke={post ? '#8b5cf6' : fill} strokeWidth={1.3} />
                    {!done && !post && pct > 0 && <rect x={x1} y={cy - 8} width={w * pct / 100} height={14} rx={4} fill={fill} />}
                    {clipped && <text x={x2 - 6} y={cy + 3} fontSize={9.5} fontWeight={700} textAnchor="end" fill="#6d28d9">continues to {formatDate(r.forecastFinish)} →</text>}
                    {/* total float as a tail to the late finish */}
                    {!done && !clipped && typeof r.lf === 'number' && typeof r.ef === 'number' && r.lf > r.ef && (
                      <g stroke={K.slate} strokeWidth={1.2}>
                        <line x1={x2} x2={x2 + scale.xDay(r.lf - r.ef)} y1={cy - 1} y2={cy - 1} strokeDasharray="2 2" />
                        <line x1={x2 + scale.xDay(r.lf - r.ef)} x2={x2 + scale.xDay(r.lf - r.ef)} y1={cy - 5} y2={cy + 3} />
                      </g>
                    )}
                    {w > 46 && pct > 0 && !done && <text x={x1 + 5} y={cy + 3} fontSize={9.5} fontWeight={700} fill="#fff">{Math.round(pct)}%</text>}
                  </g>
                )
              })()}
              {/* float label */}
              {typeof r.float === 'number' && !r.isSummary && r.status !== 'complete' && r.forecastFinish && endX(r.forecastFinish) <= RIGHT && (
                <text x={(r.duration > 0 ? endX(r.forecastFinish) : X(r.forecastStart!)) + (typeof r.lf === 'number' && typeof r.ef === 'number' && r.lf > r.ef ? scale.xDay(r.lf - r.ef) : 0) + 6}
                  y={cy + 3.5} fontSize={9.5} fontWeight={r.float < 0 ? 700 : 500} fill={r.float < 0 ? K.red : K.ink3}>
                  {r.float < 0 ? `TF ${r.float}d` : `TF ${r.float}d`}
                </text>
              )}
            </g>
          )
        })}

        {/* sticky label column — moved with the scroll so it stays in view */}
        <g transform={`translate(${scrollX},0)`}>
          <rect x={0} y={0} width={LABEL_W} height={height} fill={K.paper} />
          <rect x={0} y={0} width={LABEL_W} height={HEAD_H - 16} fill="#f8fafc" />
          <text x={14} y={19} fontSize={10} fontWeight={800} letterSpacing="0.06em" fill={K.ink3}>ACTIVITY</text>
          <line x1={LABEL_W} x2={LABEL_W} y1={0} y2={height} stroke={K.line} strokeWidth={1.5} />
          {ordered.map((r, i) => {
            const y = HEAD_H + i * ROW_H
            const crit = !!r.isCritical
            const indent = 14 + r.depth * 16
            const title = r.title.replace(/^MILESTONE:\s*/i, '')
            const pct = r.isMilestone ? undefined : progress?.get(r.wbsCode)
            const room = 34 - r.depth * 2 - (pct === undefined ? 0 : 4)
            return (
              <g key={r.wbsCode} onClick={onSelect ? () => onSelect(r.wbsCode) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined}>
                <title>{`${r.wbsCode}  ${r.title}`}</title>
                <rect x={0} y={y} width={LABEL_W} height={ROW_H} fill={i % 2 === 1 ? '#fafbfc' : K.paper} />
                {crit && <rect x={0} y={y + 4} width={3} height={ROW_H - 8} rx={1.5} fill={K.red} />}
                <text x={indent} y={y + ROW_H / 2 + 4} fontSize={11} fontFamily={MONO} fontWeight={700} fill={crit ? K.red : r.isSummary ? K.navy : K.blue}>{r.wbsCode}</text>
                <text x={indent + 44} y={y + ROW_H / 2 + 4} fontSize={11.5} fontWeight={r.isSummary ? 700 : 500} fill={r.scope === 'post_completion' ? '#6d28d9' : K.ink}>
                  {title.length > room ? title.slice(0, room - 1) + '…' : title}
                </text>
                {pct !== undefined && (
                  <text x={LABEL_W - 10} y={y + ROW_H / 2 + 4} fontSize={10} fontWeight={700} textAnchor="end" fill={pct >= 100 ? K.green : pct > 0 ? K.blue : K.ink3}>{Math.round(pct)}%</text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// ── Network diagram ─────────────────────────────────────────────────────────
/** Two lines of at most `n` characters, broken between words, the second ending in … if cut. */
function wrapTwo(text: string, n: number): [string, string] {
  const words = text.split(/\s+/)
  const lines = ['', '']
  let i = 0
  for (const w of words) {
    const next = lines[i] ? lines[i] + ' ' + w : w
    if (next.length <= n) { lines[i] = next; continue }
    if (i === 0 && lines[0]) { i = 1; lines[1] = w; continue }
    lines[i] = (lines[i] ? lines[i] + ' ' : '') + w
    break
  }
  const used = (lines[0] + ' ' + lines[1]).trim().length
  if (lines[1].length > n || used < text.trim().length) lines[1] = lines[1].slice(0, n - 1).trimEnd() + '…'
  if (lines[0].length > n) lines[0] = lines[0].slice(0, n - 1) + '…'
  return [lines[0], lines[1]]
}

export function CpmNetwork({ rows, zoom = 1, svgRef }: { rows: CpmRow[]; zoom?: number; svgRef?: RefObject<SVGSVGElement | null> }) {
  const layout = useMemo(() => networkLayout(rows), [rows])
  const byCode = useMemo(() => new Map(rows.map(r => [r.wbsCode, r])), [rows])
  const pos = new Map(layout.nodes.map(n => [n.code, n]))
  const { w, h } = layout.box
  const PAD = 28
  const width = layout.width + PAD * 2, height = layout.height + PAD * 2
  const short = (iso?: string | null) => iso ? formatDate(iso).replace(/-20(\d\d)$/, '-$1') : '—'

  return (
    <div style={{ overflow: 'auto', border: `1.5px solid ${K.line}`, borderRadius: 12, background: '#fbfcfe', maxHeight: 720 }}>
      <svg ref={svgRef} width={width * zoom} height={height * zoom} viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label="Activity-on-node network diagram" style={{ display: 'block', fontFamily: FONT }}>
        <defs>
          <marker id="net-arrow-red" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={K.red} /></marker>
          <marker id="net-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" /></marker>
        </defs>
        <rect width={width} height={height} fill="#fbfcfe" />
        <g transform={`translate(${PAD},${PAD})`}>
          {/* non-critical links first, so the red spine draws on top */}
          {[...layout.edges].sort((a, b) => Number(a.critical) - Number(b.critical)).map((e, i) => {
            const a = pos.get(e.from), b = pos.get(e.to)
            if (!a || !b) return null
            return (
              <path key={i} d={connectorPath(a.x + w, a.y + h / 2, b.x - 2, b.y + h / 2)} fill="none"
                stroke={e.critical ? K.red : '#b6c2d1'} strokeWidth={e.critical ? 2.2 : 1.2}
                markerEnd={`url(#${e.critical ? 'net-arrow-red' : 'net-arrow'})`}>
                <title>{`${e.from} → ${e.to}  ${e.type}${e.lag ? (e.lag > 0 ? '+' : '') + e.lag : ''}`}</title>
              </path>
            )
          })}
          {layout.nodes.map(n => {
            const r = byCode.get(n.code)!
            const crit = !!r.isCritical, done = r.status === 'complete', post = r.scope === 'post_completion'
            const edge = crit ? K.red : done ? K.green : post ? '#8b5cf6' : '#94a3b8'
            const head = crit ? K.redSoft : done ? K.greenSoft : post ? '#ede9fe' : '#f1f5f9'
            const title = r.title.replace(/^MILESTONE:\s*/i, '◆ ')
            const [line1, line2] = wrapTwo(title, 27)
            return (
              <g key={n.code} transform={`translate(${n.x},${n.y})`}>
                <title>{`${r.wbsCode}  ${r.title}\nES ${short(r.forecastStart)} · EF ${short(r.forecastFinish)}\nTotal float ${r.float ?? '—'}d · Free float ${r.freeFloat ?? '—'}d`}</title>
                <rect width={w} height={h} rx={8} fill="#fff" stroke={edge} strokeWidth={crit ? 2 : 1.3} />
                <path d={`M0,8 a8,8 0 0 1 8,-8 h${w - 16} a8,8 0 0 1 8,8 v12 h-${w} z`} fill={head} />
                <line x1={0} x2={w} y1={20} y2={20} stroke={edge} strokeOpacity={0.35} />
                <line x1={0} x2={w} y1={h - 18} y2={h - 18} stroke={edge} strokeOpacity={0.35} />
                <text x={7} y={14} fontSize={9} fill={K.ink2} fontFamily={MONO}>{short(r.forecastStart)}</text>
                <text x={w / 2} y={14} fontSize={9} fontWeight={700} fill={crit ? K.redInk : K.ink} textAnchor="middle">{r.duration}d</text>
                <text x={w - 7} y={14} fontSize={9} fill={K.ink2} fontFamily={MONO} textAnchor="end">{short(r.forecastFinish)}</text>
                <text x={8} y={34} fontSize={10.5} fontWeight={800} fontFamily={MONO} fill={crit ? K.red : K.blue}>{r.wbsCode}</text>
                <text x={8} y={46} fontSize={10} fontWeight={600} fill={K.ink}>{line1}</text>
                {line2 && <text x={8} y={57} fontSize={10} fill={K.ink2}>{line2}</text>}
                <text x={7} y={h - 6} fontSize={9} fill={K.ink3} fontFamily={MONO}>LF {typeof r.lf === 'number' ? r.lf : '—'}</text>
                <text x={w / 2} y={h - 6} fontSize={9} fontWeight={800} textAnchor="middle" fill={(r.float ?? 0) < 0 ? K.red : crit ? K.redInk : K.green}>
                  {done ? 'DONE' : `TF ${r.float ?? '—'}`}
                </text>
                <text x={w - 7} y={h - 6} fontSize={9} fill={K.ink3} fontFamily={MONO} textAnchor="end">FF {r.freeFloat ?? '—'}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// ── Legend ──────────────────────────────────────────────────────────────────
/** What each mark on the timeline means, drawn with the same shapes. */
export function CpmLegend({ view = 'timeline', ghost = 'Plan' }: { view?: 'timeline' | 'network'; ghost?: string }) {
  const item = (swatch: ReactNode, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: K.ink2, whiteSpace: 'nowrap' }}>
      <svg width={26} height={14} aria-hidden style={{ flexShrink: 0 }}>{swatch}</svg>{label}
    </span>
  )
  const bar = (c: string) => <><rect x={1} y={2} width={24} height={10} rx={3} fill={c} fillOpacity={0.22} stroke={c} strokeWidth={1.2} /><rect x={1} y={2} width={10} height={10} rx={3} fill={c} /></>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '10px 14px', background: K.paper, border: `1.5px solid ${K.line}`, borderRadius: 12 }}>
      {view === 'timeline' ? <>
        {item(bar(K.blue), 'Forecast (filled = progress)')}
        {item(bar(K.red), 'Longest path')}
        {item(<rect x={1} y={2} width={24} height={10} rx={3} fill={K.green} />, 'Complete')}
        {item(<path d="M13,1 l6,6 l-6,6 l-6,-6 z" fill={K.amber} />, 'Milestone')}
        {item(<><rect x={1} y={4} width={24} height={5} fill={K.navy} /><path d="M1,9 l0,4 l4,-4 z M25,9 l0,4 l-4,-4 z" fill={K.navy} /></>, 'WBS package')}
        {item(<rect x={1} y={6} width={24} height={4} rx={2} fill="#cbd5e1" />, ghost)}
        {item(<g stroke={K.slate} strokeWidth={1.2}><line x1={1} x2={23} y1={7} y2={7} strokeDasharray="2 2" /><line x1={23} x2={23} y1={3} y2={11} /></g>, 'Total float')}
        {item(<><rect x={1} y={1} width={24} height={12} fill={K.winter} /><text x={13} y={10} fontSize={7} textAnchor="middle" fill="#7aa2cc">Dec–Feb</text></>, 'Winter')}
        {item(<rect x={1} y={2} width={24} height={10} rx={3} fill="url(#legend-post)" stroke="#8b5cf6" />, 'Trial run / O&M')}
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden><defs>
          <pattern id="legend-post" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#ede9fe" /><line x1="0" y1="0" x2="0" y2="6" stroke="#c4b5fd" strokeWidth="2" />
          </pattern></defs></svg>
      </> : <>
        {item(<rect x={1} y={1} width={24} height={12} rx={3} fill="#fff" stroke={K.red} strokeWidth={2} />, 'On the longest path')}
        {item(<rect x={1} y={1} width={24} height={12} rx={3} fill="#fff" stroke="#94a3b8" strokeWidth={1.3} />, 'Has float')}
        {item(<rect x={1} y={1} width={24} height={12} rx={3} fill={K.greenSoft} stroke={K.green} strokeWidth={1.3} />, 'Complete')}
        <span style={{ fontSize: 11, color: K.ink3 }}>Box: forecast start · duration · forecast finish / code & activity / late finish (day) · total float · free float</span>
      </>}
    </div>
  )
}

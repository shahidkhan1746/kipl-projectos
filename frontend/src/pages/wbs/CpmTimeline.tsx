import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Printer, ArrowsOutSimple } from '@phosphor-icons/react'
import { projectsApi } from '@/api/projects.api'
import {
  buildTimeline, dependencyLabel, formatDay, layoutNetwork, NODE_HEIGHT, NODE_WIDTH,
  parseDay, taskTone,
} from './cpmPresentation'
import type { PresentationTask } from './cpmPresentation'
import './CpmTimeline.css'
import printStyles from './CpmTimeline.css?inline'

const DAY = 86_400_000
const SHEET_WIDTH = 1540
const COLOURS = { completed: '#1f7a4d', critical: '#b3261e', hold: '#a16207', progress: '#275d8c', planned: '#526476', milestone: '#6650a4' }
const STATUS: Record<string, string> = { completed: 'Completed', in_progress: 'In progress', not_started: 'Planned', delayed: 'Delayed', on_hold: 'On hold' }
type View = 'programme' | 'network'
type Scope = 'all' | 'critical' | 'milestones'
interface Dashboard { contractStart?: string; contractEnd?: string }

function numberText(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  return Number.isFinite(number) ? String(Math.round(number * 100) / 100) : '—'
}

function tone(task: PresentationTask) {
  const saved = taskTone(task)
  return task.isMilestone && saved === 'planned' ? 'milestone' : saved
}

function wrapTitle(title: string, size = 27, maxLines = 3) {
  const words = title.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && `${line} ${word}`.length > size) { lines.push(line); line = word }
    else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines).map((value, i) => {
    const clipped = value.length > size ? `${value.slice(0, size - 1)}…` : value
    return i === maxLines - 1 && lines.length > maxLines ? `${clipped.slice(0, size - 1)}…` : clipped
  })
}

function Legend() {
  return <div className="cpm-legend" aria-label="Schedule colour legend">
    {Object.entries({ completed: 'Completed', planned: 'Planned work', progress: 'In progress', critical: 'Flagged critical', hold: 'On hold', milestone: 'Milestone' }).map(([key, label]) =>
      <span key={key}><i className={`cpm-swatch cpm-tone-${key}`} />{label}</span>)}
  </div>
}

function Programme({ tasks, contractStart, contractEnd, reportDate }: {
  tasks: PresentationTask[]; contractStart?: string; contractEnd?: string; reportDate: string
}) {
  const timeline = useMemo(() => buildTimeline(tasks, contractStart, contractEnd), [tasks, contractStart, contractEnd])
  const span = timeline.end - timeline.start
  const position = (date: number) => (date - timeline.start) / span * 100
  const hasChildren = new Set(tasks.map(t => t.parentId).filter(Boolean))
  const reportDay = parseDay(reportDate)
  const finishDay = parseDay(contractEnd)
  const markers = [
    { day: reportDay, className: 'cpm-report-line', label: `Report date: ${formatDay(reportDate)}` },
    { day: finishDay, className: 'cpm-finish-line', label: `Contract finish: ${formatDay(contractEnd)}` },
  ].filter(m => m.day !== null && m.day >= timeline.start && m.day < timeline.end)
  return <><div className="cpm-schedule" aria-label="Saved activity programme">
    <table className="cpm-table">
      <caption className="cpm-sr-only">Activity register with planned dates, saved total float, status and monthly timeline.</caption>
      <colgroup>{[3, 19, 4, 6, 6, 6, 5, 3, 48].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>
      <thead>
        <tr><th scope="col">ID</th><th scope="col" className="cpm-left">WBS / Activity</th><th scope="col">Dur.</th><th scope="col">Start</th><th scope="col">Finish</th><th scope="col">Status</th><th scope="col">Pred.</th><th scope="col">TF</th>
          <th scope="col" className="cpm-calendar-cell"><div className="cpm-year-row">{timeline.years.map(year => <span key={year.year} style={{ width: `${(year.end - year.start) / span * 100}%` }}>{year.year}</span>)}</div></th>
        </tr>
        <tr className="cpm-units"><td /><td>Saved planned dates · calendar axis</td><td>days</td><td /><td /><td /><td /><td>days</td>
          <td className="cpm-calendar-cell"><div className="cpm-month-row">{timeline.months.map(month => <span key={month.key} style={{ width: `${(month.end - month.start) / span * 100}%` }} title={`${month.label} ${month.year}`}>{month.label}</span>)}</div></td>
        </tr>
      </thead>
      <tbody>{tasks.map((task, index) => {
        const start = parseDay(task.plannedStart)
        const end = parseDay(task.plannedEnd)
        const valid = start !== null && end !== null && end >= start && span > 0
        const outsideAxis = valid && (start! >= timeline.end || end! < timeline.start)
        const group = hasChildren.has(task.wbsCode) || (!!task.id && hasChildren.has(task.id))
        const colour = tone(task)
        return <tr key={`${task.id ?? task.wbsCode}-${index}`} className={group ? 'cpm-group' : undefined}>
          <td title={task.wbsCode}>{task.wbsCode}</td>
          <th scope="row" className="cpm-activity" title={task.title}><span style={{ paddingLeft: task.parentId ? 10 : 0 }}>{task.title}{task.isMilestone ? ' ◆' : ''}</span></th>
          <td>{numberText(task.plannedDuration)}</td><td>{formatDay(task.plannedStart)}</td><td>{formatDay(task.plannedEnd)}</td>
          <td className={`cpm-status-${colour}`}>{STATUS[task.status ?? ''] ?? 'Not recorded'}</td>
          <td title={dependencyLabel(task)}>{dependencyLabel(task)}</td><td>{numberText(task.totalFloat)}</td>
          <td className="cpm-calendar-cell"><div className="cpm-track">
            {timeline.months.map(month => <span key={month.key} className="cpm-grid-line" style={{ left: `${position(month.start)}%` }} />)}
            {markers.map(marker => <span key={marker.className} className={`cpm-date-line ${marker.className}`} style={{ left: `${position(marker.day!)}%` }} title={marker.label} />)}
            {outsideAxis ? <span className="cpm-undated">Outside displayed range</span> : valid ? task.isMilestone ? <span className={`cpm-diamond cpm-tone-${colour}`} style={{ left: `${Math.max(.5, Math.min(99.5, position(start!)))}%` }} title={`${task.title} · ${formatDay(task.plannedStart)}`} />
              : <span className={`cpm-bar cpm-tone-${colour}`} style={{ left: `${Math.max(0, position(start!))}%`, width: `${Math.max(.25, (end! - start! + DAY) / span * 100)}%` }} title={`${task.title} · ${formatDay(task.plannedStart)} – ${formatDay(task.plannedEnd)} · ${STATUS[task.status ?? ''] ?? 'Not recorded'}`}><span>{task.wbsCode}</span></span>
              : <span className="cpm-undated">Dates not recorded / invalid</span>}
          </div></td>
        </tr>
      })}</tbody>
    </table>
  </div>{timeline.truncated && <p className="cpm-network-notice">The time axis is limited to 100 years. Some saved dates fall outside it; their register values remain shown.</p>}</>
}

function NodeNetwork({ layout, reportDate, svgRef, onSelect, selectedId }: {
  layout: ReturnType<typeof layoutNetwork>; reportDate: string; svgRef: React.RefObject<SVGSVGElement | null>;
  onSelect: (id: string) => void; selectedId: string | null
}) {
  const id = useId().replace(/:/g, '')
  const nodes = new Map(layout.nodes.map(n => [n.id, n]))
  return <>
    {layout.warnings.length > 0 && <div className="cpm-network-notice" role="status">{layout.warnings.length} display note(s): {layout.warnings.slice(0, 3).join(' ')}{layout.warnings.length > 3 ? ' Additional unresolved links are omitted.' : ''}</div>}
    <div className="cpm-node-wrap">
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="group" aria-label="Activity-on-node network of saved project dependencies" style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <title>Activity-on-node CPM network — saved WBS data</title>
        <defs>
          <filter id={`${id}-shadow`} x="-10%" y="-10%" width="125%" height="135%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity=".13" /></filter>
          {['#64748b', COLOURS.critical].map((colour, i) => <marker key={colour} id={`${id}-arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={colour} /></marker>)}
        </defs>
        <rect width={layout.width} height={layout.height} fill="#fff" />
        <text x="28" y="35" fontSize="20" fontWeight="800" fill="#132033">ACTIVITY-ON-NODE CPM NETWORK</text>
        <text x="28" y="58" fontSize="11" fill="#5c6776">Report date {formatDay(reportDate)} · Dates and critical flags are taken from the saved activity register.</text>
        {layout.lanes.map((lane, index) => <g key={`${lane.title}-${index}`}><rect x="10" y={lane.y} width={layout.width - 20} height={lane.height} rx="8" fill={index % 2 ? '#fbfcfe' : '#f5f7fa'} stroke="#dbe2ea" /><text x="22" y={lane.y + 22} fontSize="12" fontWeight="700" fill="#64748b">{lane.title.toUpperCase().slice(0, 100)}</text></g>)}
        {layout.edges.map((edge, index) => {
          const from = nodes.get(edge.from), to = nodes.get(edge.to)
          if (!from || !to) return null
          const x1 = from.x + NODE_WIDTH, y1 = from.y + NODE_HEIGHT / 2, x2 = to.x, y2 = to.y + NODE_HEIGHT / 2
          const middle = x1 + Math.max(12, (x2 - x1) / 2)
          // Long links use the clear channel above the lane instead of cutting
          // through intermediate activity cards. This changes routing, not logic.
          const channelY = layout.lanes[from.lane].y + 35 + index % 3 * 4
          const path = x2 > x1 && x2 - x1 <= 60
            ? `M${x1},${y1} H${middle} V${y2} H${x2 - 3}`
            : `M${x1},${y1} H${x1 + 16} V${channelY} H${x2 - 16} V${y2} H${x2 - 3}`
          const critical = !!from.task.isCritical && !!to.task.isCritical
          return <path key={`${edge.from}-${edge.to}-${index}`} d={path} fill="none" stroke={critical ? COLOURS.critical : '#64748b'} strokeWidth={critical ? 2 : 1.2} markerEnd={`url(#${id}-arrow-${critical ? 1 : 0})`}><title>{from.task.wbsCode} → {to.task.wbsCode}: {edge.type}{edge.lag ? ` ${edge.lag > 0 ? '+' : ''}${edge.lag}d` : ''}</title></path>
        })}
        {layout.nodes.map(node => {
          const task = node.task, colour = COLOURS[tone(task)]
          return <g key={node.id} transform={`translate(${node.x},${node.y})`} filter={`url(#${id}-shadow)`} role="button" tabIndex={0} aria-label={`${task.wbsCode}: ${task.title}. ${STATUS[task.status ?? ''] ?? 'Status not recorded'}. Open details.`} onClick={() => onSelect(node.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id) } }} style={{ cursor: 'pointer' }}>
            <title>{task.title} · {formatDay(task.plannedStart)} – {formatDay(task.plannedEnd)} · Predecessors: {dependencyLabel(task)}</title>
            <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="6" fill="#fff" stroke={colour} strokeWidth={selectedId === node.id ? 4 : 2} />
            <path d={`M6,0 H${NODE_WIDTH - 6} Q${NODE_WIDTH},0 ${NODE_WIDTH},6 V24 H0 V6 Q0,0 6,0`} fill={colour} />
            <text x="8" y="16" fontSize="11" fontWeight="800" fill="#fff">{task.wbsCode.length > 11 ? `${task.wbsCode.slice(0, 10)}…` : task.wbsCode}</text>
            <text x={NODE_WIDTH - 8} y="16" textAnchor="end" fontSize="9" fontWeight="700" fill="#fff">D:{numberText(task.plannedDuration)} | TF:{numberText(task.totalFloat)}</text>
            {wrapTitle(task.title).map((line, i) => <text key={i} x="8" y={40 + i * 12} fontSize="10.5" fontWeight="700" fill="#243447">{line}</text>)}
            <line x1="7" y1={NODE_HEIGHT - 24} x2={NODE_WIDTH - 7} y2={NODE_HEIGHT - 24} stroke="#d7dee7" />
            <text x="8" y={NODE_HEIGHT - 10} fontSize="8.6" fill="#4b5563">{formatDay(task.plannedStart)} → {formatDay(task.plannedEnd)}</text>
          </g>
        })}
      </svg>
    </div>
  </>
}

export default function CpmTimeline({ tasks, dashboard, projectId }: { tasks: PresentationTask[]; dashboard?: Dashboard; projectId: string | null }) {
  const [view, setView] = useState<View>('programme')
  const [scope, setScope] = useState<Scope>('all')
  const [zoom, setZoom] = useState('fit')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(SHEET_WIDTH)
  const [paperHeight, setPaperHeight] = useState(1060)
  const viewportRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const printFrame = useRef<HTMLIFrameElement | null>(null)
  const printTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const today = new Date()
  const reportDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const { data: projects = [] } = useQuery({ queryKey: ['header-projects'], queryFn: () => projectsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) })
  const project = projects.find((item: { id: string }) => item.id === projectId)
  const shown = useMemo(() => tasks.filter(task => scope === 'all' || (scope === 'critical' ? task.isCritical : task.isMilestone)), [tasks, scope])
  const network = useMemo(() => view === 'network' ? layoutNetwork(shown) : null, [shown, view])
  const selected = network?.nodes.find(node => node.id === selectedId)?.task ?? null
  // Counteract the drawing's fit-to-sheet scale so even long networks have
  // native-size cards. Only the screen wrapper grows; A3 export stays fitted.
  const readableScale = network ? Math.max(1, network.width / 1470, network.height / 772) : 1
  const scale = zoom === 'fit' ? Math.min(1, Math.max(.65, (viewportWidth - 32) / SHEET_WIDTH)) : zoom === 'nodes' ? readableScale : Number(zoom)
  const completed = tasks.filter(task => task.status === 'completed').length
  const held = tasks.filter(task => task.status === 'on_hold').length
  const critical = tasks.filter(task => task.isCritical).length
  const active = tasks.filter(task => task.status === 'in_progress').length
  const milestoneCount = tasks.filter(task => task.isMilestone).length

  useEffect(() => {
    const viewport = viewportRef.current, paper = sheetRef.current
    if (!viewport || !paper) return
    const measure = () => { setViewportWidth(viewport.clientWidth); setPaperHeight(paper.offsetHeight) }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport); observer.observe(paper)
    return () => observer.disconnect()
  }, [shown.length])

  useEffect(() => () => { clearTimeout(printTimer.current); printFrame.current?.remove() }, [])

  const saveSvg = () => {
    if (!svgRef.current) return
    try {
      const copy = svgRef.current.cloneNode(true) as SVGSVGElement
      // The downloadable drawing is a passive, self-contained vector document.
      copy.querySelectorAll('[role="button"]').forEach(node => { node.removeAttribute('tabindex'); node.removeAttribute('role') })
      const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `ProjectOS_CPM_Network_${reportDate}.svg`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch { setError('The network could not be downloaded. Please try again.') }
  }

  const printSheet = () => {
    if (!sheetRef.current || printing) return
    setError(''); setPrinting(true)
    printFrame.current?.remove()
    const frame = document.createElement('iframe')
    frame.title = 'CPM A3 print preview'
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;width:1px;height:1px;border:0;left:-10000px;top:0;'
    printFrame.current = frame
    const printScale = Math.min(1534 / SHEET_WIDTH, 1069 / sheetRef.current.offsetHeight)
    const cleanup = () => { frame.remove(); if (printFrame.current === frame) printFrame.current = null; clearTimeout(printTimer.current); setPrinting(false) }
    frame.onload = () => {
      const win = frame.contentWindow
      if (!win) { cleanup(); setError('Print preview is unavailable in this browser.'); return }
      win.addEventListener('afterprint', cleanup, { once: true })
      printTimer.current = setTimeout(cleanup, 120_000)
      try { win.focus(); win.print(); setPrinting(false) } catch { cleanup(); setError('Print preview could not open. Please allow printing in your browser.') }
    }
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>ProjectOS CPM ${view === 'network' ? 'Network' : 'Timeline'}</title><style>${printStyles}\n@page{size:A3 landscape;margin:7mm}html,body{margin:0;padding:0;background:#fff}.cpm-presentation{border:0!important;border-radius:0!important;background:#fff!important}.cpm-presentation .cpm-sheet{width:${SHEET_WIDTH}px!important;margin:0!important;box-shadow:none!important;transform:scale(${printScale})!important;transform-origin:top left!important}.cpm-print-boundary{width:${SHEET_WIDTH * printScale}px;height:${Math.ceil(sheetRef.current.offsetHeight * printScale)}px;overflow:hidden;margin:0 auto}</style></head><body><div class="cpm-presentation"><div class="cpm-print-boundary">${sheetRef.current.outerHTML}</div></div></body></html>`
    document.body.appendChild(frame)
  }

  return <section className="cpm-presentation" aria-label="CPM Timeline presentation">
    <div className="cpm-toolbar">
      <div className="cpm-view-switch" role="group" aria-label="Programme view">
        <button type="button" aria-pressed={view === 'programme'} onClick={() => { setView('programme'); setSelectedId(null); if (zoom === 'nodes') setZoom('fit') }}>Gantt / Time Programme</button>
        <button type="button" aria-pressed={view === 'network'} onClick={() => setView('network')}>CPM Node Network</button>
      </div>
      <button type="button" disabled={!shown.length || printing} onClick={printSheet}><Printer size={14} />{printing ? 'Opening print…' : 'Print / Save A3 PDF'}</button>
      {view === 'network' && <button type="button" disabled={!shown.length} onClick={saveSvg}><Download size={14} />Download Node SVG</button>}
      <label>Show<select aria-label="Timeline activity scope" value={scope} onChange={event => { setScope(event.target.value as Scope); setSelectedId(null) }}><option value="all">All activities</option><option value="critical">Flagged critical</option><option value="milestones">Milestones</option></select></label>
      <label>Zoom<select aria-label="Sheet zoom" value={zoom} onChange={event => setZoom(event.target.value)}><option value="fit">Fit sheet</option>{view === 'network' && <option value="nodes">Readable nodes</option>}<option value="0.65">65%</option><option value="0.85">85%</option><option value="1">100%</option><option value="1.25">125%</option></select></label>
      <button type="button" onClick={() => { setZoom('fit'); viewportRef.current?.scrollTo({ left: 0, top: 0 }) }} title="Reset sheet view"><ArrowsOutSimple size={14} />Fit</button>
      <span className="cpm-toolbar-hint">Presentation only · saved ERP data</span>
    </div>
    {error && <div className="cpm-error" role="alert">{error}</div>}
    <p className="cpm-pan-hint">Scroll across the sheet or {view === 'network' ? 'choose Readable nodes for larger networks' : 'increase zoom to read details'}. Printing fits the entire selected view onto A3; large schedules may need the SVG download for readable detail.</p>
    {!shown.length ? <div className="cpm-empty"><strong>No {scope === 'all' ? '' : scope === 'critical' ? 'flagged critical ' : 'milestone '}activities to display.</strong><p>{tasks.length ? 'Choose All activities to see the saved schedule.' : 'Add activities in WBS to populate this view. No sample activities are inserted.'}</p>{scope !== 'all' && <button type="button" onClick={() => setScope('all')}>Show all activities</button>}</div>
      : <div className="cpm-viewport" ref={viewportRef} tabIndex={0} role="region" aria-label="Scrollable A3 programme sheet">
        <div className="cpm-sheet-size" style={{ width: SHEET_WIDTH * scale, height: paperHeight * scale }}>
          <article ref={sheetRef} className={`cpm-sheet${view === 'network' ? ' cpm-node-sheet' : ''}`} style={{ transform: `scale(${scale})` } as CSSProperties}>
            <header className="cpm-sheet-header">
              <div className="cpm-sheet-title"><h2>{view === 'programme' ? 'MASTER CPM / TIME & PROGRESS CHART' : 'CPM NETWORK DIAGRAM — ACTIVITY ON NODE (AON)'}</h2><p className="cpm-project-name">{project?.name ?? 'ProjectOS · Project schedule'}</p><p className="cpm-sheet-description">{project?.client ? `${project.client} · ` : ''}{project?.location ? `${project.location} · ` : ''}WBS, dependencies, recorded progress and saved schedule indicators.</p></div>
              <dl className="cpm-meta">
                {[
                  ['Contract start', formatDay(dashboard?.contractStart)], ['Report date', formatDay(reportDate)],
                  ['Contract finish', formatDay(dashboard?.contractEnd)], ['Activities', `${shown.length} / ${tasks.length}`],
                  ['Date basis', 'Saved plan'], ['Sheet', 'A3 landscape'],
                  ['Source', 'ProjectOS WBS'], ['View', view === 'programme' ? 'Time programme' : 'Node network'],
                ].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
              </dl>
            </header>
            <div className="cpm-summary-strip">
              <div className="cpm-summary cpm-summary-alert"><b>RECORDED HOLDS</b><span>{held} activit{held === 1 ? 'y' : 'ies'} on hold in the saved register. Check the existing task and liaison records for supporting details.</span></div>
              <div className="cpm-summary cpm-summary-ok"><b>ACTUAL PROGRESS RECORDED</b><span>{completed} completed · {active} in progress · {milestoneCount} milestones. Status labels are shown as recorded.</span></div>
              <div className="cpm-summary cpm-summary-info"><b>SAVED CRITICAL FLAGS</b><span>{critical} activit{critical === 1 ? 'y is' : 'ies are'} flagged critical. Total float is displayed where available, without recalculating the programme.</span></div>
              {view === 'programme' && <div className="cpm-summary"><b>DRAWING / DATA BASIS</b><span>Planned activity dates on a monthly axis. No dates, durations or relationships are changed by this view.</span></div>}
            </div>
            <div className="cpm-checkpoints"><strong>Programme presentation:</strong> {scope === 'all' ? 'All saved activities' : scope === 'critical' ? 'Flagged critical activities only' : 'Milestones only'} · Report date is the viewing date, not a certified status date. {scope !== 'all' ? 'Links to activities outside this view are omitted.' : 'Saved values remain the source of truth.'}</div>
            {view === 'programme' ? <Programme tasks={shown} contractStart={dashboard?.contractStart} contractEnd={dashboard?.contractEnd} reportDate={reportDate} /> : network && <NodeNetwork layout={network} reportDate={reportDate} svgRef={svgRef} selectedId={selectedId} onSelect={setSelectedId} />}
            <Legend />
            {view === 'programme' ? <div className="cpm-sheet-bottom">
              <div className="cpm-note"><h3>CPM LOGIC / DISPLAY KEY</h3><p><strong className="cpm-red">Red:</strong> activities already flagged critical in the saved register. Red connectors join flagged activities; they do not certify a calculated driving path.</p><p><strong className="cpm-gold">Amber:</strong> recorded holds. Green denotes completed work; blue striped bars denote work in progress. Diamonds denote saved milestones.</p></div>
              <div className="cpm-note"><h3>STATUS / PRESENTATION NOTES</h3><p><strong>1.</strong> This sheet reads the existing activity register. It does not revise or approve a baseline.</p><p><strong>2.</strong> Blank or invalid dates and unavailable float are shown explicitly, not replaced with assumed values.</p><p><strong>3.</strong> Use the existing Task List and CPM tools to manage content. Blue / red vertical markers show the report date / contract finish when within the displayed range.</p></div>
            </div> : <div className="cpm-node-smallprint">Arrows show saved predecessor relationships, not elapsed time. Red links connect flagged activities; they do not certify a driving path. Select a card for activity details.</div>}
            <footer className="cpm-sheet-footer"><span>ProjectOS · {view === 'programme' ? 'CPM Timeline / Time Programme' : 'Activity-on-Node Network'} · Saved schedule presentation</span><span>A3 · Landscape · Enable background graphics when printing</span></footer>
          </article>
        </div>
      </div>}
    {view === 'network' && selected && <aside className="cpm-selected" aria-live="polite"><h3>{`ACTIVITY ${selected.wbsCode}`}</h3><p><strong>{selected.title}</strong></p><p>Predecessors: {dependencyLabel(selected)} · Duration: {numberText(selected.plannedDuration)} days · Total float: {numberText(selected.totalFloat)} days.</p><p>Actual start: {formatDay(selected.actualStart)} · Actual finish: {formatDay(selected.actualEnd)}</p></aside>}
  </section>
}

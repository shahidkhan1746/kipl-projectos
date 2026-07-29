import ReactECharts from 'echarts-for-react'

// Lazy-loaded so echarts (~1 MB) only downloads on pages that show a chart.
// Option builders are exported so the PDF generator can render them off-screen.

const RED = '#dc2626', BLUE = '#2563eb', GREY = '#94a3b8', GREEN = '#059669', AMBER = '#d97706'

// ── CPM activity-network option ──────────────────────────────────────────────
export function cpmOption(tasks: any[]) {
  const list = (tasks ?? []).filter(t => t.wbsCode)
  const maxEf = Math.max(1, ...list.map(t => Number(t.ef) || 0))
  const byCode: Record<string, any> = {}
  list.forEach(t => { byCode[t.wbsCode] = t })
  const laneEnd: number[] = []
  const pos: Record<string, { x: number; y: number }> = {}
  ;[...list].sort((a, b) => (Number(a.es) || 0) - (Number(b.es) || 0)).forEach(t => {
    const es = Number(t.es) || 0, ef = Number(t.ef) || 0
    let lane = laneEnd.findIndex(end => es >= end)
    if (lane === -1) { lane = laneEnd.length; laneEnd.push(ef) } else { laneEnd[lane] = ef }
    pos[t.wbsCode] = { x: (es / maxEf) * 1000, y: lane * 100 }
  })
  const nodes = list.map(t => ({
    name: t.wbsCode, x: pos[t.wbsCode].x, y: pos[t.wbsCode].y,
    symbol: 'roundRect', symbolSize: [46, 34],
    itemStyle: { color: t.isCritical ? RED : BLUE, borderColor: '#fff', borderWidth: 1.5 },
    label: { show: true, formatter: t.wbsCode, color: '#fff', fontWeight: 700, fontSize: 12 },
    value: `${t.title} · ${t.duration}d · ES ${t.es}/EF ${t.ef} · Float ${t.float}d${t.isCritical ? ' · CRITICAL' : ''}`,
  }))
  const links: any[] = []
  list.forEach(t => String(t.predecessors || '').split(',').map((s: string) => s.trim()).filter(Boolean).forEach((p: string) => {
    if (!byCode[p]) return
    const crit = t.isCritical && byCode[p].isCritical
    links.push({ source: p, target: t.wbsCode, lineStyle: { color: crit ? RED : GREY, width: crit ? 3 : 1.2, curveness: 0.08, opacity: crit ? 0.95 : 0.5 } })
  }))
  return {
    animation: false,
    tooltip: { formatter: (pm: any) => pm.dataType === 'node' ? `<b>${pm.name}</b><br/>${pm.data.value}` : '' },
    series: [{ type: 'graph', layout: 'none', roam: true, nodes, links, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 9, emphasis: { focus: 'adjacency' } }],
  }
}

// ── PERT completion-probability option ───────────────────────────────────────
export function pertOption({ mean, sigma, p68, p95 }: { mean: number; sigma: number; p68: any; p95: any }) {
  const mu = Number(mean) || 0, sd = Math.max(1, Number(sigma) || 1)
  const data: [number, number][] = []
  for (let x = mu - 4 * sd; x <= mu + 4 * sd; x += sd / 15) data.push([x, Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))])
  return {
    animation: false,
    tooltip: { trigger: 'axis', formatter: (p: any) => `${Math.round(p[0].value[0])} days` },
    grid: { left: 24, right: 24, top: 24, bottom: 44 },
    xAxis: { type: 'value', name: 'Project duration (days)', nameLocation: 'middle', nameGap: 28, min: Math.round(mu - 4 * sd), max: Math.round(mu + 4 * sd), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line', data, smooth: true, showSymbol: false, lineStyle: { color: BLUE, width: 2 }, areaStyle: { color: 'rgba(37,99,235,0.10)' },
      markArea: { silent: true, data: [
        [{ xAxis: Number(p95?.lower) || mu - 2 * sd, itemStyle: { color: 'rgba(37,99,235,0.06)' } }, { xAxis: Number(p95?.upper) || mu + 2 * sd }],
        [{ xAxis: Number(p68?.lower) || mu - sd, itemStyle: { color: 'rgba(5,150,105,0.12)' } }, { xAxis: Number(p68?.upper) || mu + sd }],
      ] },
      markLine: { silent: true, symbol: 'none', label: { formatter: 'TE ' + Math.round(mu) + 'd', color: RED, position: 'insideEndTop' }, data: [{ xAxis: mu, lineStyle: { color: RED, width: 1.5, type: 'dashed' } }] },
    }],
  }
}

// ── Gantt option (stacked-bar: transparent offset + coloured duration) ────────
export function ganttOption(tasks: any[], projectStartISO: string) {
  const start = new Date(projectStartISO || Date.now()).getTime()
  const items = (tasks ?? []).filter(t => t.startDate && t.endDate)
  const cats: string[] = [], offset: number[] = [], dur: any[] = []
  items.forEach(t => {
    const s = (new Date(t.startDate).getTime() - start) / 864e5
    const e = (new Date(t.endDate).getTime() - start) / 864e5
    cats.push(`${t.wbsCode}  ${t.title}`.slice(0, 42))
    offset.push(Math.max(0, s))
    dur.push({ value: Math.max(1, e - s), itemStyle: { color: t.isCritical ? RED : t.isMilestone ? AMBER : BLUE, borderRadius: 3 } })
  })
  const maxDay = Math.max(1, ...offset.map((o, i) => o + (dur[i].value || 0)))
  return {
    animation: false,
    grid: { left: 230, right: 24, top: 16, bottom: 40 },
    xAxis: { type: 'value', min: 0, max: maxDay, axisLabel: { formatter: (v: number) => new Date(start + v * 864e5).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) } },
    yAxis: { type: 'category', data: cats, inverse: true, axisLabel: { fontSize: 9.5, width: 210, overflow: 'truncate' } },
    series: [
      { type: 'bar', stack: 'g', silent: true, itemStyle: { color: 'transparent' }, data: offset },
      { type: 'bar', stack: 'g', barWidth: '58%', data: dur },
    ],
  }
}

const svg = { renderer: 'svg' as const }

function ScheduleGauge({ pct, completed, total, delayed }: { pct: number; completed: number; total: number; delayed: number }) {
  const option = {
    animation: false,
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '92%', center: ['50%', '58%'],
      progress: { show: true, width: 14, itemStyle: { color: pct >= 50 ? GREEN : pct > 0 ? AMBER : GREY } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#e2e8f0']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false }, anchor: { show: false },
      detail: { valueAnimation: false, formatter: (v: number) => Math.round(v) + '%', fontSize: 30, fontWeight: 800, color: '#0f172a', offsetCenter: [0, '-6%'] },
      title: { show: true, offsetCenter: [0, '28%'], fontSize: 12, color: '#94a3b8' },
      data: [{ value: pct, name: `${completed}/${total} tasks · ${delayed} delayed` }],
    }],
  }
  return <ReactECharts option={option} style={{ height: 200, width: '100%' }} opts={svg} />
}

export default function WbsChart(props: any) {
  if (props.kind === 'cpm') {
    const opt = cpmOption(props.tasks)
    const maxY = Math.max(0, ...(opt.series[0].nodes as any[]).map((n: any) => n.y))
    return <ReactECharts option={opt} style={{ height: Math.max(340, maxY + 140), width: '100%' }} opts={svg} />
  }
  if (props.kind === 'pert') return <ReactECharts option={pertOption({ mean: props.mean, sigma: props.sigma, p68: props.p68, p95: props.p95 })} style={{ height: 280, width: '100%' }} opts={svg} />
  if (props.kind === 'gauge') return <ScheduleGauge pct={props.pct} completed={props.completed} total={props.total} delayed={props.delayed} />
  return null
}

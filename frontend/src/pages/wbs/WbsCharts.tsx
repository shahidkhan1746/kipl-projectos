import ReactECharts from 'echarts-for-react'

// Lazy-loaded so echarts (~1 MB) only downloads on pages that show a chart.
// Option builders are exported so the PDF generator can render them off-screen.

const RED = '#dc2626', BLUE = '#2563eb', GREY = '#94a3b8', GREEN = '#059669', AMBER = '#d97706', NAVY = '#0f172a'

// Helper: standard normal error function approximation
function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x)
  const t = 1.0 / (1.0 + p * absX)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX)
  return sign * y
}

function normCdf(x: number, mean: number, sigma: number): number {
  if (sigma <= 0) return x >= mean ? 1 : 0
  const z = (x - mean) / sigma
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

// ── CPM Activity-On-Node (AON) Network Option ──────────────────────────────────
export function cpmOption(tasks: any[]) {
  const list = (tasks ?? []).filter(t => t.wbsCode)
  const maxEf = Math.max(1, ...list.map(t => Number(t.ef ?? t.earliestFinish) || 0))
  const byCode: Record<string, any> = {}
  list.forEach(t => { byCode[t.wbsCode] = t })

  // Chronological column placement based on Early Start, with vertical lane stacking
  const laneEnd: number[] = []
  const pos: Record<string, { x: number; y: number }> = {}
  
  const sorted = [...list].sort((a, b) => {
    const aEs = Number(a.es ?? a.earliestStart) || 0
    const bEs = Number(b.es ?? b.earliestStart) || 0
    if (aEs !== bEs) return aEs - bEs
    return String(a.wbsCode).localeCompare(String(b.wbsCode), undefined, { numeric: true })
  })

  sorted.forEach(t => {
    const es = Number(t.es ?? t.earliestStart) || 0
    const ef = Number(t.ef ?? t.earliestFinish) || 0
    let lane = laneEnd.findIndex(end => es >= end + 4)
    if (lane === -1) {
      lane = laneEnd.length
      laneEnd.push(ef)
    } else {
      laneEnd[lane] = ef
    }
    // Tiered horizontal layout with comfortable vertical separation
    pos[t.wbsCode] = {
      x: Math.round((es / maxEf) * 1100 + 40),
      y: lane * 85 + 40,
    }
  })

  const nodes = list.map(t => {
    const isCrit = !!t.isCritical
    const dur = Number(t.duration ?? t.expectedDuration ?? t.plannedDuration) || 0
    const es = Number(t.es ?? t.earliestStart) || 0
    const ef = Number(t.ef ?? t.earliestFinish) || 0
    const tf = Number(t.float ?? t.totalFloat) || 0

    return {
      name: t.wbsCode,
      x: pos[t.wbsCode]?.x ?? 40,
      y: pos[t.wbsCode]?.y ?? 40,
      symbol: 'roundRect',
      symbolSize: [94, 52],
      itemStyle: {
        color: isCrit ? '#fef2f2' : '#f8fafc',
        borderColor: isCrit ? RED : '#3b82f6',
        borderWidth: isCrit ? 2.5 : 1.5,
        shadowColor: isCrit ? 'rgba(220,38,38,0.25)' : 'rgba(59,130,246,0.15)',
        shadowBlur: isCrit ? 8 : 4,
      },
      label: {
        show: true,
        formatter: [
          `{wbs|${t.wbsCode}} {dur|${dur}d}`,
          `{title|${(t.title || '').slice(0, 14)}}`,
          `{metrics|ES:${es} EF:${ef} · TF:${tf}d}`,
        ].join('\n'),
        rich: {
          wbs: { fontWeight: 800, fontSize: 10, color: isCrit ? RED : BLUE },
          dur: { fontWeight: 700, fontSize: 9, color: '#64748b' },
          title: { fontSize: 9.5, color: NAVY, padding: [2, 0] },
          metrics: { fontSize: 8.5, color: tf === 0 ? RED : '#059669', fontWeight: 600 },
        },
      },
      value: {
        title: t.title,
        duration: dur,
        es, ef,
        ls: t.ls ?? t.latestStart ?? 0,
        lf: t.lf ?? t.latestFinish ?? 0,
        float: tf,
        isCritical: isCrit,
      },
    }
  })

  const links: any[] = []
  list.forEach(t => {
    const preds = Array.isArray(t.dependencies) && t.dependencies.length > 0
      ? t.dependencies.map((d: any) => d.code)
      : String(t.predecessors || '').split(',').map((s: string) => s.trim()).filter(Boolean)

    preds.forEach((p: string) => {
      if (!byCode[p]) return
      const critLink = t.isCritical && byCode[p].isCritical
      links.push({
        source: p,
        target: t.wbsCode,
        lineStyle: {
          color: critLink ? RED : GREY,
          width: critLink ? 2.8 : 1.2,
          curveness: 0.1,
          opacity: critLink ? 0.95 : 0.45,
        },
      })
    })
  })

  return {
    animation: false,
    tooltip: {
      formatter: (pm: any) => {
        if (pm.dataType !== 'node') return ''
        const d = pm.data.value
        return `
          <div style="font-family:sans-serif;font-size:12px;padding:4px">
            <strong style="color:${d.isCritical ? RED : BLUE}">WBS ${pm.name}: ${d.title}</strong><br/>
            <span>Duration: <b>${d.duration} days</b> (${d.isCritical ? '<span style="color:#dc2626;font-weight:700">CRITICAL PATH</span>' : 'Non-critical'})</span><br/>
            <span>Early Start: <b>Day ${d.es}</b> | Early Finish: <b>Day ${d.ef}</b></span><br/>
            <span>Late Start: <b>Day ${d.ls}</b> | Late Finish: <b>Day ${d.lf}</b></span><br/>
            <span>Total Float: <b style="color:${d.float === 0 ? RED : GREEN}">${d.float} days</b></span>
          </div>
        `
      },
    },
    series: [{
      type: 'graph',
      layout: 'none',
      roam: true,
      nodes,
      links,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 8,
      emphasis: { focus: 'adjacency' },
    }],
  }
}

// ── PERT Dual-Series Option (Bell Curve + Cumulative S-Curve) ──────────────────
export function pertOption({
  mean,
  sigma,
  p68,
  p95,
  contractTargetDays = 912,
}: {
  mean: number
  sigma: number
  p68?: any
  p95?: any
  contractTargetDays?: number
}) {
  const mu = Number(mean) || 912
  const sd = Math.max(1, Number(sigma) || 20)

  const pdfData: [number, number][] = []
  const cdfData: [number, number][] = []

  const minX = Math.round(mu - 3.8 * sd)
  const maxX = Math.round(Math.max(contractTargetDays + 15, mu + 3.8 * sd))
  const step = Math.max(1, Math.round(sd / 12))

  for (let x = minX; x <= maxX; x += step) {
    // Gaussian Probability Density Function f(x)
    const density = Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
    pdfData.push([x, +(density * 100).toFixed(4)]) // scaled as percentage for readable left axis

    // Cumulative Probability S-Curve CDF F(x) = P(X <= x)
    const cumProb = normCdf(x, mu, sd) * 100
    cdfData.push([x, +cumProb.toFixed(2)])
  }

  // Contract Target Day Confidence
  const contractProbPct = +(normCdf(contractTargetDays, mu, sd) * 100).toFixed(1)

  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const xVal = Math.round(params[0]?.value[0] ?? 0)
        const cumProb = normCdf(xVal, mu, sd) * 100
        return `
          <div style="font-family:sans-serif;font-size:12px;padding:4px">
            <strong>Duration: ${xVal} days</strong><br/>
            <span style="color:${GREEN};font-weight:700">Cumulative Confidence: ${cumProb.toFixed(1)}%</span><br/>
            <span style="color:#64748b">Relative Likelihood: ${params[0]?.value[1]}%</span><br/>
            ${xVal === contractTargetDays ? `<span style="color:${AMBER};font-weight:700">Contract End Milestone (Clause 16.3)</span>` : ''}
          </div>
        `
      },
    },
    legend: {
      data: ['Probability Density (Bell Curve)', 'Cumulative Completion Probability (S-Curve)'],
      bottom: 6,
      textStyle: { fontSize: 11, color: '#475569' },
    },
    grid: { left: 45, right: 55, top: 32, bottom: 50 },
    xAxis: {
      type: 'value',
      name: 'Project Duration (Calendar Days)',
      nameLocation: 'middle',
      nameGap: 30,
      min: minX,
      max: maxX,
      axisLabel: { fontSize: 10.5, color: '#475569' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Density (%)',
        show: false,
      },
      {
        type: 'value',
        name: 'Confidence (%)',
        min: 0,
        max: 100,
        position: 'right',
        axisLabel: { formatter: '{value}%', fontSize: 10, color: '#475569' },
        splitLine: { lineStyle: { color: '#f8fafc' } },
      },
    ],
    series: [
      {
        name: 'Probability Density (Bell Curve)',
        type: 'line',
        yAxisIndex: 0,
        data: pdfData,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: BLUE, width: 2 },
        areaStyle: { color: 'rgba(37,99,235,0.08)' },
        markArea: {
          silent: true,
          data: [
            [
              { xAxis: Number(p95?.lower) || Math.round(mu - 2 * sd), itemStyle: { color: 'rgba(37,99,235,0.05)' } },
              { xAxis: Number(p95?.upper) || Math.round(mu + 2 * sd) },
            ],
            [
              { xAxis: Number(p68?.lower) || Math.round(mu - sd), itemStyle: { color: 'rgba(5,150,105,0.10)' } },
              { xAxis: Number(p68?.upper) || Math.round(mu + sd) },
            ],
          ],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              xAxis: Math.round(mu),
              lineStyle: { color: RED, width: 1.8, type: 'dashed' },
              label: { formatter: `TE: ${Math.round(mu)}d (50%)`, color: RED, position: 'insideEndTop' },
            },
            {
              xAxis: contractTargetDays,
              lineStyle: { color: AMBER, width: 2, type: 'solid' },
              label: { formatter: `Contract End (${contractTargetDays}d): ${contractProbPct}%`, color: AMBER, position: 'insideEndBottom' },
            },
          ],
        },
      },
      {
        name: 'Cumulative Completion Probability (S-Curve)',
        type: 'line',
        yAxisIndex: 1,
        data: cdfData,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: GREEN, width: 2.5 },
      },
    ],
  }
}

// ── Gantt Chart Option (Stacked Bar with Hierarchy & Milestones) ───────────────
export function ganttOption(tasks: any[], projectStartISO: string) {
  const start = new Date(projectStartISO || '2025-11-07').getTime()
  
  // Fix data mapping: accept plannedStart/plannedEnd as primary with fallback to startDate/endDate
  const items = (tasks ?? []).filter(t => (t.plannedStart || t.startDate) && (t.plannedEnd || t.endDate))
  
  const cats: string[] = []
  const offset: number[] = []
  const dur: any[] = []

  items.forEach(t => {
    const sStr = t.plannedStart || t.startDate
    const eStr = t.plannedEnd || t.endDate
    const s = Math.max(0, (new Date(sStr).getTime() - start) / 864e5)
    const e = Math.max(s + 1, (new Date(eStr).getTime() - start) / 864e5)
    const isMs = !!t.isMilestone
    const isCrit = !!t.isCritical && !isMs
    const prog = Number(t.progressPct) || 0

    cats.push(`${t.wbsCode}  ${t.title}`.slice(0, 44))
    offset.push(s)

    const barColor = isCrit
      ? RED
      : isMs
      ? AMBER
      : prog === 100
      ? GREEN
      : BLUE

    dur.push({
      value: isMs ? 3 : Math.max(1, e - s),
      itemStyle: {
        color: barColor,
        borderRadius: isMs ? 2 : 4,
        borderColor: isCrit ? '#991b1b' : 'transparent',
        borderWidth: isCrit ? 1 : 0,
      },
      task: t,
    })
  })

  const maxDay = Math.max(912, ...offset.map((o, i) => o + (dur[i]?.value || 0)))

  return {
    animation: false,
    grid: { left: 240, right: 30, top: 20, bottom: 40 },
    tooltip: {
      trigger: 'item',
      formatter: (pm: any) => {
        if (!pm.data?.task) return ''
        const t = pm.data.task
        const sStr = t.plannedStart || t.startDate
        const eStr = t.plannedEnd || t.endDate
        return `
          <div style="font-family:sans-serif;font-size:12px;padding:4px">
            <strong style="color:${t.isCritical ? RED : BLUE}">${t.wbsCode}: ${t.title}</strong><br/>
            <span>Start: <b>${sStr}</b> → End: <b>${eStr}</b></span><br/>
            <span>Duration: <b>${t.plannedDuration ?? t.duration ?? Math.round(pm.data.value)} days</b></span><br/>
            <span>Progress: <b>${t.progressPct ?? 0}%</b> | Status: <b>${t.status ?? 'Not Started'}</b></span><br/>
            ${t.isCritical ? '<span style="color:#dc2626;font-weight:700">CRITICAL PATH (Clause 17)</span>' : ''}
            ${t.isMilestone ? '<span style="color:#d97706;font-weight:700">KEY CONTRACT MILESTONE</span>' : ''}
          </div>
        `
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: maxDay,
      axisLabel: {
        formatter: (v: number) => new Date(start + v * 864e5).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        fontSize: 10,
        color: '#475569',
      },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: cats,
      inverse: true,
      axisLabel: { fontSize: 9.5, width: 220, overflow: 'truncate', color: '#1e293b' },
    },
    series: [
      {
        type: 'bar',
        stack: 'g',
        silent: true,
        itemStyle: { color: 'transparent' },
        data: offset,
      },
      {
        type: 'bar',
        stack: 'g',
        barWidth: '60%',
        data: dur,
      },
    ],
  }
}

const svg = { renderer: 'svg' as const }

function ScheduleGauge({ pct, completed, total, delayed }: { pct: number; completed: number; total: number; delayed: number }) {
  const option = {
    animation: false,
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      radius: '92%',
      center: ['50%', '58%'],
      progress: { show: true, width: 14, itemStyle: { color: pct >= 50 ? GREEN : pct > 0 ? AMBER : GREY } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#e2e8f0']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      detail: {
        valueAnimation: false,
        formatter: (v: number) => Math.round(v) + '%',
        fontSize: 30,
        fontWeight: 800,
        color: '#0f172a',
        offsetCenter: [0, '-6%'],
      },
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
    return <ReactECharts option={opt} style={{ height: Math.max(380, maxY + 140), width: '100%' }} opts={svg} />
  }

  if (props.kind === 'pert') {
    const opt = pertOption({
      mean: props.mean,
      sigma: props.sigma,
      p68: props.p68,
      p95: props.p95,
      contractTargetDays: props.contractTargetDays ?? 912,
    })
    return <ReactECharts option={opt} style={{ height: 320, width: '100%' }} opts={svg} />
  }

  if (props.kind === 'gantt') {
    const opt = ganttOption(props.tasks, props.projectStart)
    const rowCount = (props.tasks ?? []).length
    return <ReactECharts option={opt} style={{ height: Math.max(400, rowCount * 28 + 80), width: '100%' }} opts={svg} />
  }

  if (props.kind === 'gauge') {
    return <ScheduleGauge pct={props.pct} completed={props.completed} total={props.total} delayed={props.delayed} />
  }

  return null
}

import ReactECharts from 'echarts-for-react'

// Lazy-loaded so echarts (~1 MB) only downloads on pages that show a chart.
// The PERT option builder is exported so the PDF generator can render it off-screen.

const RED = '#dc2626', BLUE = '#2563eb', GREY = '#94a3b8', GREEN = '#059669', AMBER = '#d97706', NAVY = '#0f172a'
// Remainder / not-started slices. Deliberately neutral, and dark enough to
// clear 3:1 against a white card — #94a3b8 does not.
export const SLATE = '#64748b'

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

// ── PERT Dual-Series Option (Bell Curve + Cumulative S-Curve) ──────────────────
export function pertOption({
  mean,
  sigma,
  p68,
  p95,
  contractTargetDays,
}: {
  mean: number
  sigma: number
  p68?: any
  p95?: any
  contractTargetDays: number
}) {
  // Callers only draw this with a real mean and a positive spread.
  const mu = Number(mean)
  const sd = Math.max(1, Number(sigma))

  const pdfData: [number, number][] = []
  const cdfData: [number, number][] = []

  const minX = Math.round(Math.min(contractTargetDays - 15, mu - 3.8 * sd))
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
    grid: { left: 45, right: 55, top: 32, bottom: 70 },
    xAxis: {
      type: 'value',
      name: 'Project Duration (Calendar Days)',
      nameLocation: 'middle',
      nameGap: 26,
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

// ── Progress S-curve ──────────────────────────────────────────────────────────
export interface SCurveData {
  dataDate: string
  contractCompletion: string
  forecastFinish: string | null
  baseline: { name: string } | null
  points: Array<{ date: string; baselinePct: number | null; forecastPct: number | null; latePct: number | null }>
  actual: Array<{ date: string; pct: number; source: string }>
  clause16: Array<{ stage: string; date: string; targetProgressPct: number }>
}

/**
 * Cumulative progress on a date axis: the accepted baseline, today's forecast,
 * the latest permissible curve and the progress actually recorded, with the
 * Clause 16.3 stages pinned at their dates.
 */
export function sCurveOption(s: SCurveData) {
  const ts = (d: string) => Date.parse(d + 'T00:00:00Z')
  const series = (key: 'baselinePct' | 'forecastPct' | 'latePct') =>
    s.points.filter(p => p[key] !== null).map(p => [ts(p.date), p[key]])
  const line = (name: string, data: any[], color: string, type: 'solid' | 'dashed' | 'dotted', width = 2.4, area = false) => ({
    name, type: 'line', data, smooth: 0.25, showSymbol: false,
    lineStyle: { color, width, type }, itemStyle: { color },
    ...(area ? { areaStyle: { color: 'rgba(37,99,235,0.06)' } } : {}),
  })
  const fmt = (v: number) => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' })
  return {
    animation: false,
    grid: { left: 52, right: 28, top: 44, bottom: 64 },
    legend: { bottom: 6, textStyle: { fontSize: 11, color: '#475569' } },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: any) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`),
      axisPointer: { type: 'line', label: { formatter: (p: any) => fmt(p.value) } },
    },
    xAxis: { type: 'time', axisLabel: { fontSize: 10, color: '#64748b', formatter: (v: number) => new Date(v).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, name: 'Cumulative %', nameTextStyle: { color: '#64748b', fontSize: 11 }, axisLabel: { formatter: '{value}%', fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [
      ...(s.baseline ? [line(`Planned — ${s.baseline.name}`, series('baselinePct'), '#2563eb', 'solid', 2.6, true)] : []),
      line('Forecast', series('forecastPct'), '#8b5cf6', 'dotted', 2.4),
      line('Latest permissible (finish on the contract date)', series('latePct'), '#f59e0b', 'dashed', 2),
      {
        name: 'Actual (recorded)', type: 'line', data: s.actual.map(a => [ts(a.date), a.pct]),
        symbol: 'circle', symbolSize: 9, lineStyle: { color: '#059669', width: 2.4 }, itemStyle: { color: '#059669' },
        markLine: {
          symbol: 'none', silent: true, label: { fontSize: 10, fontWeight: 700, position: 'insideEndTop' },
          data: [
            { xAxis: ts(s.dataDate), lineStyle: { color: '#2563eb', type: 'solid', width: 1.2 }, label: { formatter: 'Data date', color: '#2563eb' } },
            { xAxis: ts(s.contractCompletion), lineStyle: { color: '#1a2540', type: 'dashed', width: 1.4 }, label: { formatter: 'Contract', color: '#1a2540' } },
            ...(s.forecastFinish && s.forecastFinish !== s.contractCompletion
              ? [{ xAxis: ts(s.forecastFinish), lineStyle: { color: '#dc2626', type: 'dashed', width: 1.4 }, label: { formatter: 'Forecast', color: '#dc2626' } }]
              : []),
          ],
        },
        markPoint: {
          symbol: 'pin', symbolSize: 34, itemStyle: { color: '#dc2626' }, label: { fontSize: 9, fontWeight: 700, color: '#fff' },
          data: s.clause16.map(c => ({ coord: [ts(c.date), c.targetProgressPct], value: `${c.targetProgressPct}%`, name: c.stage })),
        },
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

/**
 * A ring showing how one whole divides, with its headline figure in the middle.
 *
 * Deliberately has no ECharts legend: the caller renders the legend as HTML
 * text with real counts beside it. That is what makes the slices readable to
 * a red-green colour-blind reader, whose worst adjacent pair here separates by
 * only ~6.6 dE — inside the band where direct labels are required, not optional.
 */
function Donut({ slices, centre, caption }: {
  slices: { name: string; value: number; color: string }[]
  centre: string
  caption?: string
}) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  const option = {
    animation: false,
    // No `tooltip`: every figure is already printed in the HTML legend, so a
    // hover-only reveal would only repeat it, and never reaches touch users.
    series: [{
      type: 'pie',
      radius: ['64%', '88%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      labelLine: { show: false },
      // The gap is the second encoding, alongside the legend text.
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      silent: true,
      data: total > 0
        ? slices.map(s => ({ value: s.value, name: s.name, itemStyle: { color: s.color } }))
        : [{ value: 1, name: 'No data', itemStyle: { color: '#e2e8f0' } }],
    }],
    graphic: [
      {
        type: 'text', left: 'center', top: caption ? '40%' : '46%',
        style: { text: centre, fontSize: 22, fontWeight: 800, fill: NAVY, textAlign: 'center' },
      },
      ...(caption ? [{
        type: 'text' as const, left: 'center', top: '56%',
        style: { text: caption, fontSize: 10, fill: SLATE, textAlign: 'center' as const },
      }] : []),
    ],
  }
  return <ReactECharts option={option} style={{ height: 150, width: '100%' }} opts={svg} />
}

export default function WbsChart(props: any) {
  if (props.kind === 'scurve') {
    return <ReactECharts option={sCurveOption(props.data)} style={{ height: 380, width: '100%' }} opts={svg} />
  }

  if (props.kind === 'pert') {
    const opt = pertOption({
      mean: props.mean,
      sigma: props.sigma,
      p68: props.p68,
      p95: props.p95,
      contractTargetDays: props.contractTargetDays,
    })
    return <ReactECharts option={opt} style={{ height: 320, width: '100%' }} opts={svg} />
  }

  if (props.kind === 'donut') {
    return <Donut slices={props.slices} centre={props.centre} caption={props.caption} />
  }

  if (props.kind === 'gauge') {
    return <ScheduleGauge pct={props.pct} completed={props.completed} total={props.total} delayed={props.delayed} />
  }

  return null
}

import ReactECharts from 'echarts-for-react'
import { graphic } from 'echarts'
import type { EChartsOption } from 'echarts'
import { coverLevel, GAUGE_DAYS, shortDate } from './dieselRegister'
import type { CoverLevel, DayPoint } from './dieselRegister'
import type { PumpLine } from '@/api/fuel.api'

/**
 * Charts for the diesel register. Both sit in .echart-unzoom so pointer
 * positions stay right under the laptop scaling, and size themselves with
 * --ui-zoom so they keep their proportion to the cards around them.
 */

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 })

/**
 * A fuel-gauge dial. The needle is days of diesel left at the recent rate of
 * issue (red under 2, amber under 4); the litres in stock sit in the middle.
 * With no recent issues there is no rate, so the needle rests at the end and
 * the dial says so.
 */
const PROGRESS: Record<CoverLevel, { offset: number; color: string }[]> = {
  low: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f97316' }],
  watch: [{ offset: 0, color: '#f97316' }, { offset: 1, color: '#facc15' }],
  good: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#2dd4bf' }],
  unknown: [{ offset: 0, color: '#64748b' }, { offset: 1, color: '#94a3b8' }],
}
const GLOW: Record<CoverLevel, string> = { low: 'rgba(239,68,68,0.75)', watch: 'rgba(250,204,21,0.6)', good: 'rgba(45,212,191,0.65)', unknown: 'rgba(148,163,184,0.4)' }

export function StockGauge({ litres, days, dailyAverage }: { litres: number; days: number | null; dailyAverage: number | null }) {
  const value = days === null ? GAUGE_DAYS : Math.max(0, Math.min(GAUGE_DAYS, days))
  const level = coverLevel(days)
  const option: EChartsOption = {
    animationDuration: 1400,
    animationEasing: 'cubicOut',
    series: [
      {
        // Soft glow track behind the dial.
        type: 'gauge', startAngle: 215, endAngle: -35, min: 0, max: GAUGE_DAYS, radius: '96%', z: 1,
        axisLine: { lineStyle: { width: 26, color: [[1, 'rgba(255,255,255,0.06)']] } },
        splitLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, pointer: { show: false }, detail: { show: false },
      },
      {
        type: 'gauge', startAngle: 215, endAngle: -35, min: 0, max: GAUGE_DAYS, splitNumber: 5, radius: '88%', z: 2,
        // The zones, dimmed: red under 2 days, amber under 4, green beyond.
        axisLine: {
          roundCap: true,
          lineStyle: { width: 14, color: [[0.2, 'rgba(239,68,68,0.32)'], [0.4, 'rgba(245,158,11,0.32)'], [1, 'rgba(16,185,129,0.28)']] },
        },
        // The bright part up to the needle, in the colour of the zone it is in.
        progress: {
          show: true, roundCap: true, width: 14,
          itemStyle: { color: new graphic.LinearGradient(0, 0, 1, 0, PROGRESS[level]), shadowBlur: 16, shadowColor: GLOW[level] },
        },
        axisTick: { distance: -24, length: 5, splitNumber: 4, lineStyle: { color: 'rgba(255,255,255,0.35)', width: 1 } },
        splitLine: { distance: -26, length: 12, lineStyle: { color: 'rgba(255,255,255,0.85)', width: 2 } },
        axisLabel: { distance: 34, color: 'rgba(226,232,240,0.75)', fontSize: 10.5, fontWeight: 700, formatter: (v: number) => (v === GAUGE_DAYS ? `${v}+ d` : `${v} d`) },
        pointer: {
          icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z',
          length: '62%', width: 7, offsetCenter: [0, '6%'],
          itemStyle: { color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#7dd3fc' }]), shadowBlur: 12, shadowColor: 'rgba(125,211,252,0.9)' },
        },
        anchor: { show: true, size: 20, showAbove: true, itemStyle: { color: '#0f172a', borderColor: '#7dd3fc', borderWidth: 5, shadowBlur: 14, shadowColor: 'rgba(125,211,252,0.8)' } },
        title: { show: false },
        detail: {
          valueAnimation: false,
          offsetCenter: [0, '58%'],
          formatter: () => `{l|${fmt(litres)}}{u| L}\n{s|${days === null ? 'no recent issues' : `${fmt(days)} days left`}}`,
          rich: {
            l: { fontSize: 34, fontWeight: 800, color: '#ffffff', textShadowColor: 'rgba(56,189,248,0.6)', textShadowBlur: 14 },
            u: { fontSize: 16, fontWeight: 700, color: 'rgba(226,232,240,0.8)', padding: [10, 0, 0, 2] },
            s: { fontSize: 12, fontWeight: 600, color: 'rgba(186,230,253,0.85)', padding: [6, 0, 0, 0] },
          },
        },
        data: [{ value, name: 'Days of diesel left' }],
      },
    ],
  }
  return (
    <div className="echart-unzoom" role="img" aria-label={`${fmt(litres)} litres of diesel in stock${days === null ? '' : `, about ${fmt(days)} days at ${fmt(dailyAverage ?? 0)} litres a day`}`}>
      <ReactECharts option={option} style={{ height: 'calc(270px * var(--ui-zoom))', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  )
}

/** End-of-day stock as a glowing area, with each day's purchases and issues as bars. */
export function StockTrend({ days }: { days: DayPoint[] }) {
  const option: EChartsOption = {
    animationDuration: 900,
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    legend: { top: 0, right: 8, itemWidth: 12, itemHeight: 8, textStyle: { color: '#64748b', fontSize: 11 }, data: ['In stock', 'Purchased', 'Issued'] },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 0, padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      extraCssText: 'backdrop-filter: blur(8px); border-radius: 12px; box-shadow: 0 12px 30px rgba(2,6,23,.35);',
      valueFormatter: v => `${fmt(Number(v))} L`,
    },
    xAxis: {
      type: 'category', data: days.map(d => shortDate(d.date)), boundaryGap: true,
      axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '{value} L' }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } } },
    series: [
      {
        name: 'Purchased', type: 'bar', barMaxWidth: 14, data: days.map(d => d.purchased || null),
        itemStyle: { borderRadius: [6, 6, 0, 0], color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }]) },
      },
      {
        name: 'Issued', type: 'bar', barMaxWidth: 14, data: days.map(d => d.issued || null),
        itemStyle: { borderRadius: [6, 6, 0, 0], color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#f97316' }]) },
      },
      {
        name: 'In stock', type: 'line', smooth: false, symbol: 'circle', symbolSize: 7, showSymbol: days.length <= 16, data: days.map(d => d.balance),
        lineStyle: { width: 3, color: new graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#06b6d4' }]), shadowBlur: 12, shadowColor: 'rgba(37,99,235,0.35)' },
        itemStyle: { color: '#2563eb', borderColor: '#fff', borderWidth: 2 },
        areaStyle: { color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(37,99,235,0.28)' }, { offset: 1, color: 'rgba(6,182,212,0.02)' }]) },
        z: 3,
      },
    ],
  }
  return (
    <div className="echart-unzoom">
      <ReactECharts option={option} style={{ height: 'calc(260px * var(--ui-zoom))', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  )
}

/**
 * The advance after every payment and delivery, as steps. Green above zero,
 * red where more had been taken than paid and the pump was giving credit.
 */
export function AdvanceTrend({ lines }: { lines: PumpLine[] }) {
  const rupee = (v: number) => `${v < 0 ? '−' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`
  const compact = (v: number) => (v === 0 ? '₹0' : `${v < 0 ? '−' : ''}₹${(Math.abs(v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`)
  // Green above zero, red below: a gradient that changes colour exactly where
  // the line crosses zero. (ECharts' visualMap crashes on a stepped line.)
  const values = lines.map(l => l.balance)
  const max = Math.max(0, ...values), min = Math.min(0, ...values)
  const zero = max === min ? 1 : max / (max - min)
  const colour = (alpha: number) => new graphic.LinearGradient(0, 0, 0, 1, zero >= 1
    ? [{ offset: 0, color: `rgba(16,185,129,${alpha})` }, { offset: 1, color: `rgba(16,185,129,${alpha})` }]
    : zero <= 0
      ? [{ offset: 0, color: `rgba(239,68,68,${alpha})` }, { offset: 1, color: `rgba(239,68,68,${alpha})` }]
      : [{ offset: 0, color: `rgba(16,185,129,${alpha})` }, { offset: zero, color: `rgba(16,185,129,${alpha})` }, { offset: zero, color: `rgba(239,68,68,${alpha})` }, { offset: 1, color: `rgba(239,68,68,${alpha})` }])
  const option: EChartsOption = {
    animationDuration: 900,
    grid: { left: 46, right: 12, top: 10, bottom: 22 },
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 0, padding: [8, 12], textStyle: { color: '#e2e8f0', fontSize: 12 },
      extraCssText: 'backdrop-filter: blur(8px); border-radius: 12px; box-shadow: 0 12px 30px rgba(2,6,23,.35);',
      formatter: (ps: unknown) => {
        const l = lines[(ps as { dataIndex: number }[])[0].dataIndex]
        const what = l.kind === 'payment' ? `Paid ${rupee(l.amount)}` : `Took ${l.litres ?? ''} L, ${rupee(l.amount)}`
        return `${shortDate(l.date)} · ${what}<br/><b>${rupee(l.balance)}</b> left`
      },
    },
    xAxis: { type: 'category', data: lines.map(l => shortDate(l.date)), boundaryGap: false, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10, hideOverlap: true } },
    yAxis: { type: 'value', splitNumber: 3, axisLabel: { color: '#94a3b8', fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } } },
    series: [{
      type: 'line', step: 'end', symbol: 'circle', symbolSize: 5, data: values,
      itemStyle: { color: (p: { value: unknown }) => (Number(p.value) < 0 ? '#ef4444' : '#10b981') },
      lineStyle: { width: 2.5, color: colour(1), shadowBlur: 8, shadowColor: 'rgba(16,185,129,0.3)' },
      areaStyle: { color: colour(0.16) },
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] },
    }],
  }
  return (
    <div className="echart-unzoom" role="img" aria-label={`Advance left after each payment and delivery, now ${rupee(lines[lines.length - 1]?.balance ?? 0)}`}>
      <ReactECharts option={option} style={{ height: 'calc(118px * var(--ui-zoom))', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  )
}

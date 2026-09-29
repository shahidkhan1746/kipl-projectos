import { describe, it, expect } from 'vitest'
import {
  compareCodes, orderRows, timeScale, chartSpan, networkEdges, networkLayout, describeVariance, daysBetween,
  rowFromTask, rolledUpProgress, clause16Checkpoints,
  type CpmRow,
} from './cpmLayout'

const R = (wbsCode: string, extra: Partial<CpmRow> = {}): CpmRow =>
  ({ wbsCode, title: `Activity ${wbsCode}`, duration: 10, dependencies: [], ...extra })
const FS = (code: string) => ({ code, type: 'FS' as const, lag: 0 })

describe('compareCodes', () => {
  it('orders WBS codes the way a planner reads them', () => {
    const codes = ['10', '2.10', '2', 'M1', '0.2', '2.2', '1', 'CC', '0.10']
    expect([...codes].sort(compareCodes)).toEqual(['0.2', '0.10', '1', '2', '2.2', '2.10', '10', 'CC', 'M1'])
  })
})

describe('orderRows', () => {
  it('puts each package directly above its own activities', () => {
    const rows = [R('1'), R('2'), R('3'), R('2.2', { parentId: '2' }), R('2.1', { parentId: '2' }), R('3.1', { parentId: '3' })]
    const out = orderRows(rows)
    expect(out.map(r => r.wbsCode)).toEqual(['1', '2', '2.1', '2.2', '3', '3.1'])
    expect(out.map(r => r.depth)).toEqual([0, 0, 1, 1, 0, 1])
  })

  it('accepts a parent link written as an id', () => {
    const rows = [R('2', { id: 'uuid-2' }), R('2.1', { parentId: 'uuid-2' })]
    expect(orderRows(rows).map(r => r.depth)).toEqual([0, 1])
  })
})

describe('timeScale', () => {
  it('maps dates linearly and labels the years', () => {
    const s = timeScale('2026-01-01', '2027-01-01', 365)
    expect(s.x('2026-01-01')).toBe(0)
    expect(s.x('2027-01-01')).toBe(365)
    expect(Math.round(s.x('2026-07-02'))).toBe(182)
    expect(s.ticks.filter(t => t.major).map(t => t.label)).toEqual(['2027'])
  })

  it('thins month ticks when there is no room for them', () => {
    const wide = timeScale('2026-01-01', '2028-01-01', 2000)
    const narrow = timeScale('2026-01-01', '2028-01-01', 300)
    expect(narrow.ticks.length).toBeLessThan(wide.ticks.length)
  })
})

describe('chartSpan', () => {
  it('covers forecast and planned dates, plus the extra markers', () => {
    const span = chartSpan([R('A', { plannedStart: '2026-01-10', forecastFinish: '2026-12-31' })], ['2028-05-07'])
    expect(span.from < '2026-01-10').toBe(true)
    expect(span.to > '2028-05-07').toBe(true)
  })
})

describe('networkEdges', () => {
  it('expands a link through a WBS summary onto every activity inside it', () => {
    const rows = [R('1'), R('2'), R('2.1', { parentId: '2' }), R('2.2', { parentId: '2' }), R('7', { dependencies: [FS('2')] }), R('2.1x', { dependencies: [] })]
    rows[2].dependencies = [FS('1')]
    const edges = networkEdges(rows)
    expect(edges.filter(e => e.to === '7').map(e => e.from).sort()).toEqual(['2.1', '2.2'])
  })

  it('marks a link critical only when both ends are', () => {
    const rows = [R('A', { isCritical: true }), R('B', { isCritical: true, dependencies: [FS('A')] }), R('C', { dependencies: [FS('A')] })]
    const e = networkEdges(rows)
    expect(e.find(x => x.to === 'B')!.critical).toBe(true)
    expect(e.find(x => x.to === 'C')!.critical).toBe(false)
  })
})

describe('networkLayout', () => {
  const net = () => [
    R('A', { isCritical: true }),
    R('B', { dependencies: [FS('A')] }),
    R('C', { isCritical: true, dependencies: [FS('A')] }),
    R('D', { isCritical: true, dependencies: [FS('B'), FS('C')] }),
  ]

  it('never draws an arrow backwards', () => {
    const { nodes, edges } = networkLayout(net())
    const col = new Map(nodes.map(n => [n.code, n.col]))
    for (const e of edges) expect(col.get(e.to)!).toBeGreaterThan(col.get(e.from)!)
  })

  it('puts the critical path on the top row as one straight spine', () => {
    const { nodes } = networkLayout(net())
    const row = new Map(nodes.map(n => [n.code, n.row]))
    expect([row.get('A'), row.get('C'), row.get('D')]).toEqual([0, 0, 0])
    expect(row.get('B')).toBe(1)
  })

  it('leaves WBS summaries out of the network', () => {
    const rows = [R('2', { isSummary: true }), R('2.1', { parentId: '2' })]
    expect(networkLayout(rows).nodes.map(n => n.code)).toEqual(['2.1'])
  })

  it('survives a loop without hanging', () => {
    const rows = [R('A', { dependencies: [FS('B')] }), R('B', { dependencies: [FS('A')] })]
    expect(networkLayout(rows).nodes).toHaveLength(2)
  })
})

describe('describeVariance', () => {
  it('says late, early or on time in words', () => {
    expect(describeVariance(353)).toEqual({ text: '353 days late', tone: 'late' })
    expect(describeVariance(-1)).toEqual({ text: '1 day to spare', tone: 'early' })
    expect(describeVariance(0).tone).toBe('even')
    expect(describeVariance(null).tone).toBe('unknown')
  })
})

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2028-03-27', '2028-05-07')).toBe(41)
  })
})

describe('rowFromTask', () => {
  it('reads the live forecast and the scheduler status, not the stored status', () => {
    const r = rowFromTask({ wbsCode: '2.1', title: 'Sewer', plannedDuration: 90, status: 'completed', scheduleStatus: 'in_progress', totalFloat: -12, earliestStart: 4, forecastStart: '2026-05-20' })
    expect(r).toMatchObject({ duration: 90, status: 'in_progress', float: -12, es: 4, forecastStart: '2026-05-20', scope: 'contract' })
  })
})

describe('rolledUpProgress', () => {
  it('weights a package by the duration of its activities and ignores milestones', () => {
    const rows = [
      R('2', { isSummary: true, progressPct: 0 }),
      R('2.1', { parentId: '2', duration: 30, progressPct: 100 }),
      R('2.2', { parentId: '2', duration: 90, progressPct: 0 }),
      R('M2', { parentId: '2', duration: 0, isMilestone: true, progressPct: 0 }),
    ]
    expect(rolledUpProgress(rows).get('2')).toBe(25)
  })
})

describe('clause16Checkpoints', () => {
  it('puts the quarter stages on the same days the backend counts', () => {
    // 912 calendar days from 07-Nov-2025 to 07-May-2028: stages at day 228, 456 and 684.
    const c = clause16Checkpoints('2025-11-07', '2028-05-07')
    expect(c.map(x => x.date)).toEqual(['2026-06-23', '2027-02-06', '2027-09-22'])
    expect(c[0].label).toContain('12.5%')
  })
})

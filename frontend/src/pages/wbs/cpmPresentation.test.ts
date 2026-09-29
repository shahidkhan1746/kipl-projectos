import { describe, expect, it } from 'vitest'
import {
  buildTimeline, dependencyLabel, formatDay, getDependencies, layoutNetwork,
  NODE_HEIGHT, NODE_WIDTH, parseDay, taskTone, type PresentationTask,
} from './cpmPresentation'

const task = (wbsCode: string, extra: Partial<PresentationTask> = {}): PresentationTask => ({
  id: `task-${wbsCode}`, wbsCode, title: `Activity ${wbsCode}`, ...extra,
})

describe('saved calendar dates', () => {
  it('retains a saved calendar day across timezone offsets and formats in UTC', () => {
    const expected = Date.UTC(2026, 8, 28)
    expect(parseDay('2026-09-28')).toBe(expected)
    expect(parseDay('2026-09-28T00:00:00+05:30')).toBe(expected)
    expect(parseDay('2026-09-28T23:00:00-07:00')).toBe(expected)
    expect(formatDay('2026-09-28T00:00:00+05:30')).toBe('28-Sep-2026')
  })

  it('rejects missing, malformed, and impossible dates without rollover', () => {
    for (const value of [undefined, null, '', '28/09/2026', '2026-2-03', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-09-28Tgarbage']) {
      expect(parseDay(value)).toBeNull()
      expect(formatDay(value)).toBe('—')
    }
    expect(formatDay('2024-02-29')).toBe('29-Feb-2024')
    expect(formatDay('0099-01-02')).toBe('02-Jan-0099')
  })
})

describe('saved activity presentation', () => {
  it('never classifies absent or zero float as critical or guesses status from titles', () => {
    for (const totalFloat of [undefined, null, '', 0, '0', -1]) {
      expect(taskTone(task('1', { totalFloat }))).toBe('planned')
    }
    expect(taskTone(task('1', { title: 'Critical hold completed', progressPct: 100 }))).toBe('planned')
    expect(taskTone(task('1', { isCritical: true }))).toBe('critical')
    expect(taskTone(task('1', { status: 'completed', isCritical: true }))).toBe('completed')
    expect(taskTone(task('1', { status: 'on_hold' }))).toBe('hold')
    expect(taskTone(task('1', { status: 'in_progress' }))).toBe('progress')
  })

  it('keeps structured dependency relationship and lead/lag values', () => {
    const item = task('4', { dependencies: [{ code: '1', type: 'SS', lag: 3 }, { code: '2', type: 'FF', lag: -2 }], predecessors: 'ignored' })
    expect(getDependencies(item)).toEqual([{ code: '1', type: 'SS', lag: 3 }, { code: '2', type: 'FF', lag: -2 }])
    expect(dependencyLabel(item)).toBe('1 (SS+3d), 2 (FF-2d)')
  })

  it('reads plain and suffixed legacy dependency codes without losing their type', () => {
    const item = task('5', { dependencies: [], predecessors: '1(SS+3), 2.1 (FF - 2d); 3\n4(SF), 6(FS+0.5d)' })
    expect(getDependencies(item)).toEqual([
      { code: '1', type: 'SS', lag: 3 }, { code: '2.1', type: 'FF', lag: -2 },
      { code: '3', type: 'FS', lag: 0 }, { code: '4', type: 'SF', lag: 0 },
      { code: '6', type: 'FS', lag: 0.5 },
    ])
    expect(dependencyLabel(task('1'))).toBe('—')
  })
})

describe('calendar timeline', () => {
  it('includes all saved dates, the contract, and the entire final month', () => {
    const result = buildTimeline([
      task('1', { plannedStart: '2026-01-15', plannedEnd: '2026-02-28', actualStart: '2025-11-30', actualEnd: '2026-04-02' }),
    ], '2025-12-12', '2026-03-04')
    expect(result.start).toBe(Date.UTC(2025, 10, 1))
    expect(result.end).toBe(Date.UTC(2026, 4, 1))
    expect(result.months.map(month => month.key)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'])
    expect(result.years).toEqual([
      { year: 2025, start: Date.UTC(2025, 10, 1), end: Date.UTC(2026, 0, 1) },
      { year: 2026, start: Date.UTC(2026, 0, 1), end: Date.UTC(2026, 4, 1) },
    ])
    expect(result.truncated).toBe(false)
  })

  it('does not invent a project period when no valid dates exist', () => {
    expect(buildTimeline([])).toEqual({ start: 0, end: 0, months: [], years: [], truncated: false })
    expect(buildTimeline([task('1', { plannedStart: 'bad', plannedEnd: '2026-02-31' })]).months).toEqual([])
  })

  it('bounds an extreme date range and exposes that limit to the view', () => {
    const result = buildTimeline([], '0001-01-01', '9999-12-31')
    expect(result.months).toHaveLength(1200)
    expect(result.truncated).toBe(true)
    expect(result.end).toBe(result.months[1199].end)
  })
})

function assertNodesVisible(items: PresentationTask[]) {
  const result = layoutNetwork(items)
  expect(result.nodes).toHaveLength(items.length)
  expect(new Set(result.nodes.map(node => node.id)).size).toBe(items.length)
  for (const node of result.nodes) {
    expect(node.x).toBeGreaterThanOrEqual(0)
    expect(node.y).toBeGreaterThanOrEqual(100)
    expect(node.x + NODE_WIDTH).toBeLessThanOrEqual(result.width)
    expect(node.y + NODE_HEIGHT).toBeLessThanOrEqual(result.height)
    const lane = result.lanes[node.lane]
    expect(node.y).toBeGreaterThanOrEqual(lane.y)
    expect(node.y + NODE_HEIGHT).toBeLessThanOrEqual(lane.y + lane.height)
  }
  for (let a = 0; a < result.nodes.length; a++) {
    for (let b = a + 1; b < result.nodes.length; b++) {
      const first = result.nodes[a], second = result.nodes[b]
      const overlaps = first.x < second.x + NODE_WIDTH && first.x + NODE_WIDTH > second.x
        && first.y < second.y + NODE_HEIGHT && first.y + NODE_HEIGHT > second.y
      expect(overlaps).toBe(false)
    }
  }
  return result
}

describe('activity-on-node display layout', () => {
  it('resolves a selected stable node ID to refreshed data and clears missing nodes', () => {
    const selectedId = layoutNetwork([task('1'), task('2')]).nodes[0].id
    const refreshed = layoutNetwork([task('2'), task('1', { title: 'Updated activity', totalFloat: 7 })])
    const selected = refreshed.nodes.find(node => node.id === selectedId)?.task
    expect(selected?.title).toBe('Updated activity')
    expect(selected?.totalFloat).toBe(7)
    expect(layoutNetwork([task('2')]).nodes.find(node => node.id === selectedId)).toBeUndefined()
  })

  it('positions parallel branches in non-overlapping rows and orders dependency stages', () => {
    const items = [task('1'), task('2', { predecessors: '1' }), task('3', { predecessors: '1(SS+3)' }), task('4', { predecessors: '2, 3' }), task('5')]
    const before = JSON.stringify(items)
    const result = assertNodesVisible(items)
    const nodes = new Map(result.nodes.map(node => [node.id, node]))
    for (const edge of result.edges) expect(nodes.get(edge.from)!.x).toBeLessThan(nodes.get(edge.to)!.x)
    expect(result.edges).toHaveLength(4)
    expect(result.edges.some(edge => edge.type === 'SS' && edge.lag === 3)).toBe(true)
    expect(result.lanes.map(lane => lane.title)).toEqual(['Project activities'])
    expect(result.warnings).toEqual([])
    expect(JSON.stringify(items)).toBe(before)
    expect(layoutNetwork(items)).toEqual(result)
  })

  it('uses actual top-level package titles and groups unrelated roots together', () => {
    const result = assertNodesVisible([
      task('1', { title: 'Groundworks' }), task('1.1', { parentId: 'task-1' }),
      task('1.1.1', { parentId: 'task-1.1' }), task('2', { title: 'Superstructure' }),
      task('2.1', { parentId: '2' }), task('3'), task('4'),
    ])
    expect(result.lanes.map(lane => lane.title)).toEqual(['Groundworks', 'Superstructure', 'Project activities'])
    expect(result.nodes[0].lane).toBe(result.nodes[2].lane)
    expect(result.nodes[5].lane).toBe(result.nodes[6].lane)
  })

  it('preserves every node through cycles, self-links and missing predecessors', () => {
    const result = assertNodesVisible([
      task('1', { predecessors: '2' }), task('2', { predecessors: '1' }),
      task('3', { predecessors: '2, absent' }), task('4', { predecessors: '4' }),
    ])
    expect(result.warnings.some(warning => warning.includes('cycle'))).toBe(true)
    expect(result.warnings.some(warning => warning.includes('Missing predecessor absent'))).toBe(true)
    expect(result.edges).toHaveLength(4)
  })

  it('retains duplicate codes and IDs without inventing an ambiguous predecessor link', () => {
    const items = [task('1'), task('1'), task('2', { predecessors: '1' })]
    const result = assertNodesVisible(items)
    expect(result.edges).toHaveLength(0)
    expect(result.warnings.some(warning => warning.includes('Duplicate WBS code 1'))).toBe(true)
    expect(result.nodes[0].task).toBe(items[0])
    expect(result.nodes[1].task).toBe(items[1])
  })

  it('survives cyclic and missing parents without losing activities', () => {
    const result = assertNodesVisible([
      task('1', { parentId: 'task-2' }), task('2', { parentId: 'task-1' }),
      task('3', { parentId: 'missing' }),
    ])
    expect(result.lanes.map(lane => lane.title)).toEqual(['Project activities'])
    expect(result.warnings.some(warning => warning.includes('hierarchy cycle'))).toBe(true)
    expect(result.warnings.some(warning => warning.includes('Parent missing'))).toBe(true)
  })

  it('has an empty landscape canvas without fabricated activity nodes', () => {
    expect(layoutNetwork([])).toEqual({ width: 1600, height: 850, nodes: [], edges: [], lanes: [], warnings: [] })
  })
})

/** Display helpers only: none of these functions schedules or changes an activity. */
export interface PresentationTask {
  id?: string
  wbsCode: string
  title: string
  parentId?: string | null
  level?: number
  plannedStart?: string | null
  plannedEnd?: string | null
  plannedDuration?: number | string
  actualStart?: string | null
  actualEnd?: string | null
  status?: string
  progressPct?: number | string
  isMilestone?: boolean
  isCritical?: boolean
  totalFloat?: number | string | null
  earliestStart?: number | string | null
  earliestFinish?: number | string | null
  dependencies?: { code: string; type?: string; lag?: number }[]
  predecessors?: string | null
  [key: string]: unknown
}

export interface PresentationDependency { code: string; type: string; lag: number }
export type TaskTone = 'completed' | 'critical' | 'hold' | 'progress' | 'planned'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MAX_TIMELINE_MONTHS = 1200
export const NODE_WIDTH = 180
export const NODE_HEIGHT = 98

function utcDate(year: number, month: number, day: number): number {
  const date = new Date(0)
  // setUTCFullYear also handles years below 100 without Date.UTC's 1900 offset.
  date.setUTCFullYear(year, month, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.getTime()
}

/** Read the saved calendar day, rather than shifting it into the browser's timezone. */
export function parseDay(value?: string | null): number | null {
  if (typeof value !== 'string') return null
  const input = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.+)?$/.exec(input)
  if (!match || (input.length > 10 && !Number.isFinite(Date.parse(input)))) return null
  const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3])
  if (year < 1 || month < 0 || month > 11 || day < 1 || day > 31) return null
  const timestamp = utcDate(year, month, day)
  const date = new Date(timestamp)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
    ? timestamp : null
}

export function formatDay(value?: string | null): string {
  const timestamp = parseDay(value)
  if (timestamp === null) return '—'
  const date = new Date(timestamp)
  return `${String(date.getUTCDate()).padStart(2, '0')}-${MONTHS[date.getUTCMonth()]}-${String(date.getUTCFullYear()).padStart(4, '0')}`
}

export function taskTone(task: PresentationTask): TaskTone {
  const status = task.status?.trim().toLowerCase().replace(/[ -]+/g, '_')
  if (status === 'completed') return 'completed'
  if (task.isCritical === true) return 'critical'
  if (status === 'on_hold') return 'hold'
  if (status === 'in_progress') return 'progress'
  return 'planned'
}

export function getDependencies(task: PresentationTask): PresentationDependency[] {
  if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
    return task.dependencies.flatMap(dependency => {
      if (!dependency || typeof dependency.code !== 'string' || !dependency.code.trim()) return []
      return [{
        code: dependency.code.trim(),
        type: dependency.type?.trim().toUpperCase() || 'FS',
        lag: Number.isFinite(Number(dependency.lag)) ? Number(dependency.lag) : 0,
      }]
    })
  }
  return (task.predecessors ?? '').split(/[,;\n]/).flatMap(raw => {
    const input = raw.trim()
    if (!input) return []
    const match = /^(.*?)\s*\(\s*(FS|SS|FF|SF)\s*([+-]\s*\d+(?:\.\d+)?)?\s*d?\s*\)$/i.exec(input)
    if (!match) return [{ code: input, type: 'FS', lag: 0 }]
    const code = match[1].trim()
    return code ? [{ code, type: match[2].toUpperCase(), lag: Number(match[3]?.replace(/\s/g, '') || 0) }] : []
  })
}

export function dependencyLabel(task: PresentationTask): string {
  return getDependencies(task).map(dependency =>
    `${dependency.code} (${dependency.type}${dependency.lag === 0 ? '' : `${dependency.lag > 0 ? '+' : ''}${dependency.lag}d`})`,
  ).join(', ') || '—'
}

export interface TimelineRange {
  start: number
  /** Exclusive first day of the month after the final displayed month. */
  end: number
  months: { key: string; label: string; year: number; start: number; end: number }[]
  years: { year: number; start: number; end: number }[]
  truncated: boolean
}

export function buildTimeline(tasks: PresentationTask[], contractStart?: string | null, contractEnd?: string | null): TimelineRange {
  let first = Infinity, last = -Infinity
  const include = (value?: string | null) => {
    const day = parseDay(value)
    if (day !== null) { first = Math.min(first, day); last = Math.max(last, day) }
  }
  include(contractStart)
  include(contractEnd)
  for (const task of tasks) {
    include(task.plannedStart)
    include(task.plannedEnd)
    include(task.actualStart)
    include(task.actualEnd)
  }
  if (!Number.isFinite(first)) return { start: 0, end: 0, months: [], years: [], truncated: false }

  const firstDate = new Date(first), lastDate = new Date(last)
  const start = utcDate(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1)
  const monthCount = (lastDate.getUTCFullYear() - firstDate.getUTCFullYear()) * 12
    + lastDate.getUTCMonth() - firstDate.getUTCMonth() + 1
  const months: TimelineRange['months'] = [], years: TimelineRange['years'] = []
  for (let index = 0; index < Math.min(monthCount, MAX_TIMELINE_MONTHS); index++) {
    const monthStart = utcDate(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + index, 1)
    const date = new Date(monthStart), year = date.getUTCFullYear(), month = date.getUTCMonth()
    const end = utcDate(year, month + 1, 1)
    months.push({ key: `${year}-${String(month + 1).padStart(2, '0')}`, label: MONTHS[month], year, start: monthStart, end })
    const existing = years[years.length - 1]
    if (existing?.year === year) existing.end = end
    else years.push({ year, start: monthStart, end })
  }
  return { start, end: months[months.length - 1].end, months, years, truncated: monthCount > MAX_TIMELINE_MONTHS }
}

export interface NetworkNode {
  /** Unique display identity; original task IDs and codes remain untouched. */
  id: string
  task: PresentationTask
  x: number
  y: number
  lane: number
}

export interface NetworkLayout {
  width: number
  height: number
  nodes: NetworkNode[]
  /** Endpoints reference NetworkNode.id, not potentially duplicated WBS codes. */
  edges: { from: string; to: string; type: string; lag: number }[]
  lanes: { title: string; y: number; height: number }[]
  warnings: string[]
}

/** Topological stages express dependency order only; they are not schedule dates. */
export function layoutNetwork(tasks: PresentationTask[]): NetworkLayout {
  const warnings = new Set<string>()
  const byCode = new Map<string, number[]>(), byId = new Map<string, number[]>()
  const addIndex = (map: Map<string, number[]>, key: string | undefined, index: number) => {
    if (!key) return
    const indexes = map.get(key) ?? []
    indexes.push(index)
    map.set(key, indexes)
  }
  tasks.forEach((task, index) => {
    addIndex(byCode, task.wbsCode.trim(), index)
    addIndex(byId, task.id, index)
  })
  for (const [code, indexes] of byCode) {
    if (indexes.length > 1) warnings.add(`Duplicate WBS code ${code}; dependencies using this code are ambiguous and are not drawn.`)
  }
  for (const [id, indexes] of byId) {
    if (indexes.length > 1) warnings.add(`Duplicate activity ID ${id}; separate display IDs keep all activities visible.`)
  }
  const ids = tasks.map((task, index) => task.id && byId.get(task.id)?.length === 1
    ? `id:${task.id}` : task.wbsCode.trim() && byCode.get(task.wbsCode.trim())?.length === 1
      ? `wbs:${task.wbsCode.trim()}` : `row:${index}`)
  const edges: NetworkLayout['edges'] = []
  const outgoing: number[][] = tasks.map(() => []), incoming = tasks.map(() => 0)
  const edgeKeys = new Set<string>()
  tasks.forEach((task, target) => {
    for (const dependency of getDependencies(task)) {
      const matches = byCode.get(dependency.code)
      if (!matches) {
        warnings.add(`Missing predecessor ${dependency.code} for ${task.wbsCode || task.title}; that link is not drawn.`)
        continue
      }
      if (matches.length !== 1) continue
      const source = matches[0]
      const key = JSON.stringify([source, target, dependency.type, dependency.lag])
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      edges.push({ from: ids[source], to: ids[target], type: dependency.type, lag: dependency.lag })
      outgoing[source].push(target)
      incoming[target]++
    }
  })

  const stage = tasks.map(() => 0), visited = new Set<number>()
  const queue = incoming.flatMap((count, index) => count === 0 ? [index] : [])
  let cursor = 0
  while (visited.size < tasks.length) {
    if (cursor === queue.length) {
      const remaining = tasks.findIndex((_, index) => !visited.has(index))
      warnings.add('A dependency cycle is present. All activities are shown, but cyclic links cannot follow a left-to-right order.')
      queue.push(remaining)
    }
    const source = queue[cursor++]
    if (visited.has(source)) continue
    visited.add(source)
    for (const target of outgoing[source]) {
      if (visited.has(target)) continue
      stage[target] = Math.max(stage[target], stage[source] + 1)
      incoming[target]--
      if (incoming[target] === 0) queue.push(target)
    }
  }

  const rootFor = (index: number): number | null => {
    const seen = new Set<number>()
    let current = index
    while (tasks[current].parentId) {
      if (seen.has(current)) {
        warnings.add('A parent hierarchy cycle is present; affected activities are grouped under Project activities.')
        return null
      }
      seen.add(current)
      const parentId = tasks[current].parentId!
      const matches = byId.get(parentId) ?? byCode.get(parentId)
      if (!matches || matches.length !== 1) {
        warnings.add(`Parent ${parentId} for ${tasks[current].wbsCode || tasks[current].title} is missing or ambiguous; this activity is grouped under Project activities.`)
        return null
      }
      current = matches[0]
    }
    return current
  }
  const roots = tasks.map((_, index) => rootFor(index))
  const rootCounts = new Map<number, number>()
  for (const root of roots) if (root !== null) rootCounts.set(root, (rootCounts.get(root) ?? 0) + 1)
  const laneKeys: (number | null)[] = [], laneIndexes = new Map<number | null, number>()
  const nodeLanes = roots.map(root => {
    const key = root !== null && (rootCounts.get(root) ?? 0) > 1 ? root : null
    if (!laneIndexes.has(key)) { laneIndexes.set(key, laneKeys.length); laneKeys.push(key) }
    return laneIndexes.get(key)!
  })
  const laneRows = laneKeys.map(() => new Map<number, number>())
  const rows = tasks.map((_, index) => {
    const positions = laneRows[nodeLanes[index]]
    const row = positions.get(stage[index]) ?? 0
    positions.set(stage[index], row + 1)
    return row
  })
  let nextY = 100
  const lanes = laneKeys.map((root, lane) => {
    const maxRows = Math.max(1, ...laneRows[lane].values())
    const height = Math.max(210, 52 + maxRows * (NODE_HEIGHT + 32) + 20)
    const result = { title: root === null ? 'Project activities' : tasks[root].title || tasks[root].wbsCode, y: nextY, height }
    nextY += height
    return result
  })
  const nodes = tasks.map((task, index) => ({
    id: ids[index], task, lane: nodeLanes[index],
    x: 48 + stage[index] * (NODE_WIDTH + 50),
    y: lanes[nodeLanes[index]].y + 52 + rows[index] * (NODE_HEIGHT + 32),
  }))
  return {
    width: Math.max(1600, ...nodes.map(node => node.x + NODE_WIDTH + 48)),
    height: Math.max(850, nextY + 48),
    nodes, edges, lanes, warnings: [...warnings],
  }
}

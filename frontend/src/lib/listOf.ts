/**
 * Reads a list out of an API response whose shape is not guaranteed.
 *
 * `data ?? []` is the obvious guard and it is not enough: `??` only catches
 * null and undefined, so an endpoint that answers `{ items: [...] }` instead of
 * `[...]` sails straight through it and the next `.filter` throws, taking the
 * whole page down with it. That is exactly what happened to the QA page when
 * /qa/cube-tests started returning `{ items, stats }`.
 *
 * The opposite failure is quieter and worse. `Array.isArray(x) ? x : []`
 * never throws, so a wrapped response renders as "nothing here yet" forever
 * and nobody files a bug. The notification bell sat empty for exactly that
 * reason.
 *
 * So this deliberately does both: it unwraps the wrapper keys the backend
 * actually uses, and it returns [] rather than throwing for anything else.
 * Reach for it at the boundary, and still read the documented key explicitly
 * where one exists — this is the seatbelt, not the contract.
 */

/** Wrapper keys used by this API. Ordered: the first one holding an array wins. */
const LIST_KEYS = ['items', 'data', 'rows', 'records', 'results', 'files', 'logs'] as const

export function listOf<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload === null || typeof payload !== 'object') return []

  const bag = payload as Record<string, unknown>
  for (const key of LIST_KEYS) {
    const value = bag[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

/**
 * True when the payload carried no list at all, as opposed to an empty one.
 *
 * An empty list and a response of the wrong shape both render as "nothing
 * here", and only one of them is a bug. Anything that wants to tell them
 * apart — a diagnostic, a log line, a test — asks this.
 */
export function isListShaped(payload: unknown): boolean {
  if (Array.isArray(payload)) return true
  if (payload === null || typeof payload !== 'object') return false
  const bag = payload as Record<string, unknown>
  return LIST_KEYS.some(key => Array.isArray(bag[key]))
}

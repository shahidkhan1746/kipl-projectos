/**
 * What an API failure is, whether it is worth repeating, and how to say it.
 *
 * Every panel on the dashboard degrades to an em dash when its query has no
 * data. That reads identically whether the project genuinely has nothing
 * recorded or the server refused the request, so a page of dashes carried no
 * information at all: nothing to act on, nothing to report. These helpers give
 * the UI the status it needs to say which one happened.
 */

/** The HTTP status an axios failure carries, or null when no response arrived. */
export function statusOf(error: unknown): number | null {
  const status = (error as { response?: { status?: unknown } } | null | undefined)
    ?.response?.status
  return typeof status === 'number' ? status : null
}

/** How many times a failed query may be sent again. */
export const MAX_QUERY_RETRIES = 1

/**
 * A status whose answer cannot change if the identical request is sent again.
 *
 * 429 is the one that mattered. The response means "you have sent too much";
 * retrying sends more, takes another token out of the same bucket and brings
 * the next legitimate request closer to refusal. Under the previous blanket
 * `retry: 1` a dashboard of eight queries became sixteen requests at the exact
 * moment the server was asking for fewer.
 *
 * 401, 403 and 404 are terminal for a different reason: the second ask is
 * answered the same way, so retrying only delays the error the user needs to
 * see. 408 is excluded — a request timeout is precisely the case that can
 * succeed on a second attempt.
 */
function isTerminal(status: number | null): boolean {
  if (status === null) return false
  if (status === 408) return false
  return status >= 400 && status < 500
}

/**
 * The retry rule for TanStack Query. A 5xx or a dropped connection is still
 * repeated once: those can genuinely succeed a moment later, and the Render
 * cold-start retry in api/coldStart.ts has already dealt with the gateway
 * statuses at the wire before this is consulted.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false
  return !isTerminal(statusOf(error))
}

/**
 * What the server said, when it said anything useful.
 *
 * A bare "HTTP 400" is not a diagnosis. NestJS answers with
 * `{ statusCode, message, ... }`, and that message is usually the whole answer.
 *
 * An HTML body is worth distinguishing rather than quoting: it did not come
 * from the API at all — it is Express's default handler, or a proxy in front of
 * the service — which narrows where the fault is before anyone opens DevTools.
 */
export function serverMessageOf(error: unknown): string | null {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data

  if (typeof data === 'string') {
    const body = data.trim()
    if (!body) return null
    if (body.startsWith('<')) return 'the reply was an HTML error page, not an API response'
    return clip(body)
  }

  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return clip(message.trim())
    if (Array.isArray(message) && typeof message[0] === 'string') return clip(message[0])
  }

  return null
}

/** Long enough to be a sentence, short enough not to be a stack trace. */
function clip(text: string): string {
  return text.length > 200 ? text.slice(0, 200) + '…' : text
}

/** The status and, where there is one, the server's own explanation. */
export function describeFailure(error: unknown): string {
  const cause = describeStatus(statusOf(error))
  const said = serverMessageOf(error)
  return said ? `${cause} — ${said}` : cause
}

export interface Fault {
  /** What the user was trying to see, in their words, not the route's. */
  label: string
  status: number | null
  detail: string
}

/** Collects a failed query into a Fault, or nothing when it did not fail. */
export function faultOf(label: string, error: unknown): Fault | null {
  if (!error) return null
  return { label, status: statusOf(error), detail: describeFailure(error) }
}

/** Plain English for a status, aimed at whoever is looking at the screen. */
export function describeStatus(status: number | null): string {
  if (status === null) return 'no response — the server did not answer in time'
  if (status === 429) return 'rate limited (429) — too many requests in the last minute'
  if (status === 401) return 'session not accepted (401)'
  if (status === 403) return 'not permitted (403)'
  if (status === 404) return 'not found (404)'
  if (status >= 500) return `server error (${status})`
  return `HTTP ${status}`
}

/**
 * One sentence for a set of faults. Identical causes are stated once: eight
 * panels refused by the same rate limit is one fact, not eight.
 */
export function summariseFaults(faults: Fault[]): string {
  if (!faults.length) return ''
  const causes = [...new Set(faults.map(f => f.detail))]
  const what = faults.map(f => f.label).join(', ')
  return causes.length === 1
    ? `${what} could not be loaded: ${causes[0]}.`
    : `${what} could not be loaded. ${causes.join('. ')}.`
}

/**
 * What a write asked for and what it produced, fit to store in an audit row.
 *
 * The trail recorded the method, the path, the user and the status — that a
 * write happened, never what it changed. For a PATCH on a Clause 55 register
 * entry that cannot distinguish a corrected spelling from 400 cft becoming
 * 4,000.
 *
 * Two things this is careful about, because an audit trail that leaks is worse
 * than one that is thin:
 *
 *   - Credentials never go in. Request bodies carry passwords, reset tokens and
 *     refresh tokens, and an audit table is long-lived and widely readable.
 *   - Size is capped. A bulk upload body or a base64 attachment would put
 *     megabytes into every row of a table nobody prunes.
 */

const REDACTED = '[redacted]'

/** Keys whose values never reach the audit table, matched case-insensitively. */
const SENSITIVE = [
  'password', 'currentpassword', 'newpassword', 'confirmpassword',
  'token', 'refresh_token', 'refreshtoken', 'access_token', 'accesstoken',
  'secret', 'apikey', 'api_key', 'authorization', 'passwordhash',
  'passwordresethash', 'clientsecret', 'privatekey',
]

function isSensitive(key: string): boolean {
  const k = key.toLowerCase()
  return SENSITIVE.some(s => k === s || k.includes(s))
}

/** Serialised size beyond which a payload is replaced by a note of its size. */
export const MAX_PAYLOAD_BYTES = 8_000

/** Depth beyond which nested structures are summarised rather than walked. */
const MAX_DEPTH = 6

function scrub(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return `[buffer ${value.length} bytes]`

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return `[array of ${value.length}]`
    // A long array says nothing more than its first entries and its length.
    const head = value.slice(0, 20).map(v => scrub(v, depth + 1))
    return value.length > 20 ? [...head, `[+${value.length - 20} more]`] : head
  }

  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) return '[nested]'
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitive(key) ? REDACTED : scrub(v, depth + 1)
    }
    return out
  }

  if (typeof value === 'string' && value.length > 2000) {
    return value.slice(0, 2000) + `…[+${value.length - 2000} chars]`
  }

  return value
}

/** A payload safe to store, or null when there is nothing worth storing. */
export function auditPayload(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return null
  if (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0) return null

  const scrubbed = scrub(value, 0)
  let serialised: string
  try {
    serialised = JSON.stringify(scrubbed) ?? ''
  } catch {
    // Circular, or something that will not serialise. Recording that it could
    // not be captured is honest; recording nothing looks like an empty write.
    return { note: '[payload could not be serialised]' }
  }
  if (serialised.length > MAX_PAYLOAD_BYTES) {
    return { note: `[payload omitted: ${serialised.length} bytes]` }
  }
  return scrubbed
}

/**
 * The record a path refers to: the table and the id, where the path names one.
 * Lets the trail be read as "everything that happened to this register entry"
 * rather than only as a list of requests.
 */
export function entityFromPath(path: string): { table: string; id: string } | null {
  const clean = path.split('?')[0].replace(/^\/api\/v1\//, '')
  const parts = clean.split('/').filter(Boolean)
  if (parts.length < 2) return null

  const last = parts[parts.length - 1]
  // A uuid, or an id-shaped segment. A trailing verb like "approve" or
  // "reverse" is an action on the record before it, not the record itself.
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(last)
  if (isId) return { table: parts.slice(0, -1).join('/'), id: last }

  const prior = parts[parts.length - 2]
  const priorIsId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prior)
  if (priorIsId) return { table: parts.slice(0, -2).join('/'), id: prior }

  return null
}

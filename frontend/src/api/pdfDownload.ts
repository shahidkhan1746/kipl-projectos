import { describeStatus, statusOf } from '@/lib/apiFailure'

/**
 * Why a failed PDF download needs its own error handling.
 *
 * These requests are sent with `responseType: 'blob'`, which tells axios not to
 * parse the response. That is right for a PDF and wrong for everything else:
 * when the server answers with `{ "statusCode": 404, "message": "..." }`, axios
 * hands back a Blob rather than that object, so the usual error reading finds
 * nothing to say and the user is told "Request failed with status code 404" —
 * or, at the call sites that never attached a catch at all, nothing whatsoever.
 *
 * Clicking a download button and having absolutely nothing happen is the worst
 * version of this. The message the server sent is right there in the body; it
 * only has to be read back out.
 */

/** Reads a server error body back out of whatever axios handed over. */
export async function readErrorBody(data: unknown): Promise<string | null> {
  if (data == null) return null

  // The blob case: the response was never parsed, so parse it now.
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      return messageIn(await data.text())
    } catch {
      return null
    }
  }

  if (typeof data === 'string') return messageIn(data)

  if (typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return clip(message.trim())
    if (Array.isArray(message) && typeof message[0] === 'string') return clip(message[0])
  }

  return null
}

/** The message inside a JSON error body, or the plain text of a short one. */
function messageIn(text: string): string | null {
  const body = text.trim()
  if (!body) return null
  try {
    const parsed = JSON.parse(body)
    const message = parsed?.message
    if (typeof message === 'string' && message.trim()) return clip(message.trim())
    if (Array.isArray(message) && typeof message[0] === 'string') return clip(message[0])
  } catch {
    // Not JSON. An HTML body is a proxy or a wrong route answering, not the API.
    if (body.startsWith('<')) return 'the reply was an HTML page, not a PDF'
  }
  return null
}

function clip(text: string): string {
  return text.length > 200 ? text.slice(0, 200) + '…' : text
}

/**
 * What to tell someone whose download failed.
 *
 * A 404 here has one overwhelmingly likely cause and it is worth naming: the
 * route exists in this codebase but not on the server answering, which is what
 * a part-deployed backend looks like from the outside.
 */
export async function describeDownloadFailure(error: unknown): Promise<string> {
  const status = statusOf(error)
  const said = await readErrorBody(
    (error as { response?: { data?: unknown } } | null | undefined)?.response?.data,
  )
  if (said) return `${describeStatus(status)} — ${said}`
  if (status === 404) {
    return 'this report is not available on the server (404) — the API may be running an older build'
  }
  return describeStatus(status)
}

/**
 * Whether a 200 actually carried a PDF.
 *
 * A catch-all route that answers with the SPA's index.html returns 200 and
 * HTML. Saved blindly under a .pdf name that becomes a file that will not open,
 * with nothing to say why.
 */
export function looksLikePdf(contentType: unknown): boolean {
  return typeof contentType === 'string' && contentType.toLowerCase().includes('application/pdf')
}

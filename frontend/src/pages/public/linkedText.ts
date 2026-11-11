export type Segment = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string }

const LINK = /\[([^\]\n]{1,200})\]\((https:\/\/[^\s()]+)\)/g

/**
 * Splits text written in the updates editor into plain text and links.
 *
 * Staff write a link as [link text](https://example.com/page), so an update
 * can credit who arranged a visit and point to the relevant page. Only https
 * links are recognised; anything else, including a malformed link, stays as
 * the literal text that was typed.
 */
export function parseLinks(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const [whole, label, href] = m
    if (!isHttps(href)) continue
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) })
    out.push({ kind: 'link', text: label, href })
    last = m.index + whole.length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

/** The text as a reader sees it, links reduced to their wording. */
export const plainText = (text: string) => parseLinks(text).map(s => s.text).join('')

function isHttps(href: string) {
  try { return new URL(href).protocol === 'https:' } catch { return false }
}

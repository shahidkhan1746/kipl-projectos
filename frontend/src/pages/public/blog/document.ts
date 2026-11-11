/**
 * Turns the built index.html into a static page for one blog URL, so crawlers
 * and link previews get the post itself instead of an empty app shell.
 *
 * The rendered markup goes in #prerendered, beside an empty #root. Until the app
 * mounts, a style rule hides #root (and the loading spinner the app shows in it)
 * so the reader sees the static post. When the app's page mounts, PublicShell
 * removes #prerendered and the live page takes its place in the same frame.
 */

export interface StaticPage {
  /** Absolute path on the site, e.g. /site/blog/some-post */
  path: string
  title: string
  description: string
  markup: string
  /** Structured data for the page, written as JSON-LD. */
  jsonLd: Record<string, unknown>
  type: 'website' | 'article'
  image: string
  origin: string
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON inside a <script> must not be able to close the tag. */
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

export const HIDE_APP_UNTIL_MOUNTED = '#prerendered+#root{display:none}'

export function buildDocument(template: string, page: StaticPage): string {
  const url = page.origin + page.path
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)

  const replaceOnce = (html: string, pattern: RegExp, value: string, what: string) => {
    if (!pattern.test(html)) throw new Error(`index.html has no ${what} to replace`)
    return html.replace(pattern, () => value)
  }

  let html = template
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`, '<title>')
  html = replaceOnce(html, /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`, 'meta description')

  const head = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:site_name" content="KIPL Srinagar" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(page.origin + page.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${safeJson(page.jsonLd)}</script>`,
    `<style>${HIDE_APP_UNTIL_MOUNTED}</style>`,
  ].map(line => '    ' + line).join('\n')
  html = replaceOnce(html, /<\/head>/, `${head}\n  </head>`, '</head>')
  html = replaceOnce(html, /<div id="root"><\/div>/,
    `<div id="prerendered">${page.markup}</div><div id="root"></div>`, 'empty #root')
  return html
}

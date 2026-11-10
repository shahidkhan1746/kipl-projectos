import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { BLOG_PATH, POSTS, SITE_ORIGIN, postPath } from './posts'
import { buildDocument, HIDE_APP_UNTIL_MOUNTED, type StaticPage } from './document'
import { staticPages } from './ssr'

const frontend = (file: string) => readFileSync(new URL(`../../../../${file}`, import.meta.url), 'utf8')

/** Partner pages checked to exist when the posts were written (falcontrails.in sitemap, 10 Nov 2026). */
const PARTNER_PAGES = new Set([
  '/corporate', '/educational-tours/college-tours', '/kashmir/katra-to-srinagar',
  '/kashmir/how-to-reach', '/hotels/dal-lake',
])

function bodyHtml(slug: string) {
  const post = POSTS.find(p => p.slug === slug)!
  return renderToStaticMarkup(<StaticRouter location={postPath(slug)}><post.Body /></StaticRouter>)
}
const partnerLinks = (html: string) => [...html.matchAll(/<a [^>]*href="https:\/\/falcontrails\.in([^"]*)"[^>]*>/g)]

describe('posts', () => {
  it('have unique, URL-safe slugs', () => {
    const slugs = POSTS.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('have titles and descriptions that fit in a search result', () => {
    for (const p of POSTS) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(65)
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(110)
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160)
      expect(p.published).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('partner links in posts', () => {
  it('stay few: at most two per post, and some posts have none', () => {
    const counts = POSTS.map(p => partnerLinks(bodyHtml(p.slug)).length)
    for (const n of counts) expect(n).toBeLessThanOrEqual(2)
    expect(counts).toContain(0)
  })

  it('point only at pages that exist, as followed links', () => {
    for (const p of POSTS) {
      for (const [tag, path] of partnerLinks(bodyHtml(p.slug))) {
        expect(PARTNER_PAGES.has(path), `${p.slug} links to ${path}`).toBe(true)
        expect(tag).toContain('rel="noopener"')
        expect(tag).not.toMatch(/nofollow|noreferrer|sponsored|ugc/)
      }
    }
  })
})

describe('every blog URL is served as a static page', () => {
  const paths = [BLOG_PATH, ...POSTS.map(p => postPath(p.slug))]

  it('has a rewrite in vercel.json, ahead of the catch-all', () => {
    const rewrites: { source: string; destination: string }[] = JSON.parse(frontend('vercel.json')).rewrites
    const catchAll = rewrites.findIndex(r => r.source === '/(.*)')
    for (const path of paths) {
      const i = rewrites.findIndex(r => r.source === path)
      expect(i, path).toBeGreaterThanOrEqual(0)
      expect(i, path).toBeLessThan(catchAll)
      expect(rewrites[i].destination).toBe(`${path}.html`)
    }
  })

  it('is listed in the sitemap', () => {
    const sitemap = frontend('public/sitemap.xml')
    for (const path of paths) expect(sitemap).toContain(`<loc>${SITE_ORIGIN}${path}</loc>`)
  })

  it('renders with its headline and content', () => {
    const pages = staticPages()
    expect(pages.map(p => p.path)).toEqual(paths)
    for (const post of POSTS) {
      const page = pages.find(p => p.path === postPath(post.slug))!
      expect(page.markup).toContain(`<h1`)
      expect(page.markup).toContain(post.title)
      expect(page.markup).toContain('class="kb-post"')
    }
  })
})

describe('buildDocument', () => {
  const template = '<html><head><title>Old</title><meta name="description" content="old" /></head><body><div id="root"></div><script src="/a.js"></script></body></html>'
  const page: StaticPage = {
    path: '/site/blog/x', title: 'Pipes & "pumps" <1>', description: 'A & B', markup: '<main>hi</main>',
    jsonLd: { headline: '</script><script>alert(1)</script>' }, type: 'article', image: '/i.jpg', origin: 'https://example.org',
  }
  const html = buildDocument(template, page)

  it('sets the title, description, canonical and preview tags', () => {
    expect(html).toContain('<title>Pipes &amp; &quot;pumps&quot; &lt;1&gt;</title>')
    expect(html).toContain('<meta name="description" content="A &amp; B" />')
    expect(html).toContain('<link rel="canonical" href="https://example.org/site/blog/x" />')
    expect(html).toContain('<meta property="og:image" content="https://example.org/i.jpg" />')
    expect(html).not.toContain('<title>Old</title>')
  })

  it('keeps structured data from closing its script tag', () => {
    expect(html).not.toContain('</script><script>alert(1)')
    expect(html).toContain('\\u003c/script>')
  })

  it('shows the static content and hides the app until it mounts', () => {
    expect(html).toContain('<div id="prerendered"><main>hi</main></div><div id="root"></div>')
    expect(html).toContain(HIDE_APP_UNTIL_MOUNTED)
    expect(html).toContain('<script src="/a.js"></script>')
  })

  it('fails the build rather than ship a page it could not fill in', () => {
    expect(() => buildDocument(template.replace('<div id="root"></div>', ''), page)).toThrow(/#root/)
  })
})

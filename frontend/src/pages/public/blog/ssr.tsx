/**
 * Build-time entry: renders every blog URL to static HTML.
 * Used only by scripts/prerender-blog.mjs, never shipped to the browser.
 */
import { renderToString } from 'react-dom/server'
import { Route, Routes, StaticRouter } from 'react-router-dom'
import BlogIndexPage from './BlogIndexPage'
import BlogPostPage from './BlogPostPage'
import { BLOG_AUTHOR, BLOG_INDEX, BLOG_PATH, POSTS, SITE_ORIGIN, postDocumentTitle, postPath } from './posts'
import { buildDocument, type StaticPage } from './document'

const IMAGE = '/assets/plant-descent-poster.jpg'
const PUBLISHER = { '@type': 'Organization', name: 'Khilari Infrastructure Pvt. Ltd.', url: SITE_ORIGIN }

function render(path: string) {
  return renderToString(
    <StaticRouter location={path}>
      <Routes>
        <Route path={BLOG_PATH} element={<BlogIndexPage />} />
        <Route path={`${BLOG_PATH}/:slug`} element={<BlogPostPage />} />
      </Routes>
    </StaticRouter>,
  )
}

export function staticPages(): StaticPage[] {
  const index: StaticPage = {
    path: BLOG_PATH,
    title: BLOG_INDEX.documentTitle,
    description: BLOG_INDEX.subtitle,
    markup: render(BLOG_PATH),
    type: 'website',
    image: IMAGE,
    origin: SITE_ORIGIN,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'KIPL Srinagar blog',
      url: SITE_ORIGIN + BLOG_PATH,
      publisher: PUBLISHER,
      blogPost: POSTS.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: SITE_ORIGIN + postPath(p.slug), datePublished: p.published })),
    },
  }
  const posts = POSTS.map((p): StaticPage => ({
    path: postPath(p.slug),
    title: postDocumentTitle(p.title),
    description: p.description,
    markup: render(postPath(p.slug)),
    type: 'article',
    image: IMAGE,
    origin: SITE_ORIGIN,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.published,
      dateModified: p.updated ?? p.published,
      mainEntityOfPage: SITE_ORIGIN + postPath(p.slug),
      image: SITE_ORIGIN + IMAGE,
      author: { '@type': 'Organization', name: BLOG_AUTHOR, url: SITE_ORIGIN },
      publisher: PUBLISHER,
    },
  }))
  return [index, ...posts]
}

export { buildDocument }

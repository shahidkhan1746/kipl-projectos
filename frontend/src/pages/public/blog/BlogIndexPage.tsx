import { Link } from 'react-router-dom'
import { PublicShell } from '../_SiteChrome'
import { BLOG_INDEX, POSTS, formatPostDate, postPath } from './posts'
import { BLOG_CSS } from './blogStyles'
import { useDocumentTitle } from './useDocumentTitle'

export default function BlogIndexPage() {
  useDocumentTitle(BLOG_INDEX.documentTitle)
  return (
    <PublicShell title={BLOG_INDEX.title} subtitle={BLOG_INDEX.subtitle}>
      <style>{BLOG_CSS}</style>
      <div className="kb kb-col">
        <ul className="kb-list">
          {POSTS.map(post => (
            <li key={post.slug}>
              <Link className="kb-card" to={postPath(post.slug)}>
                <p className="kb-meta"><b>{post.audience}</b><time dateTime={post.published}>{formatPostDate(post.published)}</time></p>
                <h2>{post.title}</h2>
                <p>{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  )
}
